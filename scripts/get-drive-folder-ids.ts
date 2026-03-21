#!/usr/bin/env tsx

/**
 * Helper script to get Google Drive folder IDs
 *
 * This script lists all folders in the "Scarborough Glen Portal (Auto-Sync)" parent folder
 * and displays their IDs, which you'll need for the sync script.
 *
 * Usage:
 *   1. Set GOOGLE_APPLICATION_CREDENTIALS to your service account key
 *   2. Set DRIVE_PARENT_FOLDER_ID to the "Scarborough Glen Portal (Auto-Sync)" folder ID
 *   3. Run: npx tsx scripts/get-drive-folder-ids.ts
 */

import { google } from 'googleapis'

async function getDriveFolderIds() {
  const parentFolderId = process.env.DRIVE_PARENT_FOLDER_ID

  if (!parentFolderId) {
    console.error('❌ Error: DRIVE_PARENT_FOLDER_ID environment variable not set')
    console.error('')
    console.error('Steps:')
    console.error('1. Create "Scarborough Glen Portal (Auto-Sync)" folder in Google Drive')
    console.error('2. Copy the folder ID from the URL:')
    console.error('   https://drive.google.com/drive/folders/[FOLDER_ID]')
    console.error('3. Set environment variable:')
    console.error('   export DRIVE_PARENT_FOLDER_ID="<folder-id>"')
    console.error('4. Run this script again')
    process.exit(1)
  }

  console.log('🔍 Fetching Google Drive folder structure...\n')

  // Authenticate
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  const drive = google.drive({ version: 'v3', auth })

  try {
    // List all folders inside the parent folder
    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      orderBy: 'name',
    })

    const folders = response.data.files || []

    if (folders.length === 0) {
      console.log('ℹ️  No subfolders found')
      console.log('\nCreate these folders in Google Drive:')
      console.log('  - HOA')
      console.log('  - Condo1')
      console.log('  - Condo2')
      console.log('  - Condo3')
      console.log('  - Condo4')
      return
    }

    console.log('📁 Found folders:\n')
    console.log('─'.repeat(80))

    let envVars = '\n# Add these to your .env file or Cloud Run environment:\n'

    folders.forEach((folder) => {
      console.log(`Name: ${folder.name}`)
      console.log(`ID:   ${folder.id}`)
      console.log('─'.repeat(80))

      // Generate environment variable
      const varName = `DRIVE_FOLDER_${folder.name!.toUpperCase().replace(/[^A-Z0-9]/g, '')}`
      envVars += `${varName}="${folder.id}"\n`
    })

    console.log(envVars)

    // Also show how to set for Cloud Run
    console.log('\n# Or set in cloudbuild.yaml substitutions:')
    folders.forEach((folder) => {
      const varName = `_DRIVE_FOLDER_${folder.name!.toUpperCase().replace(/[^A-Z0-9]/g, '')}`
      console.log(`  ${varName}: ${folder.id}`)
    })

  } catch (error: any) {
    console.error('❌ Error fetching folders:', error.message)

    if (error.message.includes('The user does not have sufficient permissions')) {
      console.error('\n💡 Solution:')
      console.error('1. Share the "Scarborough Glen Portal (Auto-Sync)" folder with your service account:')
      console.error(`   ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com'}`)
      console.error('2. Grant "Viewer" or "Editor" permission')
      console.error('3. Run this script again')
    }

    process.exit(1)
  }
}

getDriveFolderIds().catch((error) => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
