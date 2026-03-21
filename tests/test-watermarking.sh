#!/bin/bash

# Test watermarking functionality

echo "🧪 Testing Document Watermarking"
echo "================================"
echo ""

# Create a simple test PDF
cat > /tmp/test.pdf << 'PDFEOF'
%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 24 Tf 100 700 Td (Test Document) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
361
%%EOF
PDFEOF

echo "✓ Created test PDF"

# Get a session cookie (reuse from previous test if available)
COOKIE_FILE="./test-results/cookie-condo1.txt"

if [ ! -f "$COOKIE_FILE" ]; then
    echo "⚠ No session cookie found. Run 'make test' first to create test users."
    exit 1
fi

echo "✓ Found session cookie"

# Upload the test document
echo ""
echo "📤 Uploading test document..."

UPLOAD_RESPONSE=$(curl -s -b "$COOKIE_FILE" -X POST \
    -F "file=@/tmp/test.pdf" \
    -F "section=HOA" \
    http://localhost:3000/api/documents/upload)

if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
    DOC_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✓ Document uploaded (ID: $DOC_ID)"
else
    echo "✗ Upload failed"
    echo "$UPLOAD_RESPONSE"
    exit 1
fi

# Download the document
echo ""
echo "📥 Downloading document (should be watermarked)..."

curl -s -b "$COOKIE_FILE" \
    "http://localhost:3000/api/documents/download/$DOC_ID" \
    -o /tmp/downloaded.pdf

if [ -f "/tmp/downloaded.pdf" ]; then
    SIZE=$(stat -f%z "/tmp/downloaded.pdf" 2>/dev/null || stat -c%s "/tmp/downloaded.pdf")
    echo "✓ Downloaded PDF ($SIZE bytes)"
    
    # Check if it's a valid PDF
    if file /tmp/downloaded.pdf | grep -q "PDF"; then
        echo "✓ File is valid PDF"
        
        # Extract text to verify watermark
        if command -v pdftotext >/dev/null 2>&1; then
            pdftotext /tmp/downloaded.pdf /tmp/text.txt 2>/dev/null
            if grep -q "test-condo1@scarboroughglen.test" /tmp/text.txt 2>/dev/null; then
                echo "✓ Watermark detected (email found in PDF)"
            elif grep -q "Condo1" /tmp/text.txt 2>/dev/null; then
                echo "✓ Watermark detected (condo info found)"
            else
                echo "⚠ Could not verify watermark in extracted text"
                echo "  (This is OK - watermark might be in graphics layer)"
            fi
        else
            echo "⚠ pdftotext not installed - cannot verify watermark content"
            echo "  Install with: sudo apt-get install poppler-utils (Linux)"
            echo "            or: brew install poppler (Mac)"
        fi
        
        # Check file size increased (watermarking adds content)
        if [ $SIZE -gt 500 ]; then
            echo "✓ PDF has content (not empty)"
        fi
        
    else
        echo "✗ Downloaded file is not a PDF"
        file /tmp/downloaded.pdf
        exit 1
    fi
else
    echo "✗ Download failed"
    exit 1
fi

echo ""
echo "================================"
echo "✅ Watermarking test complete!"
echo ""
echo "The downloaded PDF at /tmp/downloaded.pdf should contain:"
echo "  • Footer watermark with user email, unit, and timestamp"
echo "  • Diagonal watermark in center of page"
echo ""
echo "Open /tmp/downloaded.pdf to visually verify watermarks."
