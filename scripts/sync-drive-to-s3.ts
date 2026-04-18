#!/usr/bin/env tsx

/**
 * Sync documents from the forensics MCP server cache to the local database.
 *
 * The heavy lifting (Google Drive download, OCR, S3 upload) is done by the
 * MCP server's ``sync_drive`` tool. This script just:
 *   1. Optionally triggers a server-side sync (--sync-drive flag)
 *   2. Calls ``list_synced_documents`` to get cached metadata (instant)
 *   3. Upserts document records in the local Prisma database
 *
 * Usage:
 *   npm run sync-drive              # DB update only (reads MCP cache)
 *   npm run sync-drive -- --full    # Trigger full server-side re-sync first
 *   npm run sync-drive -- --sync-drive  # Trigger incremental server-side sync first
 */

import { prisma } from '../lib/prisma'
import { isForensicsConfigured, callMcpTool } from '../lib/forensics-client'

interface SyncedDocument {
  drive_file_id: string
  drive_name: string
  section: string
  s3_filename: string
  s3_path: string
  description: string
  last_synced_at: string
}

async function syncFromMcpCache() {
  console.log('🔄 Syncing documents from MCP server cache...')
  console.log(`📅 ${new Date().toISOString()}\n`)

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
    process.exit(1)
  }

  // Optionally trigger a server-side Drive sync first
  const doSyncDrive = process.argv.includes('--sync-drive') || process.argv.includes('--full')
  const fullSync = process.argv.includes('--full')

  if (doSyncDrive) {
    console.log(`🔄 Triggering ${fullSync ? 'full' : 'incremental'} server-side Drive sync...`)
    try {
      const syncResult = await callMcpTool('sync_drive', { full: fullSync })
      console.log(`✅ Server sync complete: ${JSON.stringify(syncResult)}\n`)
    } catch (err: any) {
      console.error(`❌ Server-side sync failed: ${err.message}`)
      process.exit(1)
    }
  }

  // Get all synced documents from MCP cache (instant)
  console.log('📋 Fetching document list from MCP cache...')
  let documents: SyncedDocument[]
  try {
    documents = await callMcpTool('list_synced_documents', {}) as SyncedDocument[]
  } catch (err: any) {
    console.error(`❌ Failed to get document list: ${err.message}`)
    process.exit(1)
  }

  console.log(`   Found ${documents.length} documents in MCP cache\n`)

  let created = 0
  let updated = 0
  let unchanged = 0

  for (const doc of documents) {
    try {
      const existing = await prisma.document.findFirst({
        where: { driveFileId: doc.drive_file_id },
      })

      if (existing) {
        // Check if MCP has a newer version
        const mcpSynced = new Date(doc.last_synced_at)
        const dbSynced = existing.lastSyncedAt || existing.createdAt

        if (mcpSynced <= dbSynced) {
          unchanged++
          continue
        }

        await prisma.document.update({
          where: { id: existing.id },
          data: {
            filename: doc.s3_filename,
            filepath: doc.s3_path,
            description: doc.description,
            lastSyncedAt: new Date(doc.last_synced_at),
          },
        })
        console.log(`   🔄 Updated ${doc.drive_name}`)
        updated++
      } else {
        await prisma.document.create({
          data: {
            filename: doc.s3_filename,
            filepath: doc.s3_path,
            section: doc.section,
            description: doc.description,
            driveFileId: doc.drive_file_id,
            driveName: doc.drive_name,
            lastSyncedAt: new Date(doc.last_synced_at),
          },
        })
        console.log(`   ⬆️  Created ${doc.drive_name}`)
        created++
      }
    } catch (err: any) {
      console.error(`   ❌ Error processing ${doc.drive_name}: ${err.message}`)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 Sync Summary')
  console.log(`${'='.repeat(60)}`)
  console.log(`⬆️  Created:   ${created}`)
  console.log(`🔄 Updated:   ${updated}`)
  console.log(`⏭️  Unchanged: ${unchanged}`)
  console.log(`${'='.repeat(60)}`)
  console.log('\n✅ Database sync completed!')
}

syncFromMcpCache().catch((error) => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
