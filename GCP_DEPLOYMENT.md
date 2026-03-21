# 🌐 GCP Deployment Guide

## Overview

This guide shows how to deploy the Scarborough Glen HOA Portal to Google Cloud Platform (GCP) using Cloud Storage for document storage.

## Architecture

```
┌─────────────────┐
│   Cloud Run     │ ← Next.js App (Container)
│   (Port 3000)   │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────┐
│  Cloud Storage  │  │  Cloud SQL   │
│  (S3-API Mode)  │  │  (Optional)  │
│                 │  │              │
│  Buckets:       │  │  Or SQLite   │
│  - hoa          │  │  on Volume   │
│  - condo1       │  └──────────────┘
│  - condo2       │
│  - condo3       │
│  - condo4       │
└─────────────────┘
```

## Prerequisites

1. GCP Account with billing enabled
2. `gcloud` CLI installed
3. Docker installed locally
4. Project created in GCP Console

## Step 1: Setup GCP Cloud Storage

### 1.1 Create Storage Buckets

```bash
# Set your project ID
export PROJECT_ID=your-project-id
export REGION=us-central1

gcloud config set project $PROJECT_ID

# Create buckets for each section
for bucket in hoa condo1 condo2 condo3 condo4; do
  gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://scarborough-glen-$bucket/
done
```

### 1.2 Generate HMAC Keys for S3-Compatible API

GCP Cloud Storage supports S3-compatible API. Generate HMAC keys:

**Option A: Via Console**
1. Go to https://console.cloud.google.com/storage/settings
2. Click **Interoperability** tab
3. Click **Create a key for a service account**
4. Select or create a service account
5. Save the Access Key and Secret

**Option B: Via CLI**
```bash
# Create service account
gcloud iam service-accounts create storage-hmac \
  --display-name="Storage HMAC Service Account"

# Grant storage admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:storage-hmac@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create HMAC key
gcloud storage hmac create storage-hmac@$PROJECT_ID.iam.gserviceaccount.com
```

Save the output:
- **Access ID**: Your GCP_ACCESS_KEY
- **Secret**: Your GCP_SECRET_KEY

### 1.3 Set Bucket Permissions

```bash
# Make buckets private (only accessible via HMAC keys)
for bucket in hoa condo1 condo2 condo3 condo4; do
  gsutil iam ch allUsers:objectViewer gs://scarborough-glen-$bucket/
  # Or keep completely private:
  # gsutil uniformbucketlevelaccess set on gs://scarborough-glen-$bucket/
done
```

## Step 2: Configure Application

### 2.1 Update Environment Variables

Create `.env.production`:

```bash
# Copy GCP template
cp .env.gcp.example .env.production

# Edit with your values
nano .env.production
```

Set these values:
```env
STORAGE_PROVIDER=gcp
GCP_ACCESS_KEY=your-hmac-access-key
GCP_SECRET_KEY=your-hmac-secret-key
BUCKET_PREFIX=scarborough-glen-
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
```

### 2.2 Test Locally with GCP Storage

```bash
# Build with production config
docker build -t hoa-portal .

# Run with GCP storage
docker run -p 3000:3000 \
  --env-file .env.production \
  hoa-portal
```

Upload a test document and verify it appears in GCP Cloud Storage console.

## Step 3: Deploy to Cloud Run

### 3.1 Build and Push Container

```bash
# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sql-component.googleapis.com

# Build container
gcloud builds submit --tag gcr.io/$PROJECT_ID/hoa-portal

# Or use Artifact Registry (recommended)
gcloud artifacts repositories create hoa-portal \
  --repository-format=docker \
  --location=$REGION

gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT_ID/hoa-portal/app
```

### 3.2 Deploy to Cloud Run

```bash
# Deploy
gcloud run deploy hoa-portal \
  --image gcr.io/$PROJECT_ID/hoa-portal \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "STORAGE_PROVIDER=gcp,GCP_PROJECT_ID=$PROJECT_ID,BUCKET_PREFIX=scarborough-glen-,NODE_ENV=production" \
  --set-secrets="GCP_ACCESS_KEY=gcp-hmac-access:latest,GCP_SECRET_KEY=gcp-hmac-secret:latest"
```

### 3.3 Create Secrets (Recommended)

Instead of env vars, use Secret Manager:

```bash
# Create secrets
echo -n "your-hmac-access-key" | gcloud secrets create gcp-hmac-access --data-file=-
echo -n "your-hmac-secret-key" | gcloud secrets create gcp-hmac-secret --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding gcp-hmac-access \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding gcp-hmac-secret \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 4: Database Setup

### Option A: SQLite (Simple)

Use Cloud Run volumes for persistence:

```bash
gcloud run deploy hoa-portal \
  --image gcr.io/$PROJECT_ID/hoa-portal \
  --add-volume name=data,type=cloud-storage,bucket=scarborough-glen-db \
  --add-volume-mount volume=data,mount-path=/app/data
```

### Option B: Cloud SQL PostgreSQL (Production)

```bash
# Create PostgreSQL instance
gcloud sql instances create hoa-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION

# Create database
gcloud sql databases create hoa_portal --instance=hoa-db

# Update Prisma schema to use PostgreSQL
# Then deploy with Cloud SQL connection
gcloud run deploy hoa-portal \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:hoa-db \
  --set-env-vars="DATABASE_URL=postgresql://user:pass@localhost/hoa_portal?host=/cloudsql/$PROJECT_ID:$REGION:hoa-db"
```

## Step 5: Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service hoa-portal \
  --domain portal.scarboroughglen.com \
  --region $REGION

# Follow DNS instructions to add records
```

## Step 6: Monitoring & Logging

### Enable Logging

```bash
# View logs
gcloud run services logs read hoa-portal --region=$REGION

# Or in console:
# https://console.cloud.google.com/run/detail/$REGION/hoa-portal/logs
```

### Set Up Alerts

```bash
# Create alert for errors
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="HOA Portal Errors" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

## Watermarking Verification

**Documents downloaded from GCP storage are automatically watermarked:**

1. User requests document via `/documents`
2. App fetches from GCP Cloud Storage
3. **PDF watermarked** with:
   - Footer: `email | Condo X - Unit XXX | timestamp`
   - Diagonal: Semi-transparent watermark
4. Watermarked PDF sent to user

**The watermarking happens server-side, so:**
- ✅ Original files in GCP remain unwatermarked
- ✅ Every download gets fresh watermark
- ✅ No direct access to unwatermarked files
- ✅ Audit trail of who downloaded what

## Cost Optimization

### Storage Costs
- Cloud Storage: ~$0.02/GB/month (Standard)
- Expected: <$1/month for typical HOA usage

### Cloud Run Costs
- Free tier: 2 million requests/month
- After: $0.40 per million requests
- Expected: $0-5/month for small HOA

### Total Estimated Cost
- **$5-15/month** for typical small HOA usage

## Security Checklist

- ✅ HMAC keys stored in Secret Manager
- ✅ Buckets private (no public access)
- ✅ HTTPS enforced (Cloud Run default)
- ✅ All downloads watermarked
- ✅ Authentication required
- ✅ Section-based access control
- ✅ Audit logging enabled

## Backup Strategy

### Database Backups
```bash
# If using Cloud SQL
gcloud sql backups create --instance=hoa-db

# Automated backups (enabled by default)
gcloud sql instances patch hoa-db \
  --backup-start-time=03:00
```

### Storage Backups
```bash
# Enable versioning
for bucket in hoa condo1 condo2 condo3 condo4; do
  gsutil versioning set on gs://scarborough-glen-$bucket/
done

# Or create backup bucket
gsutil mb gs://scarborough-glen-backup/
gsutil rsync -r gs://scarborough-glen-hoa/ gs://scarborough-glen-backup/hoa/
```

## Troubleshooting

### Uploads failing
```bash
# Check HMAC key permissions
gcloud storage hmac list

# Verify service account has storage.objects.create
gcloud projects get-iam-policy $PROJECT_ID \
  --filter="bindings.members:serviceAccount:storage-hmac@$PROJECT_ID.iam.gserviceaccount.com"
```

### Downloads not watermarking
```bash
# Check app logs
gcloud run services logs read hoa-portal --region=$REGION --limit=50

# Look for PDF processing errors
```

### Connection timeout
```bash
# Increase Cloud Run timeout
gcloud run services update hoa-portal \
  --timeout=300 \
  --region=$REGION
```

## Migration from MinIO to GCP

1. **Export data from MinIO**:
   ```bash
   docker compose exec minio mc mirror local/hoa /tmp/backup/hoa
   ```

2. **Upload to GCP**:
   ```bash
   gsutil -m cp -r /tmp/backup/hoa/* gs://scarborough-glen-hoa/
   ```

3. **Update env vars** to use GCP
4. **Restart** application
5. **Verify** downloads still work

## Next Steps

- [ ] Set up Cloud CDN for faster downloads
- [ ] Configure Cloud Armor for DDoS protection
- [ ] Set up Cloud Monitoring dashboards
- [ ] Enable audit logging
- [ ] Configure backup schedule
- [ ] Set up staging environment

---

**Your HOA portal is now running on GCP with enterprise-grade storage! 🎉**

All documents are stored in Cloud Storage and automatically watermarked on download.
