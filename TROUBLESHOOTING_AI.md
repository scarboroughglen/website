# 🔍 AI Description Troubleshooting Guide

## Check Docker Logs

When you upload a PDF, detailed logs are now written to Docker. Here's how to view them:

### View Logs in Real-Time

```bash
# Follow logs (live updates)
docker compose logs -f app

# Or use make command
make logs
```

### View Recent Logs

```bash
# Last 50 lines
docker compose logs --tail=50 app

# Last 100 lines
docker compose logs --tail=100 app
```

## What You'll See in the Logs

### Example 1: Success with OpenAI

```
=== PDF Description Extraction Started ===
File: meeting_minutes.pdf
Size: 245.32 KB
OpenAI API Key: ✓ Set
Gemini API Key: ✗ Not set
→ Attempting OpenAI extraction...
  Parsing PDF to extract text...
  Extracted 8543 characters from PDF
  ✓ Sufficient text found, sending to OpenAI...
✓ OpenAI extraction successful: "Board meeting minutes from March 2024 covering..."
=== Extraction Complete ===
```

### Example 2: Success with Gemini

```
=== PDF Description Extraction Started ===
File: budget_2024.pdf
Size: 128.45 KB
OpenAI API Key: ✗ Not set
Gemini API Key: ✓ Set
→ Skipping OpenAI (no API key)
→ Attempting Gemini extraction...
  Parsing PDF to extract text...
  Extracted 5234 characters from PDF
  ✓ Sufficient text found, sending to Gemini...
✓ Gemini extraction successful: "Annual budget for 2024-2025 fiscal year..."
=== Extraction Complete ===
```

### Example 3: No API Keys (Fallback to Filename)

```
=== PDF Description Extraction Started ===
File: annual_report.pdf
Size: 532.18 KB
OpenAI API Key: ✗ Not set
Gemini API Key: ✗ Not set
→ Skipping OpenAI (no API key)
→ Skipping Gemini (no API key)
→ Attempting metadata extraction...
✗ No metadata found in PDF
→ Using filename as last resort...
✓ Using filename: "annual report"
⚠️  RECOMMENDATION: Set OPENAI_API_KEY or GEMINI_API_KEY for AI-generated descriptions
=== Extraction Complete (filename fallback) ===
```

### Example 4: OpenAI Error (Falls Back to Gemini)

```
=== PDF Description Extraction Started ===
File: rules.pdf
Size: 89.23 KB
OpenAI API Key: ✓ Set
Gemini API Key: ✓ Set
→ Attempting OpenAI extraction...
  Parsing PDF to extract text...
  Extracted 4521 characters from PDF
  ✓ Sufficient text found, sending to OpenAI...
✗ OpenAI extraction failed: Invalid API key
  API Response: 401 Unauthorized
  Error details: { error: { message: 'Incorrect API key provided' } }
→ Attempting Gemini extraction...
  Parsing PDF to extract text...
  Extracted 4521 characters from PDF
  ✓ Sufficient text found, sending to Gemini...
✓ Gemini extraction successful: "Community rules and regulations..."
=== Extraction Complete ===
```

## Common Issues & Solutions

### Issue: "OpenAI API Key: ✗ Not set"

**Problem:** Environment variable not set

**Solution:**
```bash
# Set the key
export OPENAI_API_KEY="sk-your-key-here"

# Restart container
docker compose restart app

# Verify it's set
docker compose exec app printenv | grep OPENAI_API_KEY
```

### Issue: "Invalid API key"

**Logs show:**
```
✗ OpenAI extraction failed: Invalid API key
  API Response: 401 Unauthorized
```

**Solutions:**
1. **Wrong key format** - OpenAI keys start with `sk-`
2. **Expired key** - Check at https://platform.openai.com/api-keys
3. **Wrong account** - Make sure it's an OpenAI API key, not a ChatGPT Plus key

### Issue: "Rate limit exceeded"

**Logs show:**
```
✗ OpenAI extraction failed: Rate limit reached
  API Response: 429 Too Many Requests
```

**Solutions:**
1. **Wait 1 minute** and try again
2. **Add Gemini fallback:**
   ```bash
   export GEMINI_API_KEY="AIza-your-key"
   docker compose restart app
   ```
3. **Upgrade OpenAI tier** at https://platform.openai.com/account/billing

### Issue: "Not enough text in PDF (< 50 chars)"

**Logs show:**
```
  Extracted 12 characters from PDF
  ✗ Not enough text in PDF (< 50 chars)
```

**Cause:** PDF is:
- Scanned image (no text layer)
- Encrypted/protected
- Very short document

**Solutions:**
1. **OCR the PDF first** (add text layer)
2. **Manually enter description** (edit the auto-generated one)
3. System will fall back to metadata/filename automatically

### Issue: "Proxy blocking API calls"

**Logs show:**
```
✗ OpenAI extraction failed: connect ETIMEDOUT
```

**Solution:**
```bash
# Add proxy exceptions for AI APIs
export NO_PROXY="api.openai.com,generativelanguage.googleapis.com"
export no_proxy="api.openai.com,generativelanguage.googleapis.com"

docker compose restart app
```

## Testing AI Setup

### Quick Test Script

```bash
#!/bin/bash

echo "Testing AI API Keys..."
echo ""

# Test OpenAI
if [ -n "$OPENAI_API_KEY" ]; then
  echo "✓ OPENAI_API_KEY is set"
  echo "  Testing API..."
  curl -s https://api.openai.com/v1/models \
    -H "Authorization: Bearer $OPENAI_API_KEY" | jq -r '.data[0].id' 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "  ✓ OpenAI API key is valid!"
  else
    echo "  ✗ OpenAI API key is invalid or network error"
  fi
else
  echo "✗ OPENAI_API_KEY is not set"
fi

echo ""

# Test Gemini
if [ -n "$GEMINI_API_KEY" ]; then
  echo "✓ GEMINI_API_KEY is set"
  echo "  Testing API..."
  curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" | jq -r '.models[0].name' 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "  ✓ Gemini API key is valid!"
  else
    echo "  ✗ Gemini API key is invalid or network error"
  fi
else
  echo "✗ GEMINI_API_KEY is not set"
fi
```

Save as `test-ai-keys.sh` and run:
```bash
chmod +x test-ai-keys.sh
./test-ai-keys.sh
```

## Monitoring Logs While Uploading

**Best practice for debugging:**

```bash
# Terminal 1: Watch logs
docker compose logs -f app

# Terminal 2: Upload PDFs via browser
# Go to http://localhost:3000/admin/upload
```

This way you can see exactly what happens in real-time!

## What to Share for Support

If you need help, share these logs:

```bash
# Capture logs during upload
docker compose logs --tail=200 app > ai-debug.log

# Then share ai-debug.log
```

Include:
1. The log output (ai-debug.log)
2. Which API key you're using (OpenAI or Gemini)
3. The exact error message from the UI
4. The PDF filename (if not sensitive)

---

**💡 Tip:** Set both `OPENAI_API_KEY` and `GEMINI_API_KEY` for maximum reliability. If one fails, it automatically tries the other!
