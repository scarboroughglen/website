# 🌐 Corporate Proxy Setup Guide

This guide explains how to configure the HOA Portal when working behind a corporate proxy.

## 🎯 When You Need This

You're behind a corporate proxy if:
- Your company requires all internet traffic to go through a proxy server
- You get SSL certificate errors when running `npm install`
- You can't access external APIs or packages directly

## 🔧 Setup for Local Development

### 1. Set Proxy Environment Variables

Add these to your shell profile (`~/.bashrc`, `~/.zshrc`, or `~/.bash_profile`):

```bash
# Corporate proxy settings
export http_proxy="http://proxy.company.com:8080"
export https_proxy="http://proxy.company.com:8080"
export HTTP_PROXY="http://proxy.company.com:8080"
export HTTPS_PROXY="http://proxy.company.com:8080"

# Bypass proxy for local services
export no_proxy="localhost,127.0.0.1,minio,*.local"
export NO_PROXY="localhost,127.0.0.1,minio,*.local"

# Disable TLS verification (needed for proxy SSL inspection)
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

**Replace** `proxy.company.com:8080` with your actual proxy address.

### 2. Reload Shell Configuration

```bash
source ~/.bashrc  # or ~/.zshrc
```

### 3. Verify Settings

```bash
echo $http_proxy
# Should output: http://proxy.company.com:8080

echo $NODE_TLS_REJECT_UNAUTHORIZED
# Should output: 0
```

## 🐳 How It Works with Docker

### Build Time (Dockerfile)

The Dockerfile **conditionally** disables TLS verification:

```dockerfile
# Only disables TLS verification if HTTP_PROXY is set
RUN if [ -n "$HTTP_PROXY" ]; then \
        NODE_TLS_REJECT_UNAUTHORIZED=0 npm run build; \
    else \
        npm run build; \
    fi
```

### Runtime (docker-compose.yml)

Docker Compose passes your environment variables to the container:

```yaml
environment:
  - http_proxy=${http_proxy}
  - https_proxy=${https_proxy}
  - NODE_TLS_REJECT_UNAUTHORIZED=${NODE_TLS_REJECT_UNAUTHORIZED:-}
```

**Default behavior**: If `NODE_TLS_REJECT_UNAUTHORIZED` is not set, it defaults to empty (secure).

## 📋 Quick Setup Commands

### Option A: Set for Current Session Only

```bash
# Set proxy and build
export http_proxy="http://proxy.company.com:8080"
export https_proxy="http://proxy.company.com:8080"
export NODE_TLS_REJECT_UNAUTHORIZED=0

make down
make build
make up
```

### Option B: Create .env.local File

Create a file `.env.local` (git-ignored):

```bash
# Proxy settings
http_proxy=http://proxy.company.com:8080
https_proxy=http://proxy.company.com:8080
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
no_proxy=localhost,127.0.0.1,minio
NO_PROXY=localhost,127.0.0.1,minio
NODE_TLS_REJECT_UNAUTHORIZED=0
```

Then source it:

```bash
set -a; source .env.local; set +a
make down
make build
make up
```

## 🚫 Bypassing Proxy for Specific Domains

If your proxy blocks or interferes with certain domains (like OpenAI, Gemini), add them to `NO_PROXY`:

```bash
export NO_PROXY="localhost,127.0.0.1,minio,api.openai.com,generativelanguage.googleapis.com"
export no_proxy="localhost,127.0.0.1,minio,api.openai.com,generativelanguage.googleapis.com"
```

This tells the app to access these domains directly, bypassing the proxy.

## ☁️ Production Deployment (No Proxy)

### Cloud Run, AWS, etc.

**Good news**: You don't need to set any proxy variables!

When deploying to Cloud Run:
- ✅ No `HTTP_PROXY` set → Dockerfile doesn't disable TLS verification
- ✅ No `NODE_TLS_REJECT_UNAUTHORIZED` set → Secure TLS enabled
- ✅ Direct internet access → No proxy needed

```bash
# Cloud Run deployment - no proxy needed
gcloud builds submit --config cloudbuild.yaml
```

The same Dockerfile works securely in production because it only disables TLS verification when a proxy is detected.

## 🔒 Security Notes

### Why We Disable TLS Verification

Corporate proxies often perform "SSL inspection":
1. Proxy intercepts HTTPS traffic
2. Proxy presents its own certificate (signed by company CA)
3. Node.js doesn't trust this certificate by default
4. Setting `NODE_TLS_REJECT_UNAUTHORIZED=0` accepts the proxy's certificate

**This is ONLY safe behind your corporate firewall.**

### Never Use in Production

```bash
# ❌ NEVER DO THIS IN PRODUCTION
export NODE_TLS_REJECT_UNAUTHORIZED=0
gcloud run deploy ...

# ✅ CORRECT - Let it default to secure
gcloud run deploy ...
```

## 🧪 Testing Your Setup

### Test 1: Verify Proxy is Working

```bash
# Should return your proxy's IP, not your real IP
curl -x $http_proxy http://httpbin.org/ip
```

### Test 2: Test npm Behind Proxy

```bash
npm config set proxy $http_proxy
npm config set https-proxy $https_proxy
npm config set strict-ssl false

npm install -g npm  # Test package install
```

### Test 3: Test Docker Build

```bash
make down
make build

# Should see successful build with proxy settings
```

## 🆘 Troubleshooting

### Error: "unable to get local issuer certificate"

**Cause**: Proxy is doing SSL inspection, but Node.js doesn't trust it.

**Fix**:
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
make down && make build && make up
```

### Error: "ETIMEDOUT" or "ECONNREFUSED"

**Cause**: Proxy address is wrong or proxy is down.

**Fix**:
```bash
# Verify proxy is accessible
curl -x $http_proxy http://google.com

# Check with IT for correct proxy address
```

### Error: "407 Proxy Authentication Required"

**Cause**: Your proxy requires username/password.

**Fix**:
```bash
export http_proxy="http://username:password@proxy.company.com:8080"
export https_proxy="http://username:password@proxy.company.com:8080"
```

### Build Works Locally But Fails on Cloud Run

**Cause**: You're using proxy settings in Cloud Run where they're not needed.

**Fix**: Make sure you're NOT setting proxy environment variables in `cloudbuild.yaml` or Cloud Run.

## 📚 Additional Resources

- [npm proxy configuration](https://docs.npmjs.com/cli/v7/using-npm/config#proxy)
- [Docker proxy configuration](https://docs.docker.com/network/proxy/)
- [Node.js TLS documentation](https://nodejs.org/api/tls.html)

## ✅ Quick Reference

| Scenario | http_proxy | NODE_TLS_REJECT_UNAUTHORIZED | Result |
|----------|------------|------------------------------|--------|
| Local dev + proxy | Set | 0 | ✅ Works with proxy |
| Local dev + no proxy | Not set | Not set | ✅ Secure direct access |
| Cloud Run production | Not set | Not set | ✅ Secure cloud deployment |
| Cloud Run + proxy vars | Set (wrong!) | 0 (wrong!) | ❌ Insecure! |

---

**🔐 Remember**: Proxy settings are for local development only. Never use them in production!
