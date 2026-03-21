# 🔒 Document Watermarking & Leak Tracing

## Overview

The HOA portal implements **multi-layer watermarking** on all downloaded PDFs to:
1. **Deter** unauthorized sharing (visible watermarks)
2. **Track** leaked documents back to the source (invisible forensic watermarks)
3. **Audit** all document access (comprehensive logging)

## Watermarking Layers

### Layer 1: Visible Watermarks (Deterrence)

**Purpose**: Make users aware that documents are tracked and discourage casual sharing.

1. **Footer Watermark** (on every page)
   - Text: `email@example.com | Condo1 - Unit 101 | Mar 20, 2026, 10:30:45 PM`
   - Color: Gray (50% opacity)
   - Size: 8pt
   - Location: Bottom of page (x: 50, y: 20)

2. **Diagonal Center Watermark** (on every page)
   - Same text as footer
   - Color: Light gray (30% opacity)
   - Size: 10pt
   - Rotation: -45°
   - Location: Center of page

### Layer 2: Invisible Forensic Watermarks (Tracking)

**Purpose**: Survive basic editing attempts and provide forensic evidence for leak tracing.

1. **PDF Metadata** (survives most editing)
   - Title: Original filename
   - Author: `Scarborough Glen HOA - Condo1 Unit 101`
   - Subject: `Downloaded by user@example.com on 2026-03-20T22:30:45.123Z`
   - Keywords: Tracking ID (base64), email, condo, unit, timestamp
   - Producer: `Scarborough Glen HOA Document Portal`
   - Creator: `User:<uuid>`

2. **Hidden Text Layers** (nearly invisible, extractable with forensics)
   - Top-left corner: Full tracking string
   - Top-right corner: Tracking ID
   - Bottom-right corner: User email + timestamp
   - Center (under visible watermark): Full tracking string
   - Color: White (rgb 1,1,1)
   - Opacity: 0.01 - 0.005 (nearly invisible)
   - Size: 4-6pt

3. **Tracking ID Format** (base64 encoded)
   ```
   Base64({userId}:{email}:{documentId}:{ISO timestamp})
   ```

### Layer 3: Database Audit Trail

Every download is logged in the `DownloadLog` table:

```sql
CREATE TABLE DownloadLog (
  id          UUID PRIMARY KEY,
  documentId  UUID,
  userId      UUID,
  userEmail   TEXT,
  trackingId  TEXT UNIQUE,  -- Base64 encoded
  ipAddress   TEXT,
  userAgent   TEXT,
  createdAt   TIMESTAMP
)
```

## How Watermarks Prevent Tampering

| Attack Method | Layer 1 (Visible) | Layer 2 (Invisible) | Layer 3 (Database) |
|---------------|-------------------|---------------------|-------------------|
| Delete visible text | ❌ Easily removed | ✅ Survives | ✅ Survives |
| Edit PDF in Acrobat | ❌ Easily removed | ⚠️ Metadata may survive | ✅ Survives |
| Print and re-scan | ❌ Removed | ❌ Removed | ✅ Survives |
| Extract text/pages | ❌ May be removed | ⚠️ Hidden text may remain | ✅ Survives |
| Convert to images | ✅ Burns in watermark | ❌ Removed | ✅ Survives |
| Metadata stripping tools | ✅ Survives | ❌ Removed | ✅ Survives |

**Key Insight**: No single layer is perfect, but the combination makes tampering difficult and often leaves forensic traces.

## Tracing Leaked Documents

### Step 1: Extract Watermark from Leaked PDF

```bash
# Extract metadata and tracking information
docker compose exec app npx tsx scripts/extract-watermark.ts /path/to/leaked.pdf
```

Output:
```
🔍 Extracting watermark data from PDF...

📋 PDF Metadata:
  Title: Meeting_Minutes_2024.pdf
  Author: Scarborough Glen HOA - Condo1 Unit 101
  Subject: Downloaded by user@example.com on 2026-03-20T22:30:45.123Z
  Keywords: dXNlci1pZDp1c2VyQGV4YW1wbGUuY29tOmRvYy1pZDoyMDI2LTAzLTIw,...
  Producer: Scarborough Glen HOA Document Portal
  Creator: User:abc-123-def-456

🎯 Extracted Tracking Information:
  Tracking ID: dXNlci1pZDp1c2VyQGV4YW1wbGUuY29tOmRvYy1pZDoyMDI2LTAzLTIw
  Decoded: user-id:user@example.com:doc-id:2026-03-20T22:30:45.123Z
```

### Step 2: Look Up in Database

```bash
# Trace the leak back to the source
docker compose exec app npx tsx scripts/trace-leak.ts <tracking-id>
```

Output:
```
🔍 Tracing leaked document...

✅ Download Record Found!

📄 Document Information:
  File: Meeting_Minutes_2024.pdf
  Section: Condo1
  Document ID: abc-123-def

👤 User Information:
  Email: user@example.com
  User ID: user-uuid

🌐 Download Details:
  Downloaded: 3/20/2026, 10:30:45 PM
  IP Address: 192.168.1.100
  User Agent: Mozilla/5.0...

🏠 Unit Information:
  Condo: Condo1
  Unit Number: 101
  Account Created: 3/15/2026, 9:00:00 AM

📊 User's Download History (3 other downloads):
  • Annual_Report_2023.pdf - 3/18/2026, 2:15:30 PM
  • Budget_2024.pdf - 3/19/2026, 11:45:20 AM
  • Bylaws.pdf - 3/20/2026, 10:25:15 PM

🎯 CONCLUSION:
  This document was downloaded by user@example.com
  from Condo1 Unit 101
  on 3/20/2026, 10:30:45 PM
```

### Step 3: Extract Hidden Text (Advanced)

If metadata is stripped, hidden text may still remain:

```bash
# Extract all text from PDF (including hidden layers)
pdftotext -layout leaked.pdf - | grep -E "TRACKING:|USER:"
```

Output:
```
TRACKING:dXNlci1pZDp1c2VyQGV4YW1wbGUuY29tOmRvYy1pZDoyMDI2LTAzLTIw|USER:user-uuid|EMAIL:user@example.com|UNIT:Condo1-101|DOC:abc-123|TIME:2026-03-20T22:30:45.123Z
USER:user@example.com|TIME:2026-03-20T22:30:45.123Z
```

## Security Best Practices

### For HOA Administrators

1. **Regular Audits**
   ```bash
   # Review recent downloads
   docker compose exec -T app npx prisma studio
   # Navigate to DownloadLog table
   ```

2. **Investigate Suspicious Activity**
   - Multiple downloads of same document
   - Downloads late at night or outside normal hours
   - Bulk downloads

3. **Respond to Leaks**
   - Use `trace-leak.ts` to identify source
   - Contact user directly
   - Review HOA policies on document sharing
   - Consider legal action if necessary

### For Residents

1. **Understand the System**
   - All downloads are watermarked with your identity
   - Sharing watermarked documents can be traced back to you
   - Audit logs are permanent

2. **Best Practices**
   - Only download documents you need
   - Do not share HOA documents outside the community
   - Delete downloaded PDFs when no longer needed
   - Contact HOA board if you need to share a document legitimately

## Technical Implementation

### Download Flow

```typescript
// app/api/documents/download/[id]/route.ts

1. Authenticate user
2. Check document access permissions
3. Fetch original PDF from S3
4. Generate tracking ID (base64 encoded)
5. Add visible watermarks (footer + diagonal)
6. Add invisible watermarks (metadata + hidden text)
7. Log download to database
8. Return watermarked PDF
```

### Tracking ID Generation

```typescript
const trackingId = Buffer.from(
  `${user.id}:${user.email}:${document.id}:${timestamp}`
).toString('base64')
```

### Database Logging

```typescript
await prisma.downloadLog.create({
  data: {
    documentId,
    userId,
    userEmail,
    trackingId,
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  }
})
```

## Limitations

### What Watermarks CAN'T Prevent

1. **Screenshots** - Users can screenshot pages (but watermark will be visible)
2. **Physical copies** - Print and photocopy (but watermark will be visible)
3. **Determined attackers** - Someone with PDF expertise can remove most watermarks
4. **Re-typing** - Manual transcription of content

### What Watermarks CAN Achieve

1. **Deterrence** - Most users won't share knowing it's traceable
2. **Forensics** - Track casual leaks (95%+ of cases)
3. **Evidence** - Provide proof for policy violations
4. **Audit trail** - Know who accessed what and when

## Compliance & Privacy

- ✅ Users are informed documents are watermarked (visible watermarks)
- ✅ Tracking is for security purposes only
- ✅ Download logs are kept confidential
- ✅ Only HOA board members can access audit logs
- ⚠️ Consider adding watermarking disclosure to Terms of Service

## Future Enhancements

- [ ] Email notifications on document downloads
- [ ] Bulk download alerts (>5 documents in 1 hour)
- [ ] Machine learning to detect suspicious patterns
- [ ] Integration with DLP (Data Loss Prevention) tools
- [ ] Steganography for even more tamper-resistant watermarks
- [ ] QR codes in watermarks linking to audit log

---

**Remember**: Watermarking is not about preventing all leaks—it's about creating a strong deterrent and enabling accountability.
