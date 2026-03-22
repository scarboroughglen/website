# 📂 Google Drive → S3 Sync

Use Google Drive as a staging area for document uploads. When you're ready to publish, run the sync locally — it downloads from Drive, processes each PDF through the forensics MCP server (OCR + description extraction), then uploads the enriched PDFs to S3.

## 🎯 Workflow

```
Admin uploads PDF to Drive
        ↓
You run: make sync-drive  (on your local machine)
        ↓
Script downloads PDF from Drive
        ↓
Sends to forensics-pdf-mcp (DGX Spark, local network)
  - OCR transcription of scanned pages
  - Invisible text embedded (makes PDF searchable)
  - Forensic summary generated (becomes description)
        ↓
Enriched PDF uploaded to S3 (MinIO locally, GCS in production)
Database updated with description + S3 path
catalog.json written to each bucket
```

> **Why local sync?** The forensics-pdf-mcp server runs on the DGX Spark on your local network — it is not internet-accessible. The sync must be run from a machine that can reach both Google Drive (internet) and the DGX Spark (local network).

---

## 📋 One-Time Setup

### Step 1: Create Google Drive Folder Structure

Create this folder structure in Google Drive:

```
Scarborough Glen Portal (Auto-Sync)/
├── HOA/
├── Condo1/
├── Condo2/
├── Condo3/
└── Condo4/
```

Share the root folder with admins (Editor access) so they can upload documents.

### Step 2: Enable Google Drive API

```bash
gcloud services enable drive.googleapis.com
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

**Download the key:**

Your GCP org may have `iam.disableServiceAccountKeyCreation` enforced. As org admin, temporarily disable it:

```bash
# 1. Enable the Org Policy API (one-time)
gcloud services enable orgpolicy.googleapis.com --project=$PROJECT_ID

# 2. Find where the policy is set
gcloud org-policies describe constraints/iam.disableServiceAccountKeyCreation \
  --project=$PROJECT_ID
# If NOT_FOUND, check org level:
gcloud organizations list  # get your ORGANIZATION_ID
gcloud org-policies describe constraints/iam.disableServiceAccountKeyCreation \
  --organization=$ORGANIZATION_ID

# 3. Temporarily remove the policy
gcloud org-policies delete constraints/iam.disableServiceAccountKeyCreation \
  --organization=$ORGANIZATION_ID

# 4. Create the key into the credentials/ directory
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

### Step 4: Share Drive Folders with Service Account

In Google Drive:
1. Right-click "Scarborough Glen Portal (Auto-Sync)"
2. Click **Share**
3. Add the service account email (`drive-sync@your-project.iam.gserviceaccount.com`)
4. Set permission to **Viewer** (read-only)
5. Click **Send**

### Step 5: Get Drive Folder IDs

Open each subfolder in your browser and copy the ID from the URL:

```
https://drive.google.com/drive/folders/1ABC-XYZ123_THIS_IS_THE_ID
```

Or run the helper script:

```bash
make up
docker compose exec app npx tsx scripts/get-drive-folder-ids.ts
```

### Step 6: Configure .env

```bash
cat > .env << EOF
# Google Drive
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-service-account.json
DRIVE_FOLDER_HOA=paste_folder_id_here
DRIVE_FOLDER_CONDO1=paste_folder_id_here
DRIVE_FOLDER_CONDO2=paste_folder_id_here
DRIVE_FOLDER_CONDO3=paste_folder_id_here
DRIVE_FOLDER_CONDO4=paste_folder_id_here

# Forensics PDF MCP (DGX Spark — local network only)
FORENSICS_SERVER_URL=http://dgx-spark-claude:18790
FORENSICS_KEY_ID=$(cat ~/.forensics-pdf-mcp/key_id.txt)
FORENSICS_PRIVATE_KEY_FILE=/app/credentials/forensics_private_key.pem

# S3 / MinIO (local dev defaults)
STORAGE_PROVIDER=local
S3_ENDPOINT=minio
S3_PORT=9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_USE_SSL=false
EOF
```

### Step 7: Copy Forensics Key

```bash
cp ~/.forensics-pdf-mcp/private_key.pem credentials/forensics_private_key.pem
chmod 600 credentials/forensics_private_key.pem
```

---

## 🔄 Running a Sync

```bash
# Start the stack (first time or after make down)
make up

# Run the sync
make sync-drive
```

The sync will:
1. Check each Drive folder for new or modified PDFs
2. Skip unchanged files (compares Drive `modifiedTime` against `lastSyncedAt`)
3. Download changed files from Drive
4. Send each PDF to the forensics MCP server for OCR + description
5. Upload the enriched PDF to S3
6. Update the database with the description and S3 path
7. Write `catalog.json` to each bucket

---

## 📁 Admin Workflow (Uploading Documents)

1. Open Google Drive → "Scarborough Glen Portal (Auto-Sync)"
2. Open the correct section folder (HOA, Condo1, etc.)
3. Drag and drop the PDF
4. Optionally add a description (right-click → File information → Description) — this is used as a fallback if the MCP server is unavailable
5. Tell the person running sync to run `make sync-drive`

---

## 🆘 Troubleshooting

### "The user does not have sufficient permissions"
The service account hasn't been shared on the Drive folder. Re-do Step 4.

### "Missing Drive folder IDs"
Check your `.env` has all five `DRIVE_FOLDER_*` variables set.

### Forensics MCP times out or fails
The sync falls back to the Drive description (or filename) and uploads the original PDF. Check that you're on the local network and the DGX Spark is running:
```bash
curl http://dgx-spark-claude:18790/health
```

### File appears in Drive but not in portal
Run `make sync-drive` — sync is manual, files don't appear automatically.
