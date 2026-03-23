/**
 * Universal S3-compatible storage client
 * Works with MinIO (local), AWS S3, GCP Cloud Storage, and other S3-compatible services
 *
 * Configuration:
 * - STORAGE_PROVIDER: 'local' (default), 'aws', 'gcp', or 'custom'
 * - S3_ENDPOINT: S3-compatible endpoint (e.g., 'minio', 's3.amazonaws.com')
 * - S3_PORT: Port number (default: 9000 for local, 443 for cloud)
 * - S3_ACCESS_KEY: Access key / Access Key ID
 * - S3_SECRET_KEY: Secret key / Secret Access Key
 * - S3_USE_SSL: 'true' or 'false' (default: false for local, true for cloud)
 * - S3_REGION: AWS region (default: 'us-east-1')
 */

import * as Minio from 'minio'

// Build storage configuration from environment variables
function getStorageConfig() {
  const provider = process.env.STORAGE_PROVIDER || 'local'

  // For 'local' development (MinIO), use env vars or defaults
  if (provider === 'local') {
    return {
      endPoint: process.env.S3_ENDPOINT || 'localhost',
      port: parseInt(process.env.S3_PORT || '9000'),
      useSSL: process.env.S3_USE_SSL === 'true',
      accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
      region: process.env.S3_REGION || 'us-east-1',
    }
  }

  // For cloud providers (AWS, GCP, etc.), require explicit configuration
  return {
    endPoint: process.env.S3_ENDPOINT!,
    port: parseInt(process.env.S3_PORT || '443'),
    useSSL: process.env.S3_USE_SSL !== 'false', // Default to true for cloud
    accessKey: process.env.S3_ACCESS_KEY!,
    secretKey: process.env.S3_SECRET_KEY!,
    region: process.env.S3_REGION || 'us-east-1',
  }
}

const selectedConfig = getStorageConfig()

// Create S3 client
const storageClient = new Minio.Client(selectedConfig)

export function getBucketName(section: string): string {
  const prefix = process.env.BUCKET_PREFIX || ''
  return `${prefix}${section.toLowerCase()}`.replace(/^-/, '')
}

export async function ensureBucket(bucketName: string): Promise<void> {
  try {
    const exists = await storageClient.bucketExists(bucketName)
    if (!exists) {
      const region = (selectedConfig as any).region || 'us-east-1'
      await storageClient.makeBucket(bucketName, region)
      console.log(`Created bucket: ${bucketName}`)
    }
  } catch (error) {
    console.error(`Error ensuring bucket ${bucketName}:`, error)
    throw error
  }
}

export async function uploadFile(
  bucketName: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string = 'application/pdf'
): Promise<void> {
  await ensureBucket(bucketName)

  const metadata = {
    'Content-Type': contentType,
    'x-amz-meta-uploaded-at': new Date().toISOString(),
  }

  await storageClient.putObject(
    bucketName,
    fileName,
    fileBuffer,
    fileBuffer.length,
    metadata
  )
}

export async function getFile(bucketName: string, fileName: string): Promise<Buffer> {
  const stream = await storageClient.getObject(bucketName, fileName)
  const chunks: Buffer[] = []

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

export async function listFiles(bucketName: string, prefix: string = ''): Promise<string[]> {
  try {
    const exists = await storageClient.bucketExists(bucketName)
    if (!exists) {
      return []
    }

    const stream = storageClient.listObjects(bucketName, prefix, true)
    const files: string[] = []

    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => {
        if (obj.name) {
          files.push(obj.name)
        }
      })
      stream.on('end', () => resolve(files))
      stream.on('error', reject)
    })
  } catch (error) {
    console.error(`Error listing files in ${bucketName}:`, error)
    return []
  }
}

export async function deleteFile(bucketName: string, fileName: string): Promise<void> {
  await storageClient.removeObject(bucketName, fileName)
}

export async function clearBucket(bucketName: string): Promise<number> {
  const files = await listFiles(bucketName)
  for (const file of files) {
    await storageClient.removeObject(bucketName, file)
  }
  return files.length
}

export async function getSignedUrl(
  bucketName: string,
  fileName: string,
  expirySeconds: number = 3600
): Promise<string> {
  return await storageClient.presignedGetObject(bucketName, fileName, expirySeconds)
}

export { storageClient }
