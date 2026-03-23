#!/usr/bin/env tsx

/**
 * Sync files from Google Drive to S3
 *
 * This script:
 * 1. Reads PDFs from Google Drive folders (one per section)
 * 2. Checks if files are new or modified since last sync
 * 3. Uploads new/modified files to S3
 * 4. Updates database with file metadata
 *
 * Usage:
 *   npm run sync-drive
 *
 * Environment variables:
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account key JSON
 *   DATABASE_URL - Database connection string
 */

import { google, drive_v3 } from 'googleapis'
import { uploadFile, clearBucket, getBucketName } from '../lib/storage'
import { prisma } from '../lib/prisma'
import { processDocument, isForensicsConfigured } from '../lib/forensics-client'

// Recursively collect all PDFs under a folder (walks subfolders)
async function listPdfsRecursively(
  drive: drive_v3.Drive,
  folderId: string,
  path: string = ''
): Promise<drive_v3.Schema$File[]> {
  const results: drive_v3.Schema$File[] = []

  // List everything in this folder (PDFs and subfolders)
  let pageToken: string | undefined
  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false and (mimeType='application/pdf' or mimeType='application/vnd.google-apps.folder')`,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, description)',
      pageToken,
    })

    for (const file of response.data.files || []) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        const subPath = path ? `${path}/${file.name}` : file.name!
        console.log(`      📂 Walking subfolder: ${subPath}`)
        const subFiles = await listPdfsRecursively(drive, file.id!, subPath)
        results.push(...subFiles)
      } else {
        // Tag the file with its subfolder path for logging
        ;(file as any)._drivePath = path ? `${path}/${file.name}` : file.name
        results.push(file)
      }
    }

    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken)

  return results
}

// Google Drive folder IDs for each section
// Get these from the Drive folder URLs
const FOLDER_IDS = {
  HOA: process.env.DRIVE_FOLDER_HOA || '',
  Condo1: process.env.DRIVE_FOLDER_CONDO1 || '',
  Condo2: process.env.DRIVE_FOLDER_CONDO2 || '',
  Condo3: process.env.DRIVE_FOLDER_CONDO3 || '',
  Condo4: process.env.DRIVE_FOLDER_CONDO4 || '',
}

async function syncDriveToS3() {
  console.log('🔄 Starting Google Drive → S3 sync...')
  console.log(`📅 ${new Date().toISOString()}\n`)

  // Require forensics MCP to be reachable before starting
  if (!isForensicsConfigured()) {
    console.error('❌ Forensics MCP is not configured. Set FORENSICS_KEY_ID and FORENSICS_PRIVATE_KEY_FILE.')
    process.exit(1)
  }
  const forensicsUrl = process.env.FORENSICS_SERVER_URL || 'http://dgx-spark-claude:18790'
  console.log(`🔬 Checking forensics MCP at ${forensicsUrl}...`)
  try {
    const resp = await fetch(`${forensicsUrl}/health`, { signal: AbortSignal.timeout(5_000) })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    console.log('✅ Forensics MCP is reachable\n')
  } catch (err: any) {
    console.error(`❌ Forensics MCP unreachable at ${forensicsUrl}: ${err.message}`)
    console.error('Start the MCP server before running sync.')
    process.exit(1)
  }

  // Validate folder IDs
  const missingFolders = Object.entries(FOLDER_IDS)
    .filter(([_, id]) => !id)
    .map(([section]) => section)

  if (missingFolders.length > 0) {
    console.error(`❌ Missing Drive folder IDs for: ${missingFolders.join(', ')}`)
    console.error('Set environment variables: DRIVE_FOLDER_HOA, DRIVE_FOLDER_CONDO1, etc.')
    process.exit(1)
  }

  // Full sync: clear all S3 buckets before syncing
  const fullSync = process.argv.includes('--full')
  if (fullSync) {
    console.log('🗑️  Full sync: clearing all S3 buckets...')
    for (const section of Object.keys(FOLDER_IDS)) {
      const bucketName = getBucketName(section)
      const deleted = await clearBucket(bucketName)
      console.log(`   Cleared ${bucketName} (${deleted} files deleted)`)
    }
    console.log()
  }

  // Authenticate with service account
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  const drive = google.drive({ version: 'v3', auth })

  let totalSynced = 0
  let totalSkipped = 0
  let totalErrors = 0

  // Sync each section
  for (const [section, folderId] of Object.entries(FOLDER_IDS)) {
    console.log(`\n📁 Syncing ${section}...`)
    console.log(`   Folder ID: ${folderId}`)

    try {
      // Recursively list all PDFs in folder and subfolders
      const driveFiles = await listPdfsRecursively(drive, folderId)
      console.log(`   Found ${driveFiles.length} PDFs in Drive`)

      if (driveFiles.length === 0) {
        console.log(`   ℹ️  No files to sync`)
        continue
      }

      for (const driveFile of driveFiles) {
        try {
          // Check if already synced to database
          const existing = await prisma.document.findFirst({
            where: {
              driveFileId: driveFile.id,
            },
          })

          if (existing) {
            // Check if Drive file was modified after last sync
            const driveModified = new Date(driveFile.modifiedTime!)
            const lastSync = existing.lastSyncedAt || existing.createdAt

            if (driveModified <= lastSync) {
              console.log(`   ⏭️  Skipping ${(driveFile as any)._drivePath || driveFile.name} (unchanged)`)
              totalSkipped++
              continue
            }

            console.log(`   🔄 Updating ${(driveFile as any)._drivePath || driveFile.name} (modified in Drive)`)
          } else {
            console.log(`   ⬆️  Uploading ${(driveFile as any)._drivePath || driveFile.name} (new file)`)
          }

          // Download file from Drive
          console.log(`      Downloading from Drive...`)
          const fileStream = await drive.files.get(
            { fileId: driveFile.id!, alt: 'media' },
            { responseType: 'arraybuffer' }
          )

          const fileBuffer = Buffer.from(fileStream.data as ArrayBuffer)
          console.log(`      Downloaded ${(fileBuffer.length / 1024).toFixed(2)} KB`)

          // Process through forensics MCP server (OCR + summary)
          let uploadBuffer = fileBuffer
          let description = driveFile.description || driveFile.name!.replace(/\.pdf$/i, '').replace(/_/g, ' ')

          if (isForensicsConfigured()) {
            try {
              console.log(`      🔬 Sending to forensics MCP server (OCR + summary)...`)
              const start = Date.now()
              const forensics = await processDocument(
                fileBuffer,
                driveFile.name!,
                300_000,
                (done, total) => {
                  console.log(`      ⏳ OCR: page ${done}/${total}`)
                }
              )
              uploadBuffer = forensics.enrichedPdf
              description = forensics.summary
              console.log(`      ✅ Forensics complete — ${forensics.pagesProcessed} pages, ${forensics.imagesTranscribed} transcribed (${((Date.now() - start) / 1000).toFixed(1)}s)`)
            } catch (err: any) {
              throw new Error(`Forensics MCP failed for ${(driveFile as any)._drivePath || driveFile.name}: ${err.message}`)
            }
          }

          // Upload to S3 (enriched PDF if forensics succeeded, original otherwise)
          const bucketName = getBucketName(section)
          const drivePath: string = (driveFile as any)._drivePath || driveFile.name!
          const s3FileName = drivePath
            .split('/')
            .map((segment) =>
              segment
                .toLowerCase()
                .replace(/\.pdf$/i, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
            )
            .join('/') + '.pdf'
          const s3Path = `${bucketName}/${s3FileName}`

          console.log(`      Uploading to S3 bucket: ${bucketName}`)
          await uploadFile(bucketName, s3FileName, uploadBuffer, 'application/pdf')

          if (existing) {
            await prisma.document.update({
              where: { id: existing.id },
              data: {
                filename: s3FileName,
                filepath: s3Path,
                description,
                lastSyncedAt: new Date(),
              },
            })
            console.log(`      ✅ Updated database record`)
          } else {
            await prisma.document.create({
              data: {
                filename: s3FileName,
                filepath: s3Path,
                section,
                description,
                driveFileId: driveFile.id!,
                driveName: driveFile.name!,
                lastSyncedAt: new Date(),
              },
            })
            console.log(`      ✅ Created database record`)
          }

          console.log(`   ✅ Synced ${driveFile.name} → ${s3FileName}`)
          totalSynced++
        } catch (error: any) {
          console.error(`   ❌ Error syncing ${driveFile.name}:`, error.message)
          totalErrors++
        }
      }

      // Rebuild catalog.json for this bucket from the full database state
      try {
        const bucketName = getBucketName(section)
        const allDocs = await prisma.document.findMany({
          where: { section },
          orderBy: { createdAt: 'asc' },
        })

        const catalog = {
          updated: new Date().toISOString(),
          bucket: bucketName,
          documents: allDocs.map((doc) => ({
            filename: doc.filename,
            path: doc.filepath,
            description: doc.description || '',
          })),
        }

        const catalogBuffer = Buffer.from(JSON.stringify(catalog, null, 2), 'utf8')
        await uploadFile(bucketName, 'catalog.json', catalogBuffer, 'application/json')
        console.log(`   📋 Updated catalog.json (${allDocs.length} entries)`)
      } catch (error: any) {
        console.error(`   ⚠️  Failed to write catalog.json for ${section}:`, error.message)
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${section}:`, error.message)
      totalErrors++
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 Sync Summary')
  console.log(`${'='.repeat(60)}`)
  console.log(`✅ Files synced:  ${totalSynced}`)
  console.log(`⏭️  Files skipped: ${totalSkipped}`)
  console.log(`❌ Errors:        ${totalErrors}`)
  console.log(`${'='.repeat(60)}`)

  if (totalErrors > 0) {
    console.error('\n⚠️  Sync completed with errors')
    process.exit(1)
  } else {
    console.log('\n✅ Sync completed successfully!')
  }
}

// Run the sync
syncDriveToS3().catch((error) => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
