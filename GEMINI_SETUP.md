# 🤖 AI Integration Setup (OpenAI or Gemini)

## Overview

The HOA portal uses **AI** to automatically generate smart descriptions for uploaded PDF documents. When you upload a PDF, AI reads the content and creates a helpful 1-2 sentence description.

**Supported AI Providers:**
- ✅ **OpenAI** (GPT-4o-mini) - Recommended if you already have an API key
- ✅ **Google Gemini** (Gemini 1.5 Flash) - Free tier available
- 🔄 **Automatic Fallback** - Tries OpenAI → Gemini → Metadata → Filename

## Features

- 📄 **Smart Descriptions** - AI reads PDF content and generates contextual descriptions
- 🎯 **HOA-Focused** - Trained to identify relevant info for HOA documents (budgets, rules, minutes, etc.)
- ⚡ **Fast** - Uses Gemini 1.5 Flash for quick responses
- 🔄 **Fallback** - If AI unavailable, falls back to PDF metadata → filename
- ✏️ **Editable** - Users can edit AI-generated descriptions before saving

## Setup Instructions

You only need **ONE** API key (either OpenAI or Gemini). The system will use whichever is available.

### Option A: OpenAI (Recommended if you already have a key)

**1. Get your OpenAI API Key:**

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in with your OpenAI account
3. Click **"+ Create new secret key"**
4. Give it a name (e.g., "HOA Portal")
5. Copy the key (starts with `sk-...`)

**2. Add to environment:**

```bash
export OPENAI_API_KEY="sk-your-key-here"
docker compose up -d
```

**Cost:**
- Model: GPT-4o-mini (fast and cheap)
- ~$0.00015 per document
- 100 uploads/month = **$0.015/month** (~1.5 cents)

### Option B: Google Gemini (Free tier available)

**1. Get a Gemini API Key:**

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"**
4. Click **"Create API key in new project"** (or use existing project)
5. Copy the API key (starts with `AIza...`)

**2. Add to environment:**

```bash
export GEMINI_API_KEY="AIza-your-key-here"
docker compose up -d
```

**Cost:**
- Model: Gemini 1.5 Flash
- ~$0.00008 per document
- 100 uploads/month = **$0.008/month** (~0.8 cents)
- **FREE tier:** 15 requests/minute

### Option C: Both APIs (Maximum Reliability)

Set both keys for automatic fallback:

```bash
export OPENAI_API_KEY="sk-your-key-here"
export GEMINI_API_KEY="AIza-your-key-here"
docker compose up -d
```

If OpenAI fails or hits rate limits, it automatically falls back to Gemini.

**For Production (GCP Cloud Run):**

```bash
# Store as secret
echo -n "your-api-key" | gcloud secrets create gemini-api-key --data-file=-

# Grant access
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:YOUR_PROJECT@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy with secret
gcloud run deploy hoa-portal \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest"
```

### 3. Verify It's Working

1. Log in as an admin
2. Go to `/admin/upload`
3. Select a PDF file
4. Watch the description field - should say "⏳ AI is reading your PDF..."
5. Description should auto-populate with AI-generated text

**Check the browser console** - it will log which method was used:
- `Description extracted using: openai` ✅ OpenAI working!
- `Description extracted using: gemini` ✅ Gemini working!
- `Description extracted using: metadata` ⚠️ Fallback to metadata
- `Description extracted using: filename` ⚠️ Fallback to filename

## How It Works

### Extraction Flow

```
1. User selects PDF
   ↓
2. Upload form sends PDF to /api/admin/extract-description
   ↓
3. Server tries extraction methods in order:

   Method 1: OpenAI GPT-4o-mini (if API key available)
   ├─ Extract text from PDF (first 10k chars)
   ├─ Send to OpenAI API
   ├─ AI reads content and generates description
   └─ Return AI-generated description

   Method 2: Gemini 1.5 Flash (if API key available)
   ├─ Extract text from PDF (first 10k chars)
   ├─ Send to Gemini API
   ├─ AI reads content and generates description
   └─ Return AI-generated description

   Method 3: PDF Metadata (fallback)
   ├─ Read PDF title and subject
   └─ Return metadata as description

   Method 4: Filename (last resort)
   └─ Clean up filename and use as description

   ↓
4. Description populates in form
   ↓
5. User can edit or keep as-is
   ↓
6. Upload to S3 with description
```

### Gemini Prompt

The AI receives this context:

```
You are analyzing a PDF document for a homeowners association (HOA) portal.

Document filename: 2024_Budget.pdf

Document content (first part):
[PDF text content here...]

Please provide a clear, concise 1-2 sentence description...
```

**Output examples:**
- `"Annual budget for 2024 detailing income, expenses, and capital reserves. Relevant to all residents."`
- `"HOA board meeting minutes from March 2024 covering parking policy updates and landscaping decisions."`
- `"Community rules and regulations updated for 2024, applicable to all Scarborough Glen residents."`

## Cost & Limits

### Google AI Studio (Free Tier)

- **Free** for testing and development
- **Rate limits**: 15 requests per minute
- **Model**: Gemini 1.5 Flash
- **Perfect for**: Small HOAs with occasional uploads

### Google Cloud (Production)

- **Pay-as-you-go** pricing
- **Gemini 1.5 Flash**: ~$0.075 per 1M input tokens
- **Estimated cost**: ~$0.0001 per document (<1 cent)
- **Rate limits**: 1000 requests per minute
- **Perfect for**: Production deployments

**Monthly cost estimate for HOA:**
- 100 documents uploaded per month
- ~10,000 tokens per document
- = 1M tokens total
- = **$0.08 per month** 🎉

## Troubleshooting

### Problem: Descriptions not AI-generated

**Check browser console:**
```javascript
// Should see:
Description extracted using: ai

// If you see:
Description extracted using: metadata  // AI not working
```

**Solution:**
1. Verify API key is set: `echo $GEMINI_API_KEY`
2. Check Docker logs: `docker compose logs app | grep -i gemini`
3. Verify key is valid at [Google AI Studio](https://aistudio.google.com/)

### Problem: "Gemini API error" in logs

**Common causes:**

1. **Invalid API key**
   ```bash
   # Test your key
   curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"test"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY"
   ```

2. **Rate limit exceeded**
   - Wait a minute and try again
   - Upgrade to paid tier if frequent uploads

3. **API not enabled**
   - Go to Google Cloud Console
   - Enable "Generative Language API"

### Problem: Slow extraction

**Normal behavior:**
- AI extraction takes 2-5 seconds (reading PDF + calling Gemini)
- Metadata extraction is instant (< 1 second)

**If taking >10 seconds:**
- Check network connection
- Verify proxy settings aren't blocking Google APIs
- Large PDFs (>100 pages) take longer to parse

## Privacy & Security

### What Gets Sent to Gemini

- ✅ **First 10,000 characters** of PDF text
- ✅ **Filename** for context
- ❌ **NOT** the full PDF file
- ❌ **NOT** any user information

### Data Retention

According to Google's policy:
- **API Studio (free)**: Prompts may be used to improve models
- **Cloud AI (paid)**: Data is NOT used for training (enterprise safe)

**For sensitive documents:**
- Set `GEMINI_API_KEY=""` (empty) to disable AI
- Falls back to metadata extraction
- Or don't upload sensitive docs to begin with

## Disabling AI Extraction

To disable Gemini and use only metadata/filename:

```bash
# Don't set GEMINI_API_KEY
unset GEMINI_API_KEY

# Or set it to empty
export GEMINI_API_KEY=""

# Restart
docker compose restart app
```

The system will automatically fall back to metadata extraction.

## Future Enhancements

- [ ] Support for other AI models (Claude, GPT-4)
- [ ] Document categorization (budget, rules, minutes, etc.)
- [ ] Tag extraction (parking, landscaping, budget, etc.)
- [ ] Multi-language descriptions
- [ ] Thumbnail generation
- [ ] Document similarity search

## Example API Response

```json
{
  "description": "Annual HOA budget for 2024-2025 fiscal year showing projected income of $125k and expenses breakdown for maintenance, reserves, and operations.",
  "method": "ai"
}
```

---

**🎉 With Gemini AI, your document descriptions are now smart, contextual, and helpful!**
