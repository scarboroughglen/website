# 🚀 Google Cloud Run Deployment Guide

This guide walks through deploying the HOA Portal to Google Cloud Run with a custom domain from GoDaddy.

## 📋 Prerequisites

1. Google Cloud Project with billing enabled
2. `gcloud` CLI installed and authenticated
3. Domain registered with GoDaddy
4. Docker running locally for testing

## 🏗️ Architecture Overview

**Production Stack:**
- **Compute**: Google Cloud Run (serverless containers)
- **Database**: Cloud SQL (PostgreSQL) - SQLite doesn't work on Cloud Run
- **Storage**: Google Cloud Storage (S3-compatible) OR AWS S3
- **Secrets**: Google Secret Manager
- **Build**: Cloud Build
- **DNS**: GoDaddy → Cloud Run

## 1️⃣ Initial Setup

### Enable Required APIs

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  vpcaccess.googleapis.com
```

### Create Artifact Registry Repository

```bash
export REGION="us-central1"

gcloud artifacts repositories create hoa-portal \
  --repository-format=docker \
  --location=$REGION \
  --description="HOA Portal container images"
```

## 2️⃣ Database Setup (Cloud SQL PostgreSQL)

### Create Cloud SQL Instance

```bash
# Create PostgreSQL instance
gcloud sql instances create hoa-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password="CHANGE_ME_SECURE_PASSWORD"

# Create database
gcloud sql databases create hoa_production \
  --instance=hoa-db

# Create database user
gcloud sql users create hoa_user \
  --instance=hoa-db \
  --password="CHANGE_ME_USER_PASSWORD"
```

### Get Database Connection String

```bash
# Get the connection name
gcloud sql instances describe hoa-db --format='value(connectionName)'
# Output: project-id:region:hoa-db

# Connection string format for Cloud Run:
# postgresql://hoa_user:PASSWORD@/hoa_production?host=/cloudsql/PROJECT:REGION:hoa-db
```

### Update Prisma Schema for PostgreSQL

**Edit `prisma/schema.prisma`:**

```prisma
datasource db {
  provider = "postgresql"  // Changed from sqlite
  url      = env("DATABASE_URL")
}

// Update models to use PostgreSQL-compatible syntax
model User {
  id        String   @id @default(uuid())  // Changed from cuid()
  email     String   @unique
  condo     String
  unit      String
  isAdmin   Boolean  @default(false)
  createdAt DateTime @default(now())

  threads   Thread[]
  posts     Post[]
  downloads DocumentDownload[]
}

// ... (keep rest of schema, just change id defaults from cuid() to uuid())
```

## 3️⃣ Storage Setup

### Option A: Google Cloud Storage (Recommended)

```bash
# Create buckets
gsutil mb -l $REGION gs://${PROJECT_ID}-hoa
gsutil mb -l $REGION gs://${PROJECT_ID}-condo1
gsutil mb -l $REGION gs://${PROJECT_ID}-condo2
gsutil mb -l $REGION gs://${PROJECT_ID}-condo3
gsutil mb -l $REGION gs://${PROJECT_ID}-condo4

# Set lifecycle (optional - auto-delete old files)
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://${PROJECT_ID}-hoa
```

**Environment variables for GCS:**
```bash
STORAGE_PROVIDER=gcp
S3_ENDPOINT=storage.googleapis.com
S3_PORT=443
S3_USE_SSL=true
S3_REGION=us-central1
# Access keys: Use service account key or Workload Identity
```

### Option B: AWS S3

```bash
# Create buckets in AWS
aws s3 mb s3://your-org-hoa --region us-east-1
aws s3 mb s3://your-org-condo1 --region us-east-1
# ... etc

# Get credentials from IAM user
```

**Environment variables for AWS:**
```bash
STORAGE_PROVIDER=aws
S3_ENDPOINT=s3.amazonaws.com
S3_PORT=443
S3_USE_SSL=true
S3_REGION=us-east-1
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=...
```

## 4️⃣ Secrets Management

### Create Secrets in Google Secret Manager

```bash
# Database URL
echo -n "postgresql://hoa_user:PASSWORD@/hoa_production?host=/cloudsql/PROJECT:REGION:hoa-db" | \
  gcloud secrets create database-url --data-file=-

# S3 Access Key
echo -n "YOUR_S3_ACCESS_KEY" | \
  gcloud secrets create s3-access-key --data-file=-

# S3 Secret Key
echo -n "YOUR_S3_SECRET_KEY" | \
  gcloud secrets create s3-secret-key --data-file=-

# OpenAI API Key
echo -n "sk-..." | \
  gcloud secrets create openai-api-key --data-file=-

# Gemini API Key (optional)
echo -n "AIza..." | \
  gcloud secrets create gemini-api-key --data-file=-
```

### Grant Access to Cloud Run Service Account

```bash
# Get the default compute service account
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant secret access
for secret in database-url s3-access-key s3-secret-key openai-api-key gemini-api-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"
done

# Grant Cloud SQL access
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"
```

## 5️⃣ Deploy to Cloud Run

### Option A: Using Cloud Build (Recommended)

```bash
# Submit build
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_STORAGE_PROVIDER=gcp

# Monitor deployment
gcloud run services describe hoa-portal --region=$REGION
```

### Option B: Manual Deployment

```bash
# Build and push image
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/hoa-portal/hoa-portal:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/hoa-portal/hoa-portal:latest

# Deploy to Cloud Run
gcloud run deploy hoa-portal \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/hoa-portal/hoa-portal:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --set-env-vars="NODE_ENV=production,STORAGE_PROVIDER=gcp,S3_ENDPOINT=storage.googleapis.com" \
  --set-secrets="DATABASE_URL=database-url:latest,S3_ACCESS_KEY=s3-access-key:latest" \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:hoa-db
```

### Get the Cloud Run URL

```bash
gcloud run services describe hoa-portal --region=$REGION --format='value(status.url)'
# Output: https://hoa-portal-xyz-uc.a.run.app
```

## 6️⃣ Custom Domain Setup (GoDaddy)

### Step 1: Add Domain Mapping in Cloud Run

```bash
# Map your custom domain
gcloud run domain-mappings create \
  --service=hoa-portal \
  --domain=scarboroughglenhoa.com \
  --region=$REGION
```

### Step 2: Verify Domain Ownership

Cloud Run will provide a TXT record for verification:

```bash
# Get verification record
gcloud run domain-mappings describe \
  --domain=scarboroughglenhoa.com \
  --region=$REGION
```

You'll see output like:
```
resourceRecords:
- name: scarboroughglenhoa.com
  rrdata: google-site-verification=ABC123...
  type: TXT
```

### Step 3: Update DNS in GoDaddy

**Login to GoDaddy DNS Management:**

1. Go to https://dnsmanagement.godaddy.com/
2. Select your domain
3. Click "Manage DNS"

**Add Verification TXT Record:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | @ | `google-site-verification=ABC123...` | 1 Hour |

**Add CNAME Records for Cloud Run:**

After verification completes (check with `gcloud run domain-mappings describe`), you'll get CNAME targets like:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | `ghs.googlehosted.com` | 1 Hour |
| A | @ | (Use GoDaddy forwarding to www) | 1 Hour |

**Alternative: Direct A Records (if provided by Cloud Run)**

Some Cloud Run regions provide A/AAAA records:

```bash
# Get the IP addresses
gcloud run domain-mappings describe \
  --domain=scarboroughglenhoa.com \
  --region=$REGION \
  --format="value(status.resourceRecords)"
```

Add these to GoDaddy:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `216.239.32.21` | 1 Hour |
| A | @ | `216.239.34.21` | 1 Hour |
| A | @ | `216.239.36.21` | 1 Hour |
| A | @ | `216.239.38.21` | 1 Hour |

### Step 4: Enable HTTPS

Cloud Run automatically provisions SSL certificates via Let's Encrypt:

```bash
# Check certificate status
gcloud run domain-mappings describe \
  --domain=scarboroughglenhoa.com \
  --region=$REGION \
  --format="value(status.conditions)"
```

Wait 15-60 minutes for certificate provisioning.

## 7️⃣ Post-Deployment

### Run Database Migrations

Migrations run automatically on startup (via `docker-entrypoint.sh`), but you can also run manually:

```bash
# SSH into a running instance (for debugging)
gcloud run services proxy hoa-portal --region=$REGION

# Or create a one-off job
gcloud run jobs create migrate-db \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/hoa-portal/hoa-portal:latest \
  --set-secrets=DATABASE_URL=database-url:latest \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:hoa-db \
  --command="npx" \
  --args="prisma,migrate,deploy" \
  --region=$REGION
```

### Seed Initial Data

```bash
# Create admin user via Cloud Run job
gcloud run jobs create seed-db \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/hoa-portal/hoa-portal:latest \
  --set-secrets=DATABASE_URL=database-url:latest \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:hoa-db \
  --command="npx" \
  --args="prisma,db,seed" \
  --region=$REGION

gcloud run jobs execute seed-db --region=$REGION
```

### Create Admin User

```bash
# Use the make-admin script
gcloud run jobs create make-admin \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/hoa-portal/hoa-portal:latest \
  --set-secrets=DATABASE_URL=database-url:latest \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:hoa-db \
  --command="npx" \
  --args="tsx,scripts/make-admin.ts,admin@scarboroughglenhoa.com" \
  --region=$REGION

gcloud run jobs execute make-admin --region=$REGION
```

## 8️⃣ Monitoring & Logs

### View Logs

```bash
# Stream logs
gcloud run services logs tail hoa-portal --region=$REGION

# View in Cloud Console
echo "https://console.cloud.google.com/run/detail/$REGION/hoa-portal/logs?project=$PROJECT_ID"
```

### Set Up Alerts

```bash
# Create uptime check
gcloud monitoring uptime create hoa-portal-uptime \
  --resource-type=uptime-url \
  --host=scarboroughglenhoa.com \
  --path=/
```

## 9️⃣ CI/CD Setup (Optional)

### Automatic Deployments from GitHub

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Deploy to Cloud Run
        run: |
          gcloud builds submit --config cloudbuild.yaml
```

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Test connection from Cloud Run
gcloud run services update hoa-portal \
  --region=$REGION \
  --set-env-vars="DEBUG=true"

# Check Cloud SQL logs
gcloud sql operations list --instance=hoa-db
```

### DNS Not Resolving

```bash
# Check DNS propagation
dig scarboroughglenhoa.com
nslookup scarboroughglenhoa.com

# Wait up to 48 hours for full propagation
```

### SSL Certificate Issues

```bash
# Force certificate refresh
gcloud run domain-mappings delete --domain=scarboroughglenhoa.com --region=$REGION
gcloud run domain-mappings create --service=hoa-portal --domain=scarboroughglenhoa.com --region=$REGION
```

## 💰 Cost Estimate

**Monthly costs (light usage):**
- Cloud Run: $0-5 (free tier covers most)
- Cloud SQL (db-f1-micro): ~$7.50
- Cloud Storage: ~$1-2
- Cloud Build: $0 (120 builds/day free)
- **Total: ~$10-15/month**

**Production scale (1000 users):**
- Cloud Run: ~$20
- Cloud SQL (db-g1-small): ~$25
- Cloud Storage: ~$5
- **Total: ~$50/month**

## 📚 Next Steps

1. Set up automated backups for Cloud SQL
2. Configure Cloud Armor for DDoS protection
3. Set up monitoring dashboards
4. Configure email via SendGrid or Mailgun
5. Add Cloud CDN for static assets

---

**🎉 Your HOA Portal is now running on Google Cloud Run with a custom domain!**
