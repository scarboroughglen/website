# 🚀 Google Drive Staging - Quick Start

Enable Google Drive as a staging area for document uploads in 5 minutes.

## Why?

- ✅ Admins upload to familiar Google Drive interface
- ✅ Files auto-sync to S3 for production delivery
- ✅ Drive acts as backup and version control
- ✅ Users download from S3 with watermarking

## Quick Setup

### 1. Create Drive Folder Structure (2 min)

In Google Drive, create:

```
Scarborough Glen Portal (Auto-Sync)/
├── HOA/
├── Condo1/
├── Condo2/
├── Condo3/
└── Condo4/
```

### 2. Enable Drive API & Create Service Account (2 min)

```bash
# Enable API
gcloud services enable drive.googleapis.com

# Create service account
gcloud iam service-accounts create drive-sync \
  --display-name="Drive Sync Service"

# Get email
SA_EMAIL=$(gcloud iam service-accounts list \
  --filter="displayName:Drive Sync Service" \
  --format='value(email)')

echo $SA_EMAIL
# Output: drive-sync@PROJECT.iam.gserviceaccount.com

# Create key
gcloud iam service-accounts keys create drive-key.json \
  --iam-account=$SA_EMAIL
```

### 3. Share Drive Folder with Service Account (1 min)

1. In Google Drive, right-click "Scarborough Glen Portal (Auto-Sync)"
2. Click "Share"
3. Add the service account email (from step 2)
4. Set permission to **Viewer**
5. Click "Send"

### 4. Get Folder IDs (30 sec)

```bash
# Set parent folder ID from URL
# https://drive.google.com/drive/folders/[THIS_PART]
export DRIVE_PARENT_FOLDER_ID="1ABC-XYZ..."

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="./drive-key.json"

# Get folder IDs
npm run drive:folders
```

Copy the output environment variables.

### 5. Update Database (30 sec)

```bash
# Run migration
npx prisma migrate dev --name add_drive_sync
```

### 6. Test Sync (1 min)

```bash
# Set folder IDs from step 4
export DRIVE_FOLDER_HOA="..."
export DRIVE_FOLDER_CONDO1="..."
export DRIVE_FOLDER_CONDO2="..."
export DRIVE_FOLDER_CONDO3="..."
export DRIVE_FOLDER_CONDO4="..."

# Test sync
npm run sync-drive
```

## Production Setup

### Option A: Cloud Scheduler (Automated)

```bash
# Deploy sync function
gcloud functions deploy drive-sync \
  --runtime=nodejs18 \
  --trigger-http \
  --entry-point=syncDrive \
  --set-secrets=GOOGLE_APPLICATION_CREDENTIALS=drive-sync-key:latest \
  --set-env-vars=DRIVE_FOLDER_HOA=...,DATABASE_URL=...

# Schedule (runs every 15 minutes)
gcloud scheduler jobs create http drive-sync-job \
  --schedule="*/15 * * * *" \
  --uri="https://REGION-PROJECT.cloudfunctions.net/drive-sync" \
  --http-method=POST
```

### Option B: Manual Sync

Admins can trigger sync manually:

```bash
# From local machine
npm run sync-drive

# From Cloud Run
gcloud run jobs execute drive-sync
```

## Admin Workflow

**To add a new document:**

1. Go to Google Drive → "Scarborough Glen Portal (Auto-Sync)"
2. Open appropriate folder (HOA, Condo1, etc.)
3. Upload PDF
4. (Optional) Add description:
   - Right-click PDF → File information
   - Add description in "Description" field
5. Wait 15 minutes for auto-sync (or trigger manually)
6. Document appears in portal!

**To update a document:**

1. Upload new version to Drive (same filename or different)
2. Sync will detect the change
3. New version appears in portal

**To delete a document:**

1. Move to trash in Drive
2. Sync will mark as deleted
3. Optionally delete from S3 manually

## Troubleshooting

### "Permission denied" error

**Fix**: Share Drive folder with service account email

### "Folder ID not found"

**Fix**: Check folder IDs with `npm run drive:folders`

### Files not syncing

**Check**:
- Folder IDs are correct
- Service account has access
- Files are PDFs (not Google Docs)
- Files are not in trash

## Cost

- **Google Drive**: Included in Workspace (~$6/user/month)
- **Cloud Function**: ~$0 (free tier)
- **Cloud Scheduler**: ~$0.10/month
- **S3 Storage**: Same as before (~$1-5/month)

**Total additional cost: ~$0.10/month**

## Full Documentation

See [GOOGLE_DRIVE_STAGING.md](GOOGLE_DRIVE_STAGING.md) for complete setup guide with webhooks, monitoring, and advanced features.

---

**🎉 Done! Your admins can now upload via Google Drive!**
