/**
 * TypeScript client for the forensics-pdf-mcp server.
 *
 * Mirrors the Python ForensicsClient in forensics-pdf-mcp/forensics_pdf_mcp/client/forensics_client.py
 * Uses ECDSA P-256 request signing over MCP Streamable HTTP (JSON-RPC / SSE).
 *
 * Configuration (in priority order):
 *   1. Environment variables: FORENSICS_SERVER_URL, FORENSICS_KEY_ID, FORENSICS_PRIVATE_KEY
 *   2. Files in ~/.forensics-pdf-mcp/: key_id.txt, private_key.pem
 */

import { createHash, createSign, randomUUID } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface ForensicsResult {
  summary: string
  enrichedPdf: Buffer<ArrayBuffer>
  hadEmbeddedImages: boolean
  pagesProcessed: number
  imagesTranscribed: number
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

function loadConfig(): { serverUrl: string; keyId: string; privateKey: string } {
  const configDir = join(homedir(), '.forensics-pdf-mcp')

  const serverUrl =
    process.env.FORENSICS_SERVER_URL ||
    'http://dgx-spark-claude:18790'

  let keyId = process.env.FORENSICS_KEY_ID
  if (!keyId) {
    const keyIdFile = join(configDir, 'key_id.txt')
    if (existsSync(keyIdFile)) keyId = readFileSync(keyIdFile, 'utf8').trim()
  }

  let privateKey = process.env.FORENSICS_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!privateKey) {
    const keyFile = process.env.FORENSICS_PRIVATE_KEY_FILE || join(configDir, 'private_key.pem')
    if (existsSync(keyFile)) privateKey = readFileSync(keyFile, 'utf8').trim()
  }

  if (!keyId || !privateKey) {
    throw new Error(
      'Forensics client: missing key_id or private_key. ' +
      'Set FORENSICS_KEY_ID and FORENSICS_PRIVATE_KEY, or run admin/keygen.py to generate a keypair.'
    )
  }

  return { serverUrl, keyId, privateKey }
}

// ---------------------------------------------------------------------------
// ECDSA P-256 request signing (matches Python _sign_request)
// ---------------------------------------------------------------------------

function buildAuthHeaders(
  bodyBytes: Buffer,
  keyId: string,
  privateKeyPem: string
): Record<string, string> {
  const timestamp = new Date().toISOString()
  const nonce = randomUUID()
  const bodyHash = createHash('sha256').update(bodyBytes).digest('hex')
  const canonical = `${keyId}\n${timestamp}\n${nonce}\n${bodyHash}`

  const signer = createSign('SHA256')
  signer.update(canonical, 'utf8')
  // EC keys sign in DER format by default, matching Python's ec.ECDSA(hashes.SHA256())
  const signatureDer = signer.sign(privateKeyPem)
  const signatureB64 = signatureDer.toString('base64url')

  return {
    'X-Auth-Key-ID': keyId,
    'X-Auth-Timestamp': timestamp,
    'X-Auth-Nonce': nonce,
    'X-Auth-Signature': signatureB64,
  }
}

// ---------------------------------------------------------------------------
// SSE stream reader — yields parsed JSON-RPC messages as they arrive
// ---------------------------------------------------------------------------

async function* readSseStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<any> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process all complete lines in the buffer
      const lines = buffer.split('\n')
      buffer = lines.pop()! // Keep any incomplete trailing line

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data:')) {
          const json = trimmed.slice('data:'.length).trim()
          if (json) yield JSON.parse(json)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a PDF through the forensics-pdf-mcp server.
 * Returns the forensic summary and enriched PDF (with embedded OCR text).
 *
 * onProgress is called after each image page is OCR'd: (pagesCompleted, totalImagePages)
 *
 * Throws if the server is unreachable or returns an error.
 * Callers should catch and handle fallback behaviour.
 */
export async function processDocument(
  pdfBytes: Buffer,
  filename: string,
  timeoutMs = 300_000,
  onProgress?: (done: number, total: number) => void
): Promise<ForensicsResult> {
  const { serverUrl, keyId, privateKey } = loadConfig()
  const base = serverUrl.replace(/\/$/, '')

  // --- Step 1: MCP initialize (establishes session) ---
  const initBodyBytes = Buffer.from(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'hoa-sync-client', version: '1.0.0' },
      },
    }),
    'utf8'
  )

  const initResp = await fetch(`${base}/mcp/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...buildAuthHeaders(initBodyBytes, keyId, privateKey),
    },
    body: initBodyBytes,
    signal: AbortSignal.timeout(30_000),
  })

  if (!initResp.ok) {
    throw new Error(`MCP initialize failed: ${initResp.status} ${initResp.statusText}`)
  }

  const sessionId = initResp.headers.get('mcp-session-id')

  // --- Step 2: Call process_pdf tool with progressToken for streaming updates ---
  const progressToken = randomUUID()
  const toolBodyBytes = Buffer.from(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'process_pdf',
        arguments: {
          file_base64: pdfBytes.toString('base64'),
          filename,
        },
        _meta: { progressToken },
      },
    }),
    'utf8'
  )

  const toolHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...buildAuthHeaders(toolBodyBytes, keyId, privateKey),
  }
  if (sessionId) toolHeaders['Mcp-Session-Id'] = sessionId

  const toolResp = await fetch(`${base}/mcp/`, {
    method: 'POST',
    headers: toolHeaders,
    body: toolBodyBytes,
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!toolResp.ok) {
    throw new Error(`MCP process_pdf failed: ${toolResp.status} ${toolResp.statusText}`)
  }

  if (!toolResp.body) {
    throw new Error('MCP response has no body')
  }

  // --- Step 3: Read SSE stream, handling progress notifications and final result ---
  for await (const msg of readSseStream(toolResp.body as ReadableStream<Uint8Array>)) {
    if (msg.method === 'notifications/progress') {
      // Page-level progress from the server
      const { progress, total } = msg.params ?? {}
      if (onProgress && typeof progress === 'number' && typeof total === 'number') {
        onProgress(progress, total)
      }
      continue
    }

    if (msg.id === 1) {
      // Final result
      if (msg.error) throw new Error(`MCP RPC error: ${JSON.stringify(msg.error)}`)

      const content = msg.result?.content?.[0]
      if (!content || content.type !== 'text') {
        throw new Error(`Unexpected MCP response structure: ${JSON.stringify(msg).slice(0, 200)}`)
      }

      const result = JSON.parse(content.text)
      if (result.error) throw new Error(`PDF processing error: ${result.error}`)

      return {
        summary: result.summary,
        enrichedPdf: Buffer.from(result.enriched_pdf_base64, 'base64'),
        hadEmbeddedImages: result.had_embedded_images,
        pagesProcessed: result.pages_processed,
        imagesTranscribed: result.images_transcribed,
      }
    }
  }

  throw new Error('MCP stream ended without a final result')
}

/**
 * Returns true if the forensics server is configured (env vars or key files present).
 * Used to decide whether to attempt MCP processing during sync.
 */
export function isForensicsConfigured(): boolean {
  const keyId = process.env.FORENSICS_KEY_ID
  if (!keyId) return false

  if (process.env.FORENSICS_PRIVATE_KEY) return true

  const keyFile = process.env.FORENSICS_PRIVATE_KEY_FILE
  if (keyFile && existsSync(keyFile)) return true

  const configDir = join(homedir(), '.forensics-pdf-mcp')
  return existsSync(join(configDir, 'key_id.txt')) && existsSync(join(configDir, 'private_key.pem'))
}
