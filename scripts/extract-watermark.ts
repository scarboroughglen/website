#!/usr/bin/env tsx

/**
 * Extract invisible watermarks from a downloaded PDF
 * Usage: npx tsx scripts/extract-watermark.ts /path/to/downloaded.pdf
 */

import { PDFDocument } from 'pdf-lib'
import { readFileSync } from 'fs'

async function extractWatermark(filePath: string) {
  try {
    console.log('\n🔍 Extracting watermark data from PDF...\n')

    const pdfBytes = readFileSync(filePath)
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // Extract metadata (invisible watermark #1)
    console.log('📋 PDF Metadata:')
    console.log(`  Title: ${pdfDoc.getTitle() || 'N/A'}`)
    console.log(`  Author: ${pdfDoc.getAuthor() || 'N/A'}`)
    console.log(`  Subject: ${pdfDoc.getSubject() || 'N/A'}`)
    console.log(`  Keywords: ${pdfDoc.getKeywords() || 'N/A'}`)
    console.log(`  Producer: ${pdfDoc.getProducer() || 'N/A'}`)
    console.log(`  Creator: ${pdfDoc.getCreator() || 'N/A'}`)
    console.log(`  Creation Date: ${pdfDoc.getCreationDate() || 'N/A'}`)
    console.log(`  Modification Date: ${pdfDoc.getModificationDate() || 'N/A'}`)

    // Extract keywords to get tracking ID
    const keywords = pdfDoc.getKeywords()
    if (keywords) {
      console.log('\n🎯 Extracted Tracking Information:')
      const parts = keywords.split(',')
      parts.forEach((part) => {
        const trimmed = part.trim()
        if (trimmed.length > 20) {
          // Likely the base64 tracking ID
          try {
            const decoded = Buffer.from(trimmed, 'base64').toString('utf-8')
            console.log(`  Tracking ID: ${trimmed}`)
            console.log(`  Decoded: ${decoded}`)
          } catch {
            console.log(`  ${trimmed}`)
          }
        } else {
          console.log(`  ${trimmed}`)
        }
      })
    }

    // Extract text from first page to look for hidden watermarks
    console.log('\n🔎 Analyzing page content for hidden watermarks...')
    const pages = pdfDoc.getPages()
    console.log(`  Total pages: ${pages.length}`)

    // Note: pdf-lib doesn't support text extraction directly
    // In production, you'd use a library like pdf-parse or pdfjs-dist
    console.log('\n💡 To extract hidden text watermarks:')
    console.log('  1. Use: pdftotext -layout document.pdf -')
    console.log('  2. Or: Use Adobe Acrobat "Search" feature')
    console.log('  3. Search for: "TRACKING:" or "USER:" to find hidden text')

    console.log('\n✅ Metadata extraction complete\n')
  } catch (error) {
    console.error('❌ Error extracting watermark:', error)
    process.exit(1)
  }
}

const filePath = process.argv[2]

if (!filePath) {
  console.error('Usage: npx tsx scripts/extract-watermark.ts /path/to/downloaded.pdf')
  process.exit(1)
}

extractWatermark(filePath)
