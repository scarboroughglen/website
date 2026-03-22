# 📂 Google Drive Staging for S3 Files

Use Google Drive as a staging area for document uploads, then automatically sync to S3 for production delivery.

## 🎯 Why This Approach?

**Benefits:**
- ✅ **Familiar UI** - Admins use Google Drive (no learning curve)
- ✅ **Easy Organization** - Folder structure in Drive mirrors sections
- ✅ **Built-in Backup** - Drive keeps original files
- ✅ **Version History** - Drive tracks all changes
- ✅ **Collaboration** - Multiple admins can upload
- ✅ **Mobile Access** - Upload from phone via Drive app
- ✅ **Production Delivery** - S3 handles downloads with watermarking

**Workflow:**
```
Admin uploads to Drive → Sync script detects → Copies to S3 → Users download from S3
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Google Drive (Staging)                   │
│                                                              │
│  📁 Scarborough Glen Portal (Auto-Sync)/                    │
│    ├── 📁 HOA/                                               │
│    │   ├── budget_2024.pdf                                   │
│    │   └── rules.pdf                                         │
│    ├── 📁 Condo1/                                            │
│    │   └── minutes.pdf                                       │
│    ├── 📁 Condo2/                                            │
│    ├── 📁 Condo3/                                            │
│    └── 📁 Condo4/                                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
              ┌──────────────────────┐
              │   Sync Script        │
              │  (Cloud Function or  │
              │   Scheduled Task)    │
              └──────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    S3 Storage (Production)                   │
│                                                              │
│  Buckets: hoa, condo1, condo2, condo3, condo4               │
│  - Watermarking applied on download                         │
│  - Access control enforced                                   │
│  - Fast, scalable delivery                                   │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Setup Guide

### Step 1: Create Google Drive Folder Structure

1. **Create shared folder in Google Drive:**
   ```
   Scarborough Glen Portal (Auto-Sync)/
   ├── HOA/
   ├── Condo1/
   ├── Condo2/
   ├── Condo3/
   └── Condo4/
   ```

2. **Share with admins:**
   - Right-click "Scarborough Glen Portal (Auto-Sync)" → Share
   - Add admin emails with "Editor" access
   - Only HOA board members should have access

### Step 2: Enable Google Drive API

```bash
# Enable Drive API
gcloud services enable drive.googleapis.com

# Or via Cloud Console:
# https://console.cloud.google.com/apis/library/drive.googleapis.com
```

### Step 3: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create drive-sync \
  --description="Google Drive to S3 sync service" \
  --display-name="Drive Sync Service"

# Get email
export GOOGLE_DRIVE_SYNC_EMAIL=$(gcloud iam service-accounts list \
  --filter="displayName:Drive Sync Service" \
  --format='value(email)')

echo "Service account email: $GOOGLE_DRIVE_SYNC_EMAIL"
# Example: drive-sync@my-hoa-project.iam.gserviceaccount.com
```

**Download the key for local development:**

Your GCP org may have the `iam.disableServiceAccountKeyCreation` policy enabled. As org admin, temporarily disable it, create the key, then re-enable it:

```bash
# 1. Enable the Org Policy API (one-time)
gcloud services enable orgpolicy.googleapis.com --project=$PROJECT_ID

# 2. Find where the policy is set
gcloud org-policies describe constraints/iam.disableServiceAccountKeyCreation \
  --project=$PROJECT_ID
# If NOT_FOUND, check at org level:
gcloud organizations list  # get your ORGANIZATION_ID
gcloud org-policies describe constraints/iam.disableServiceAccountKeyCreation \
  --organization=$ORGANIZATION_ID

# 3. Temporarily remove the policy (use --organization if that's where it lives)
gcloud org-policies delete constraints/iam.disableServiceAccountKeyCreation \
  --organization=$ORGANIZATION_ID

# 4. Create the key
gcloud iam service-accounts keys create credentials/google-service-account.json \
  --iam-account=$GOOGLE_DRIVE_SYNC_EMAIL

# 5. Restore the policy
cat > /tmp/restore-policy.yaml << 'EOF'
name: organizations/YOUR_ORG_ID/policies/iam.disableServiceAccountKeyCreation
spec:
  rules:
  - enforce: true
EOF
gcloud org-policies set-policy /tmp/restore-policy.yaml
rm /tmp/restore-policy.yaml
```

> **Keep this file secret.** It is git-ignored via `credentials/`. Never commit it.

**Store in Secret Manager for Cloud Run / CI use:**

```bash
gcloud secrets create drive-sync-service-account \
  --data-file=credentials/google-service-account.json
```

### Step 4: Grant Drive Access to Service Account

1. Get the service account email:
   ```bash
   echo $GOOGLE_DRIVE_SYNC_EMAIL
   # Output: drive-sync@PROJECT_ID.iam.gserviceaccount.com
   ```

2. **Share "Scarborough Glen Portal (Auto-Sync)" folder with service account:**
   - In Google Drive, right-click "Scarborough Glen Portal (Auto-Sync)"
   - Click "Share"
   - Add `drive-sync@PROJECT_ID.iam.gserviceaccount.com`
   - Set permission to "Viewer" (read-only for security)
   - Click "Send"

### Step 5: Create Sync Script

Create `scripts/sync-drive-to-s3.ts`:

```typescript
import { google } from 'googleapis'
import { uploadFile, getBucketName } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

// Folder IDs (get from Drive URLs)
const FOLDER_IDS = {
  HOA: 'DRIVE_FOLDER_ID_FOR_HOA',
  Condo1: 'DRIVE_FOLDER_ID_FOR_CONDO1',
  Condo2: 'DRIVE_FOLDER_ID_FOR_CONDO2',
  Condo3: 'DRIVE_FOLDER_ID_FOR_CONDO3',
  Condo4: 'DRIVE_FOLDER_ID_FOR_CONDO4',
}

async function syncDriveToS3() {
  console.log('🔄 Starting Google Drive → S3 sync...')

  // Authenticate with service account
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  const drive = google.drive({ version: 'v3', auth })

  // Sync each section
  for (const [section, folderId] of Object.entries(FOLDER_IDS)) {
    console.log(`\n📁 Syncing ${section}...`)

    // List files in Drive folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
      fields: 'files(id, name, modifiedTime, size, description)',
      orderBy: 'modifiedTime desc',
    })

    const driveFiles = response.data.files || []
    console.log(`  Found ${driveFiles.length} PDFs in Drive`)

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
            console.log(`  ⏭️  Skipping ${driveFile.name} (already synced)`)
            continue
          }

          console.log(`  🔄 Updating ${driveFile.name} (modified in Drive)`)
        } else {
          console.log(`  ⬆️  Uploading ${driveFile.name} (new file)`)
        }

        // Download file from Drive
        const fileStream = await drive.files.get(
          { fileId: driveFile.id!, alt: 'media' },
          { responseType: 'arraybuffer' }
        )

        const fileBuffer = Buffer.from(fileStream.data as ArrayBuffer)

        // Upload to S3
        const bucketName = getBucketName(section)
        const s3FileName = `${Date.now()}-${driveFile.name}`

        await uploadFile(bucketName, s3FileName, fileBuffer, 'application/pdf')

        // Save or update in database
        const description = driveFile.description || driveFile.name!.replace(/\.pdf$/i, '')

        if (existing) {
          await prisma.document.update({
            where: { id: existing.id },
            data: {
              fileName: s3FileName,
              description,
              lastSyncedAt: new Date(),
            },
          })
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
        }

        console.log(`  ✅ Synced ${driveFile.name} → ${s3FileName}`)
      } catch (error) {
        console.error(`  ❌ Error syncing ${driveFile.name}:`, error)
      }
    }
  }

  console.log('\n✅ Sync complete!')
}

syncDriveToS3().catch(console.error)
```

### Step 6: Update Database Schema

Add Drive tracking fields to `prisma/schema.prisma`:

```prisma
model Document {
  id          String   @id @default(uuid())
  fileName    String
  section     String
  description String
  uploadedAt  DateTime @default(now())

  // Google Drive sync fields
  driveFileId  String?  @unique
  driveName    String?
  lastSyncedAt DateTime?

  downloads DocumentDownload[]
}
```

Run migration:

```bash
npx prisma migrate dev --name add_drive_sync_fields
```

### Step 7: Get Drive Folder IDs

1. Open Google Drive
2. Navigate to "Scarborough Glen Portal (Auto-Sync)/HOA/"
3. Copy the ID from the URL:
   ```
   https://drive.google.com/drive/folders/1ABC-XYZ123_FOLDER_ID
                                           ^^^^^^^^^^^^^^^^
   ```
4. Update `FOLDER_IDS` in the sync script

### Step 8: Install Dependencies

```bash
npm install googleapis @types/google.auth-library
```

Update `package.json`:

```json
{
  "scripts": {
    "sync-drive": "npx tsx scripts/sync-drive-to-s3.ts"
  }
}
```

### Step 9: Deploy as Cloud Function (Automated Sync)

Create `functions/drive-sync/index.ts`:

```typescript
import { google } from 'googleapis'
import { syncDriveToS3 } from './sync-logic'

export async function syncDrive(req: any, res: any) {
  try {
    console.log('🔔 Drive sync triggered')

    await syncDriveToS3()

    res.status(200).json({ success: true, message: 'Sync completed' })
  } catch (error) {
    console.error('Sync error:', error)
    res.status(500).json({ error: 'Sync failed' })
  }
}
```

Deploy to Cloud Functions:

```bash
gcloud functions deploy drive-sync \
  --runtime=nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --set-secrets=GOOGLE_APPLICATION_CREDENTIALS=drive-sync-service-account:latest \
  --set-env-vars=DATABASE_URL=... \
  --entry-point=syncDrive \
  --region=us-central1
```

### Step 10: Schedule Automatic Syncs

**Option A: Cloud Scheduler (Recommended)**

```bash
# Create scheduler job (runs every 15 minutes)
gcloud scheduler jobs create http drive-sync-schedule \
  --schedule="*/15 * * * *" \
  --uri="https://us-central1-PROJECT_ID.cloudfunctions.net/drive-sync" \
  --http-method=POST \
  --location=us-central1 \
  --description="Sync Google Drive to S3 every 15 minutes"
```

**Option B: Drive Push Notifications (Advanced)**

Get notified when files change in Drive:

```typescript
// Setup webhook
const watchResponse = await drive.files.watch({
  fileId: folderId,
  requestBody: {
    id: 'unique-channel-id',
    type: 'web_hook',
    address: 'https://your-app.com/api/drive-webhook',
  },
})
```

See [Google Drive API - Push Notifications](https://developers.google.com/drive/api/guides/push)

## 🔄 Manual Sync (Testing)

```bash
# Local testing
export GOOGLE_APPLICATION_CREDENTIALS="./drive-sync-key.json"
npm run sync-drive

# Cloud Run exec
gcloud run jobs create drive-sync \
  --image=us-central1-docker.pkg.dev/PROJECT/hoa-portal/hoa-portal:latest \
  --set-secrets=GOOGLE_APPLICATION_CREDENTIALS=drive-sync-service-account:latest \
  --command="npm" \
  --args="run,sync-drive"

gcloud run jobs execute drive-sync
```

## 📊 Admin Workflow

### For Document Admins:

1. **Upload PDF to appropriate folder:**
   - Go to Google Drive → "Scarborough Glen Portal (Auto-Sync)"
   - Open the section folder (HOA, Condo1, etc.)
   - Drag & drop PDF or click "New" → "File upload"

2. **Add description (optional but recommended):**
   - Right-click the PDF
   - Click "File information" (ℹ️)
   - Add description in the "Description" field
   - This becomes the document description in the portal

3. **Wait for sync:**
   - Files sync automatically every 15 minutes
   - Or manually trigger: Call Cloud Function URL

4. **Verify in portal:**
   - Log in to HOA Portal
   - Go to Documents page
   - New files should appear within 15 minutes

### For Deleting Documents:

**In Google Drive:**
- Move file to trash (doesn't delete from S3)

**To fully remove:**
- Delete from Drive
- Run sync (marks as deleted in database)
- Optionally: Manually delete from S3 bucket

## 🔐 Security Considerations

1. **Service Account Permissions:**
   - ✅ Use "Viewer" role in Drive (read-only)
   - ✅ Never grant "Editor" to service account
   - ✅ Store service account key in Secret Manager

2. **Folder Sharing:**
   - ✅ Only share with authorized admins
   - ✅ Use Google Workspace groups for easier management
   - ✅ Regularly audit folder permissions

3. **Database Tracking:**
   - ✅ Track `driveFileId` to prevent duplicates
   - ✅ Log all sync operations
   - ✅ Monitor for unusual activity

## 🧪 Testing

```bash
# Test Drive API access
npm run sync-drive

# Check logs
gcloud functions logs read drive-sync --limit=50

# Verify database
npx prisma studio
# Check Document table for driveFileId field
```

## 🆘 Troubleshooting

### Error: "The user does not have sufficient permissions"

**Cause**: Service account not shared on Drive folder

**Fix**:
1. Share "Scarborough Glen Portal (Auto-Sync)" folder with service account email
2. Verify permission level is "Viewer" or higher

### Error: "Invalid folder ID"

**Cause**: Wrong folder ID in `FOLDER_IDS`

**Fix**:
```bash
# Get folder ID from URL
https://drive.google.com/drive/folders/[COPY_THIS_PART]
```

### Files not syncing

**Check**:
```bash
# 1. Verify scheduler is running
gcloud scheduler jobs list

# 2. Check function logs
gcloud functions logs read drive-sync

# 3. Manual test
npm run sync-drive
```

### Duplicate files appearing

**Cause**: `driveFileId` not being saved properly

**Fix**: Check database for `driveFileId` column and unique constraint

## 📈 Monitoring

### Set Up Alerts

```bash
# Alert when sync fails
gcloud logging metrics create drive-sync-errors \
  --description="Drive sync errors" \
  --log-filter='resource.type="cloud_function"
                resource.labels.function_name="drive-sync"
                severity>=ERROR'
```

### Dashboard

Track in Cloud Console:
- Sync frequency
- Files synced per run
- Errors/failures
- Storage usage (Drive vs S3)

## 💰 Cost Estimate

**Google Drive (Google Workspace):**
- Included in Workspace subscription (~$6-12/user/month)
- Unlimited storage with Business plan

**Cloud Function:**
- ~$0.40 per million invocations
- Running every 15 minutes = 2,880 invocations/month
- Cost: **~$0.001/month** (essentially free)

**S3 Storage:**
- Same as before (~$1-5/month depending on usage)

**Total additional cost: ~$0**

## 🎯 Alternative: Drive API Direct Access

Instead of copying to S3, serve directly from Drive:

**Pros:**
- Single source of truth
- No sync needed
- Simpler architecture

**Cons:**
- ❌ Harder to watermark PDFs
- ❌ Google Drive API rate limits
- ❌ More complex access control
- ❌ Slower for end users

**Verdict**: Copy to S3 is recommended for production.

## 📚 Additional Resources

- [Google Drive API Docs](https://developers.google.com/drive/api/guides/about-sdk)
- [Node.js Google APIs Client](https://github.com/googleapis/google-api-nodejs-client)
- [Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)

---

**🎉 With Google Drive staging, admins can easily upload files while users enjoy fast S3 delivery with watermarking!**
