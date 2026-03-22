# 🚀 Google Cloud Run Deployment Guide

Deploy the HOA Portal to Google Cloud Run with SQLite, Cloud Storage, and a custom GoDaddy domain.

## 📋 Architecture Overview

```
GoDaddy DNS → Cloud Run (container) → SQLite (on Cloud Storage volume)
                     ↓
              S3 Buckets (GCS or AWS) for PDFs
```

**Production Stack:**
- **Compute**: Google Cloud Run (serverless containers)
- **Database**: SQLite stored on a Cloud Storage volume (persistent, simple)
- **File Storage**: Google Cloud Storage (S3-compatible)
- **Secrets**: Google Secret Manager
- **Build**: Cloud Build (triggered from GitHub or manually)
- **DNS**: GoDaddy → Cloud Run

> **Why SQLite on Cloud Run?** This HOA portal has low, predictable traffic. SQLite with a Cloud Storage volume mount is simpler and free vs. Cloud SQL at ~$7.50/month. The only constraint is `--max-instances=1` to prevent concurrent write conflicts — which is fine for this use case.

---

## 1️⃣ Set Up Google Cloud (Starting from Google Workspace)

Your Google Workspace account can be used directly with Google Cloud — they share the same Google identity.

### Step 1: Create a Google Cloud Project

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)**
2. Sign in with your **Google Workspace email** (e.g., admin@scarboroughglen.com)
3. Click the project selector at the top → **"New Project"**
4. Enter:
   - **Project name**: `scarborough-glen-hoa`
   - **Organization**: Your Google Workspace org will appear automatically
5. Click **"Create"**

### Step 2: Enable Billing

1. In Cloud Console → **Billing** (left sidebar)
2. Click **"Link a billing account"**
3. Add a credit card (you won't be charged much — see cost estimate at bottom)

### Step 3: Install the gcloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Windows (run in PowerShell as admin)
# Download installer from: https://cloud.google.com/sdk/docs/install

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Step 4: Authenticate and Configure

```bash
# Login with your Google Workspace account
gcloud auth login

# Set your project
export PROJECT_ID="scarborough-glen-hoa"  # Use your actual project ID
gcloud config set project $PROJECT_ID

# Verify
gcloud config list
```

### Step 4b: Add Environment Variables to ~/.bashrc

First, look up the values you'll need:

```bash
# Your project ID (set in Step 4)
gcloud config get-value project
# Example output: my-hoa-project

# Your project number
gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)'
# Example output: 123456789012

# The GitHub Actions service account email (created later in the GitHub setup section)
gcloud iam service-accounts list --filter="displayName:GitHub Actions" --format='value(email)'
# Example output: github-actions@my-hoa-project.iam.gserviceaccount.com
```

Then add these to your `~/.bashrc` (or `~/.zshrc`) using the values from above:

```bash
# Google Cloud / HOA Portal
export PROJECT_ID="your-project-id"          # e.g. my-hoa-project
export REGION="us-central1"
export PROJECT_NUMBER=your-project-number    # e.g. 123456789012
export SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
export GITHUB_ACTIONS_SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# API Keys (keep these secret — do not commit to git)
export GEMINI_API_KEY="AIza..."              # From AI Studio (see section 5)
export GOOGLE_S3_ACCESS_KEY="GOOG1E..."      # From GCS HMAC keys (see section 4)
export GOOGLE_S3_SECRET_KEY="..."            # From GCS HMAC keys (see section 4)
```

Then reload:

```bash
source ~/.bashrc
```

### Step 5: Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com
```

### Step 6: Create Artifact Registry (stores your Docker images)

```bash
export REGION="us-central1"

gcloud artifacts repositories create hoa-portal \
  --repository-format=docker \
  --location=$REGION \
  --description="HOA Portal container images"

# Authorize Docker to push to Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

---

## 2️⃣ Database Setup (SQLite on Cloud Storage)

Instead of Cloud SQL, we store the SQLite file in a Cloud Storage bucket and mount it directly into the Cloud Run container using a volume. This is persistent across deployments and free.

### Create the Database Bucket

```bash
# Create a private bucket for the SQLite database
gcloud storage buckets create gs://${PROJECT_ID}-database \
  --location=$REGION \
  --uniform-bucket-level-access

echo "✅ Database bucket: gs://${PROJECT_ID}-database"
```

### How It Works

Cloud Run mounts the bucket as a filesystem volume at `/app/data`. The SQLite file (`dev.db`) lives in the bucket and persists between deployments and restarts.

**Constraints with this approach:**
- ✅ `--max-instances=1` — SQLite can't handle concurrent writes from multiple instances
- ✅ Perfect for HOA portal traffic levels (hundreds of users, not thousands)
- ✅ Automatic backups via Cloud Storage versioning (enable below)

### Enable Versioning (Automatic Backups)

```bash
# Keep 30 days of database history
gcloud storage buckets update gs://${PROJECT_ID}-database \
  --versioning

# Auto-delete old versions after 30 days
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "daysSinceNoncurrentTime": 30,
          "isLive": false
        }
      }
    ]
  }
}
EOF

gcloud storage buckets update gs://${PROJECT_ID}-database \
  --lifecycle-file=lifecycle.json

rm lifecycle.json
echo "✅ Versioning enabled — 30 days of database backups"
```

---

## 3️⃣ File Storage Setup (Google Cloud Storage for PDFs)

```bash
# Create buckets for each section
for section in hoa condo1 condo2 condo3 condo4; do
  gcloud storage buckets create gs://${PROJECT_ID}-${section} \
    --location=$REGION \
    --uniform-bucket-level-access
  echo "✅ Created bucket: gs://${PROJECT_ID}-${section}"
done
```

---

## 4️⃣ Secrets Setup

Store all sensitive values in Secret Manager so they're never in code or environment files.

```bash
# Get service account that Cloud Run will use
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Database URL (SQLite file path inside the mounted volume)
echo -n "file:/app/data/production.db" | \
  gcloud secrets create database-url --data-file=-

# S3 credentials for GCS (generate HMAC keys below)
echo -n "YOUR_GCS_ACCESS_KEY" | \
  gcloud secrets create s3-access-key --data-file=-

echo -n "YOUR_GCS_SECRET_KEY" | \
  gcloud secrets create s3-secret-key --data-file=-

# Gemini API Key (for AI document description extraction)
# See "How to Get a Gemini API Key" section below
echo -n "AIza..." | \
  gcloud secrets create gemini-api-key --data-file=-

# Grant Cloud Run access to all secrets
for secret in database-url s3-access-key s3-secret-key gemini-api-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"
done

echo "✅ Secrets created and permissions granted"
```

### Generate GCS HMAC Keys (S3-compatible credentials)

```bash
# Create HMAC keys for S3-compatible access to Cloud Storage
gcloud storage hmac create ${SERVICE_ACCOUNT}

# Output will show:
# accessId: GOOG1E...
# secret: ...
# Update your secrets with these values:

# Update s3-access-key
echo -n "GOOG1E..." | gcloud secrets versions add s3-access-key --data-file=-

# Update s3-secret-key
echo -n "YOUR_SECRET" | gcloud secrets versions add s3-secret-key --data-file=-
```

### Grant Storage Access to Service Account

```bash
# Access to database bucket (read/write)
gcloud storage buckets add-iam-policy-binding gs://${PROJECT_ID}-database \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"

# Access to PDF buckets (read/write)
for section in hoa condo1 condo2 condo3 condo4; do
  gcloud storage buckets add-iam-policy-binding gs://${PROJECT_ID}-${section} \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/storage.objectAdmin"
done

echo "✅ Storage permissions granted"
```

### Grant Cloud Build Permissions to Compute Service Account

The compute service account runs your Cloud Build jobs and needs several permissions. Grant them all upfront:

```bash
# Read uploaded source from Cloud Build's GCS bucket
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectViewer"

# Write build logs to Cloud Logging
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/logging.logWriter"

# Push built images to Artifact Registry
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/artifactregistry.writer"

# Deploy to Cloud Run
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.admin"

# Allow Cloud Run deploy to act as this service account (required by gcloud run deploy)
gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser"

echo "✅ Compute service account permissions granted"
```

### Grant GitHub Actions Service Account Permissions

```bash
# Submit builds to Cloud Build
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GITHUB_ACTIONS_SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

# Upload source to Cloud Build's GCS bucket
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GITHUB_ACTIONS_SA_EMAIL}" \
  --role="roles/storage.admin"

# Required by gcloud builds submit
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GITHUB_ACTIONS_SA_EMAIL}" \
  --role="roles/serviceusage.serviceUsageConsumer"

# Deploy to Cloud Run
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GITHUB_ACTIONS_SA_EMAIL}" \
  --role="roles/run.admin"

# Act as the compute service account during deploy
gcloud iam service-accounts add-iam-policy-binding ${SERVICE_ACCOUNT} \
  --member="serviceAccount:${GITHUB_ACTIONS_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

echo "✅ GitHub Actions service account permissions granted"
```

---

## 5️⃣ Get a Gemini API Key

Since you're already on Google Workspace and Google Cloud, Gemini is the natural choice — no separate account needed.

### Option A: Google AI Studio (Easiest — Free Tier Available)

1. Go to **[aistudio.google.com](https://aistudio.google.com)**
2. Sign in with your **Google Workspace email** (admin@scarboroughglen.com)
3. Click **"Get API key"** in the left sidebar
4. Click **"Create API key"**
5. Select your Google Cloud project (`scarborough-glen-hoa`)
6. Copy the key — it starts with `AIza...`

**Store the key in Secret Manager:**

```bash
echo -n "AIza..." | gcloud secrets versions add gemini-api-key --data-file=-
```

> **Free tier**: 15 requests/minute, 1,500 requests/day — more than enough for document uploads.

### Option B: Vertex AI Gemini (Enterprise — Billed via GCP)

If you'd rather bill through your existing GCP project with no rate limits:

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Grant the Cloud Run service account access to Vertex AI
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/aiplatform.user"
```

> For the HOA portal's usage (a few document uploads per week), **Option A (AI Studio) is recommended** — it's free and simpler.

### Verify the Key Works

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY" | \
  grep -o '"name": "models/gemini[^"]*"' | head -5
# Should list available Gemini models
```

---

## 6️⃣ Deploy to Cloud Run

### Option A: Manual First Deploy

```bash
# Build and push the image
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/hoa-portal/hoa-portal:latest .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/hoa-portal/hoa-portal:latest

# Deploy with SQLite volume mount
gcloud run deploy hoa-portal \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/hoa-portal/hoa-portal:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=1 \
  --timeout=300 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="STORAGE_PROVIDER=gcp" \
  --set-env-vars="S3_ENDPOINT=storage.googleapis.com" \
  --set-env-vars="S3_PORT=443" \
  --set-env-vars="S3_USE_SSL=true" \
  --set-env-vars="S3_REGION=${REGION}" \
  --set-secrets="DATABASE_URL=database-url:latest" \
  --set-secrets="S3_ACCESS_KEY=s3-access-key:latest" \
  --set-secrets="S3_SECRET_KEY=s3-secret-key:latest" \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --add-volume=name=database,type=cloud-storage,bucket=${PROJECT_ID}-database \
  --add-volume-mount=volume=database,mount-path=/app/data
```

### Option B: Cloud Build (for ongoing deployments)

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_STORAGE_PROVIDER=gcp,_S3_ENDPOINT=storage.googleapis.com
```

### Grant Public Access

After deploying, grant unauthenticated access so the site is publicly reachable:

```bash
gcloud run services add-iam-policy-binding hoa-portal \
  --region=$REGION \
  --member="allUsers" \
  --role="roles/run.invoker"
```

> **Note:** If this fails with a policy constraint error, your Google Cloud org has a policy blocking public access. Contact your org admin to allow `allUsers` on Cloud Run, or use Identity-Aware Proxy (IAP) instead.

### Get Your URL

```bash
gcloud run services describe hoa-portal \
  --region=$REGION \
  --format='value(status.url)'
# Output: https://hoa-portal-abc123-uc.a.run.app
```

---

## 7️⃣ Custom Domain Setup (GoDaddy)

### Step 1: Verify Domain Ownership in Google Cloud

Since your domain is also used in Google Workspace, it may already be verified. Check first:

```bash
gcloud domains list-user-verified
```

If not listed:

```bash
# Start domain mapping (this generates a TXT verification record)
gcloud beta run domain-mappings create \
  --service=hoa-portal \
  --domain=scarboroughglen.com \
  --region=us-central1

# Get the TXT verification record
gcloud beta run domain-mappings describe \
  --domain=scarboroughglen.com \
  --region=us-central1
```

### Step 2: Add DNS Records in GoDaddy

**Login to GoDaddy:**
1. Go to [dnsmanagement.godaddy.com](https://dnsmanagement.godaddy.com)
2. Select `scarboroughglen.com`
3. Click **"Manage DNS"**

**Add TXT record for verification:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | @ | `google-site-verification=XXXXX` | 1 Hour |

**After verification, add CNAME for www:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | `ghs.googlehosted.com` | 1 Hour |

**For the apex domain (@), get the A record IPs:**

```bash
# Get IP addresses provided by Cloud Run
gcloud beta run domain-mappings describe \
  --domain=scarboroughglen.com \
  --region=us-central1 \
  --format="value(status.resourceRecords)"
```

Add all A records returned (typically 4 IPs):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `216.239.32.21` | 1 Hour |
| A | @ | `216.239.34.21` | 1 Hour |
| A | @ | `216.239.36.21` | 1 Hour |
| A | @ | `216.239.38.21` | 1 Hour |

> **Note:** If you're also serving email through Google Workspace, your MX records are already set — don't touch those.

### Step 3: Wait for SSL Certificate

Cloud Run automatically provisions an SSL certificate. Check status:

```bash
gcloud beta run domain-mappings describe \
  --domain=scarboroughglen.com \
  --region=us-central1 \
  --format="value(status.conditions)"
```

Wait 15–60 minutes. Once `CertificateProvisioned` shows `True`, the site is live at https://scarboroughglen.com.

---

## 8️⃣ Initialize the Application

### Seed the Database

On first deploy, run the seed script to create invite codes:

```bash
gcloud run jobs create seed-db \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/hoa-portal/hoa-portal:latest \
  --region=$REGION \
  --set-secrets="DATABASE_URL=database-url:latest" \
  --add-volume=name=database,type=cloud-storage,bucket=${PROJECT_ID}-database \
  --add-volume-mount=volume=database,mount-path=/app/data \
  --command="npx" \
  --args="prisma,db,seed"

gcloud run jobs execute seed-db --region=$REGION --wait
```

### Create Your Admin User

```bash
gcloud run jobs create make-admin \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/hoa-portal/hoa-portal:latest \
  --region=$REGION \
  --set-secrets="DATABASE_URL=database-url:latest" \
  --add-volume=name=database,type=cloud-storage,bucket=${PROJECT_ID}-database \
  --add-volume-mount=volume=database,mount-path=/app/data \
  --command="npx" \
  --args="tsx,scripts/make-admin.ts,admin@scarboroughglen.com"

gcloud run jobs execute make-admin --region=$REGION --wait
```

---

## 9️⃣ Update cloudbuild.yaml for SQLite

Update the deploy step in `cloudbuild.yaml` to include the volume mount:

```yaml
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - '${_SERVICE_NAME}'
      - '--image=...'
      - '--region=${_REGION}'
      - '--allow-unauthenticated'
      - '--min-instances=1'
      - '--max-instances=1'          # Required for SQLite
      - '--add-volume=name=database,type=cloud-storage,bucket=${PROJECT_ID}-database'
      - '--add-volume-mount=volume=database,mount-path=/app/data'
      - '--set-secrets=DATABASE_URL=database-url:latest'
      # ... other flags
```

---

## 🔟 Monitoring & Logs

```bash
# Live logs
gcloud run services logs tail hoa-portal --region=$REGION

# Cloud Console logs
open "https://console.cloud.google.com/run/detail/${REGION}/hoa-portal/logs?project=${PROJECT_ID}"

# Database backup history
gcloud storage ls -l gs://${PROJECT_ID}-database/
```

---

## 🔧 Troubleshooting

### App not starting

```bash
gcloud run services logs tail hoa-portal --region=$REGION
# Look for Prisma migration errors or missing secrets
```

### Database file not persisting

```bash
# Verify volume is mounted
gcloud run services describe hoa-portal --region=$REGION --format=json | \
  jq '.spec.template.spec.volumes'
```

### DNS not resolving

```bash
# Check propagation (can take up to 48 hours)
dig scarboroughglen.com
nslookup scarboroughglen.com 8.8.8.8

# Verify GoDaddy records saved correctly
```

### Domain already verified in Google Workspace

If Cloud Run says the domain is already verified (because of Workspace), you can skip the TXT record step and go straight to adding the A/CNAME records.

---

## 💰 Cost Estimate

**Monthly costs:**

| Service | Cost |
|---------|------|
| Cloud Run (1 instance, ~10% CPU) | ~$2-5 |
| Cloud Storage - database bucket | ~$0.03 |
| Cloud Storage - PDF buckets | ~$1-3 |
| Cloud Build (120 builds/day free) | $0 |
| Secret Manager | ~$0.06 |
| **Total** | **~$3-8/month** |

> **vs. Cloud SQL:** Using SQLite saves ~$7.50/month (no Cloud SQL db-f1-micro instance needed).

---

## 📚 Related Guides

- [QUICKSTART_CLOUDRUN.md](QUICKSTART_CLOUDRUN.md) - Condensed quick-start
- [GITHUB_AUTOMATION.md](GITHUB_AUTOMATION.md) - Auto-deploy on git push
- [GOOGLE_DRIVE_STAGING.md](GOOGLE_DRIVE_STAGING.md) - Upload docs via Google Drive
- [PROXY_SETUP.md](PROXY_SETUP.md) - Corporate proxy configuration

---

**🎉 Your HOA Portal is now live on Google Cloud Run!**
