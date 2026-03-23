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
// MCP JSON-RPC response parsing (JSON or SSE)
// ---------------------------------------------------------------------------

function parseMcpResponse(body: string, contentType: string): any {
  if (contentType.includes('text/event-stream')) {
    for (const line of body.split('\n')) {
      if (line.startsWith('data:')) {
        const json = JSON.parse(line.slice('data:'.length).trim())
        if (json.result !== undefined || json.error !== undefined) return json
      }
    }
    throw new Error(`No data line found in SSE response: ${body.slice(0, 200)}`)
  }
  return JSON.parse(body)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a PDF through the forensics-pdf-mcp server.
 * Returns the forensic summary and enriched PDF (with embedded OCR text).
 *
 * Throws if the server is unreachable or returns an error.
 * Callers should catch and handle fallback behaviour.
 */
export async function processDocument(
  pdfBytes: Buffer,
  filename: string,
  timeoutMs = 300_000
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

  // --- Step 2: Call process_pdf tool ---
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

  const rpc = parseMcpResponse(
    await toolResp.text(),
    toolResp.headers.get('content-type') || ''
  )

  if (rpc.error) throw new Error(`MCP RPC error: ${JSON.stringify(rpc.error)}`)

  const content = rpc.result?.content?.[0]
  if (!content || content.type !== 'text') {
    throw new Error(`Unexpected MCP response structure: ${JSON.stringify(rpc).slice(0, 200)}`)
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

/**
 * Returns true if the forensics server is configured (env vars or key files present).
 * Used to decide whether to attempt MCP processing during sync.
 */
export function isForensicsConfigured(): boolean {
  if (process.env.FORENSICS_KEY_ID && process.env.FORENSICS_PRIVATE_KEY) return true
  const configDir = join(homedir(), '.forensics-pdf-mcp')
  return existsSync(join(configDir, 'key_id.txt')) && existsSync(join(configDir, 'private_key.pem'))
}
