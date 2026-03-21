# 🤖 GitHub Automation for Cloud Run

This guide sets up automatic deployments to Cloud Run when you push to GitHub.

## 🎯 How It Works

```
You push code → GitHub → Cloud Build (in GCP) → Cloud Run
```

**Where builds happen**: In Google Cloud (not GitHub Actions, not your machine)

## 🔧 Setup Options

### Option 1: Cloud Build GitHub Trigger (Recommended)

This uses Google Cloud Build directly (no GitHub Actions needed).

#### 1. Connect GitHub to Cloud Build

```bash
# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Open Cloud Console to connect GitHub
echo "Visit: https://console.cloud.google.com/cloud-build/triggers"
```

**In Cloud Console:**
1. Click "Connect Repository"
2. Select "GitHub"
3. Authenticate with GitHub
4. Select your repository
5. Click "Connect"

#### 2. Create Build Trigger

**Via Console** (easiest):

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click "Create Trigger"
3. Configure:
   - **Name**: `deploy-to-cloudrun`
   - **Event**: Push to a branch
   - **Source**: Your GitHub repo
   - **Branch**: `^main$`
   - **Configuration**: Cloud Build configuration file (YAML)
   - **Location**: `/cloudbuild.yaml`
4. Click "Create"

**Via CLI**:

```bash
gcloud builds triggers create github \
  --name="deploy-to-cloudrun" \
  --repo-name="hoa-website" \
  --repo-owner="YOUR_GITHUB_USERNAME" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"
```

#### 3. Test the Trigger

```bash
# Make a change
echo "# Test deployment" >> README.md
git add README.md
git commit -m "Test Cloud Build trigger"
git push origin main

# Watch the build
gcloud builds list --ongoing
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)')
```

**Build logs**: https://console.cloud.google.com/cloud-build/builds

### Option 2: GitHub Actions (Alternative)

Use GitHub Actions to trigger Cloud Build.

#### 1. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --description="GitHub Actions deployer" \
  --display-name="GitHub Actions"

# Get email
SA_EMAIL=$(gcloud iam service-accounts list \
  --filter="displayName:GitHub Actions" \
  --format='value(email)')

# Grant permissions
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Create key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=${SA_EMAIL}

# Copy key contents (you'll add this to GitHub secrets)
cat github-actions-key.json
```

#### 2. Add Secret to GitHub

1. Go to your GitHub repo
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `GCP_SA_KEY`
5. Value: Paste contents of `github-actions-key.json`

#### 3. Create GitHub Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1
  SERVICE_NAME: hoa-portal

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Submit to Cloud Build
        run: |
          gcloud builds submit \
            --config cloudbuild.yaml \
            --substitutions=_REGION=${{ env.REGION }}

      - name: Get Cloud Run URL
        run: |
          URL=$(gcloud run services describe ${{ env.SERVICE_NAME }} \
            --region=${{ env.REGION }} \
            --format='value(status.url)')
          echo "🚀 Deployed to: $URL"
```

#### 4. Add Project ID Secret

In GitHub → Settings → Secrets:
- Name: `GCP_PROJECT_ID`
- Value: Your GCP project ID

#### 5. Test GitHub Actions

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions deployment"
git push origin main
```

Check: https://github.com/YOUR_USERNAME/YOUR_REPO/actions

## 🔄 Deployment Workflow

### Every Push to `main`:

1. ✅ GitHub notifies Cloud Build (or GitHub Actions triggers build)
2. ✅ Cloud Build clones your repo
3. ✅ Builds Docker image using `Dockerfile`
4. ✅ Pushes image to Artifact Registry
5. ✅ Deploys to Cloud Run
6. ✅ Updates https://your-domain.com

### Build Time: ~2-4 minutes

### View Logs:

**Cloud Build Trigger**:
```bash
gcloud builds list
gcloud builds log BUILD_ID
```

**GitHub Actions**:
- Go to Actions tab in GitHub repo

## 🎛️ Advanced Configuration

### Deploy to Staging First

**Update cloudbuild.yaml**:

```yaml
# Add staging deployment step
steps:
  # ... existing steps ...

  # Deploy to staging
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'hoa-portal-staging'
      - '--image=${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPOSITORY}/${_SERVICE_NAME}:${SHORT_SHA}'
      - '--region=${_REGION}'
      # ... other args ...

  # Wait for manual approval (requires Cloud Build Approval)
  - name: 'gcr.io/cloud-builders/gcloud'
    waitFor: ['-']  # Manual approval step

  # Deploy to production
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'hoa-portal'
      # ... same args as staging ...
```

### Branch-Specific Deployments

**Create multiple triggers**:

```bash
# Staging: deploy feature/* branches
gcloud builds triggers create github \
  --name="deploy-to-staging" \
  --branch-pattern="^feature/.*$" \
  --build-config="cloudbuild.staging.yaml"

# Production: deploy main branch
gcloud builds triggers create github \
  --name="deploy-to-production" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"
```

### Run Tests Before Deploy

**Update cloudbuild.yaml**:

```yaml
steps:
  # Build image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'test-image', '.']

  # Run tests
  - name: 'test-image'
    entrypoint: 'npm'
    args: ['test']

  # Only deploy if tests pass
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', ...]
```

## 🚫 Prevent Deployment

### Skip CI

Add `[skip ci]` to commit message:

```bash
git commit -m "Update docs [skip ci]"
```

### Disable Trigger Temporarily

```bash
gcloud builds triggers update deploy-to-cloudrun --disabled
```

## 📊 Monitor Deployments

### Slack Notifications

Use Cloud Build's built-in Slack integration:

1. Go to [Cloud Build Settings](https://console.cloud.google.com/cloud-build/settings)
2. Enable "Cloud Build Slack App"
3. Connect to your Slack workspace
4. Choose channels for build notifications

### Email Notifications

Cloud Build sends emails automatically to the Cloud Console email.

## 🔐 Security Best Practices

1. **Never commit secrets** - Use Secret Manager
2. **Use least-privilege service accounts**
3. **Enable Binary Authorization** (for production)
4. **Scan images for vulnerabilities** (Cloud Build built-in)

```bash
# Enable vulnerability scanning
gcloud services enable containerscanning.googleapis.com
```

## 🆘 Troubleshooting

### Build Fails with "Permission Denied"

```bash
# Grant Cloud Build service account permissions
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"
```

### GitHub Trigger Not Firing

```bash
# Verify trigger exists
gcloud builds triggers list

# Check trigger logs
gcloud builds triggers describe deploy-to-cloudrun
```

### Slow Builds

- Use Cloud Build's caching
- Reduce Docker layers
- Use private worker pool (faster networking)

## 📚 Resources

- [Cloud Build GitHub Integration](https://cloud.google.com/build/docs/automating-builds/github/build-repos-from-github)
- [GitHub Actions for Google Cloud](https://github.com/google-github-actions)
- [Cloud Build Pricing](https://cloud.google.com/build/pricing) (120 builds/day free)

---

**🎉 Automated deployments are now set up! Every push to `main` automatically deploys to production.**
