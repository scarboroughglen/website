/**
 * PDF utility functions for description extraction
 */

import { PDFDocument } from 'pdf-lib'
import pdfParse from 'pdf-parse'

/**
 * Extract a description from a PDF using multiple strategies:
 * 1. PDF metadata (title + subject)
 * 2. First paragraph of text
 * 3. Fallback to empty string
 */
export async function extractPdfDescription(pdfBuffer: Buffer): Promise<string | null> {
  try {
    // Strategy 1: Try PDF metadata first (fastest)
    const metadata = await extractPdfMetadata(pdfBuffer)
    if (metadata) {
      return metadata
    }

    // Strategy 2: Extract text and get first paragraph
    const textDescription = await extractTextDescription(pdfBuffer)
    if (textDescription) {
      return textDescription
    }

    return null
  } catch (error) {
    console.error('Error extracting PDF description:', error)
    return null
  }
}

/**
 * Extract description from PDF metadata (title and/or subject)
 */
async function extractPdfMetadata(pdfBuffer: Buffer): Promise<string | null> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer)

    const title = pdfDoc.getTitle()
    const subject = pdfDoc.getSubject()

    // Combine title and subject if both exist
    if (title && subject && title !== subject) {
      return `${title} - ${subject}`.slice(0, 500)
    }

    // Use title if available
    if (title && title.trim().length > 0) {
      return title.slice(0, 500)
    }

    // Use subject if available
    if (subject && subject.trim().length > 0) {
      return subject.slice(0, 500)
    }

    return null
  } catch (error) {
    console.error('Error extracting PDF metadata:', error)
    return null
  }
}

/**
 * Extract first meaningful paragraph from PDF text
 */
async function extractTextDescription(pdfBuffer: Buffer): Promise<string | null> {
  try {
    const data = await pdfParse(pdfBuffer)

    if (!data.text || data.text.trim().length === 0) {
      return null
    }

    // Split into lines and clean up
    const lines = data.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 20) // Skip very short lines (headers, page numbers)

    if (lines.length === 0) {
      return null
    }

    // Take first 2-3 meaningful lines
    const description = lines.slice(0, 3).join(' ')

    // Truncate to reasonable length (500 chars)
    if (description.length > 500) {
      return description.slice(0, 497) + '...'
    }

    return description
  } catch (error) {
    console.error('Error extracting PDF text:', error)
    return null
  }
}

/**
 * Validate if text looks like a reasonable description
 * (not just random characters or page numbers)
 */
function isValidDescription(text: string): boolean {
  // Must have at least 10 characters
  if (text.length < 10) return false

  // Must contain some letters (not just numbers)
  if (!/[a-zA-Z]/.test(text)) return false

  // Must not be mostly numbers
  const numberCount = (text.match(/\d/g) || []).length
  if (numberCount / text.length > 0.5) return false

  return true
}
