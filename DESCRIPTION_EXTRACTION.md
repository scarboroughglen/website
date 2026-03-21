# 📝 Document Description Extraction

## Overview

The HOA portal automatically extracts descriptions from uploaded PDFs to make documents easier to find and understand. Descriptions are displayed in the document library alongside filenames.

## How It Works

When you upload a PDF, the system tries three strategies in order:

### 1. Manual Description (Highest Priority)
If you enter a description in the upload form, it's used directly.

**Example:**
```
Description: Annual budget breakdown for 2024 with line items for maintenance and repairs
```

### 2. PDF Metadata Extraction (Automatic Fallback)
If no manual description is provided, the system reads the PDF's built-in metadata:

- **Title**: Document title set by the creator
- **Subject**: Subject/description set by the creator

**Example PDF Metadata:**
```javascript
{
  title: "2024 Annual Budget Report",
  subject: "Financial overview and budget allocations for the fiscal year"
}
```

**Result:** `"2024 Annual Budget Report - Financial overview and budget allocations for the fiscal year"`

### 3. Text Extraction (Secondary Fallback)
If metadata is empty, the system extracts the first few meaningful lines of text from the PDF:

**Example PDF Content:**
```
SCARBOROUGH GLEN HOA
Annual Meeting Minutes
March 15, 2024

The annual meeting was held at the community center...
```

**Result:** `"SCARBOROUGH GLEN HOA Annual Meeting Minutes March 15, 2024"`

### 4. No Description
If all extraction methods fail, the document is saved without a description (filename only).

## Implementation

### Upload Form

Located at `/admin/upload`, the form now includes an optional description field:

```tsx
<textarea
  id="description"
  placeholder="Brief description of the document (or leave blank to auto-extract)"
  rows={3}
/>
```

**User Flow:**
1. Select section (HOA, Condo1-4)
2. Choose PDF file
3. **(Optional)** Enter manual description
4. Click "Upload Document"

If description is left blank:
- System tries to extract from PDF metadata
- Falls back to text extraction if metadata is empty
- Document is saved with or without description

### Document Display

Descriptions appear in the document library (`/documents`) in italics below the filename:

```
📄 2024_Budget_Report.pdf
   "Annual budget breakdown for 2024 with line items for maintenance and repairs"
   Uploaded March 20, 2024
   [Download (Watermarked)]
```

## Technical Details

### PDF Metadata Extraction

Uses `pdf-lib` to read PDF metadata fields:

```typescript
const pdfDoc = await PDFDocument.load(pdfBuffer)
const title = pdfDoc.getTitle()
const subject = pdfDoc.getSubject()
```

### Text Extraction

Uses `pdf-parse` to extract all text content:

```typescript
const data = await pdfParse(pdfBuffer)
const lines = data.text
  .split('\n')
  .filter(line => line.length > 20)  // Skip headers/page numbers
  .slice(0, 3)  // Take first 3 meaningful lines
```

### Validation

Extracted descriptions are validated to ensure quality:

- **Minimum length**: 10 characters
- **Must contain letters**: Not just numbers
- **Number ratio**: < 50% numbers (filters out page numbers)
- **Maximum length**: 500 characters (truncated with "...")

## Database Schema

```prisma
model Document {
  id          String   @id @default(uuid())
  filename    String
  description String?  // Optional - auto-extracted or manual
  section     String
  filepath    String
  createdAt   DateTime @default(now())
  downloads   DownloadLog[]
}
```

## API Endpoint

**POST** `/api/documents/upload`

**Form Data:**
- `file`: PDF file (required)
- `section`: HOA | Condo1 | Condo2 | Condo3 | Condo4 (required)
- `description`: Manual description (optional)

**Processing:**
```typescript
1. Check for manual description
2. If empty, extract from PDF metadata
3. If still empty, extract from PDF text
4. Upload to S3 storage
5. Save to database with description (or null)
```

## Best Practices

### For Administrators

**When to Provide Manual Descriptions:**
- ✅ PDF has poor/missing metadata
- ✅ Extracted text is confusing
- ✅ You want to add context (e.g., "Approved version" vs "Draft")
- ✅ Document requires specific keywords for searchability

**When to Use Auto-Extraction:**
- ✅ PDF has good metadata (professionally created documents)
- ✅ Bulk uploads where manual entry is time-consuming
- ✅ Internal documents with clear titles

### For PDF Creators

To ensure good auto-extraction, when creating PDFs:

**In Microsoft Word:**
1. File → Properties
2. Fill in "Title" and "Subject"
3. Save as PDF

**In Adobe Acrobat:**
1. File → Properties
2. Description tab
3. Fill in "Title" and "Subject"
4. Save

**In Google Docs:**
1. File → Download → PDF
2. (Metadata from document title is automatic)

## Examples

### Example 1: Good Metadata
```
Filename: meeting_minutes.pdf
Metadata:
  Title: "Board Meeting Minutes - January 2024"
  Subject: "Discussion of parking issues and landscaping budget"

Result: "Board Meeting Minutes - January 2024 - Discussion of parking issues and landscaping budget"
```

### Example 2: No Metadata, Text Extraction
```
Filename: rules.pdf
Metadata: (empty)
First lines:
  "COMMUNITY RULES AND REGULATIONS"
  "Updated March 2024"
  "Section 1: Parking Guidelines - All residents must..."

Result: "COMMUNITY RULES AND REGULATIONS Updated March 2024 Section 1: Parking Guidelines - All residents must..."
(truncated to 500 chars)
```

### Example 3: Manual Override
```
Filename: insurance_policy_v2_final_APPROVED.pdf
Manual description: "Approved insurance policy for 2024-2025, effective April 1st"

Result: "Approved insurance policy for 2024-2025, effective April 1st"
(Ignores metadata and text extraction)
```

### Example 4: No Description Available
```
Filename: scan_20240320.pdf
Metadata: (empty)
Text: (scanned image, no extractable text)
Manual: (not provided)

Result: (null)
Display: Only shows filename
```

## Future Enhancements

- [ ] AI-powered description generation using LLM
- [ ] Search functionality using descriptions
- [ ] Tag extraction from descriptions
- [ ] Multi-language support
- [ ] OCR for scanned documents
- [ ] Automatic categorization based on description
- [ ] Description editing after upload

---

**Tip:** For best results, encourage document creators to fill in PDF metadata before uploading, or provide manual descriptions for important documents.
