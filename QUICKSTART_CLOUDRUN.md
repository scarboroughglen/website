# ⚡ Quick Start: Deploy to Cloud Run in 10 Minutes

## Prerequisites
- Google Cloud account with billing enabled
- `gcloud` CLI installed: `curl https://sdk.cloud.google.com | bash`
- Domain registered (e.g., GoDaddy)

## 🚀 Deploy Now

### 1. Setup GCP Project (2 min)

```bash
# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Create repository
gcloud artifacts repositories create hoa-portal \
  --repository-format=docker \
  --location=us-central1
```

### 2. Create Secrets (2 min)

```bash
# Database URL (use SQLite for quick test, PostgreSQL for production)
echo -n "file:/app/data/prod.db" | \
  gcloud secrets create database-url --data-file=-

# S3 credentials (use your AWS or GCP credentials)
echo -n "YOUR_ACCESS_KEY" | \
  gcloud secrets create s3-access-key --data-file=-

echo -n "YOUR_SECRET_KEY" | \
  gcloud secrets create s3-secret-key --data-file=-

# AI keys (optional)
echo -n "sk-..." | \
  gcloud secrets create openai-api-key --data-file=-

echo -n "AIza..." | \
  gcloud secrets create gemini-api-key --data-file=-

# Grant access to default service account
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
for secret in database-url s3-access-key s3-secret-key openai-api-key gemini-api-key; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 3. Deploy (3 min)

```bash
# Clone your repo (or cd to existing)
cd /home/eanderso/projects/hoa/website

# Deploy with Cloud Build
gcloud builds submit --config cloudbuild.yaml

# Or deploy directly
gcloud run deploy hoa-portal \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-secrets="DATABASE_URL=database-url:latest,S3_ACCESS_KEY=s3-access-key:latest,S3_SECRET_KEY=s3-secret-key:latest"
```

### 4. Get Your URL

```bash
gcloud run services describe hoa-portal \
  --region=us-central1 \
  --format='value(status.url)'

# Output: https://hoa-portal-xyz-uc.a.run.app
```

### 5. Setup Custom Domain (3 min)

```bash
# Map domain
gcloud run domain-mappings create \
  --service=hoa-portal \
  --domain=yourdomain.com \
  --region=us-central1

# Get DNS records
gcloud run domain-mappings describe \
  --domain=yourdomain.com \
  --region=us-central1
```

**Add to GoDaddy DNS:**

1. Login to GoDaddy DNS Management
2. Add TXT record for verification (shown in output above)
3. Add CNAME record: `www` → `ghs.googlehosted.com`
4. Add A records for apex domain (IPs shown in output)

Wait 15-60 minutes for SSL certificate.

## ✅ Done!

Your HOA Portal is now live at:
- Temporary URL: `https://hoa-portal-xyz-uc.a.run.app`
- Custom domain: `https://yourdomain.com` (after DNS propagates)

## 🔄 Update Deployment

```bash
# Make code changes
git commit -am "Update feature"

# Redeploy
gcloud builds submit --config cloudbuild.yaml
```

## 📊 View Logs

```bash
gcloud run services logs tail hoa-portal --region=us-central1
```

## 💡 Next Steps

- See [CLOUDRUN_DEPLOYMENT.md](CLOUDRUN_DEPLOYMENT.md) for production setup with Cloud SQL
- Setup automated deploys from GitHub (see CI/CD section)
- Configure email delivery
- Add monitoring and alerts

---

**Cost: ~$0-5/month** (free tier covers light usage)
