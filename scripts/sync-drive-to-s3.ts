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

import { google } from 'googleapis'
import { uploadFile, getBucketName } from '../lib/storage'
import { prisma } from '../lib/prisma'

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

  // Validate folder IDs
  const missingFolders = Object.entries(FOLDER_IDS)
    .filter(([_, id]) => !id)
    .map(([section]) => section)

  if (missingFolders.length > 0) {
    console.error(`❌ Missing Drive folder IDs for: ${missingFolders.join(', ')}`)
    console.error('Set environment variables: DRIVE_FOLDER_HOA, DRIVE_FOLDER_CONDO1, etc.')
    process.exit(1)
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
      // List files in Drive folder
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
        fields: 'files(id, name, modifiedTime, size, description)',
        orderBy: 'modifiedTime desc',
      })

      const driveFiles = response.data.files || []
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
            const lastSync = existing.lastSyncedAt || existing.uploadedAt

            if (driveModified <= lastSync) {
              console.log(`   ⏭️  Skipping ${driveFile.name} (unchanged)`)
              totalSkipped++
              continue
            }

            console.log(`   🔄 Updating ${driveFile.name} (modified in Drive)`)
          } else {
            console.log(`   ⬆️  Uploading ${driveFile.name} (new file)`)
          }

          // Download file from Drive
          console.log(`      Downloading from Drive...`)
          const fileStream = await drive.files.get(
            { fileId: driveFile.id!, alt: 'media' },
            { responseType: 'arraybuffer' }
          )

          const fileBuffer = Buffer.from(fileStream.data as ArrayBuffer)
          console.log(`      Downloaded ${(fileBuffer.length / 1024).toFixed(2)} KB`)

          // Upload to S3
          const bucketName = getBucketName(section)
          const s3FileName = `${Date.now()}-${driveFile.name}`

          console.log(`      Uploading to S3 bucket: ${bucketName}`)
          await uploadFile(bucketName, s3FileName, fileBuffer, 'application/pdf')

          // Save or update in database
          const description = driveFile.description || driveFile.name!.replace(/\.pdf$/i, '').replace(/_/g, ' ')

          if (existing) {
            await prisma.document.update({
              where: { id: existing.id },
              data: {
                fileName: s3FileName,
                description,
                lastSyncedAt: new Date(),
              },
            })
            console.log(`      ✅ Updated database record`)
          } else {
            await prisma.document.create({
              data: {
                fileName: s3FileName,
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
