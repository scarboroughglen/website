import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import pdfParse from 'pdf-parse'
import { PDFDocument } from 'pdf-lib'

/**
 * POST /api/admin/extract-description
 * Extract a smart description from a PDF using AI (OpenAI or Gemini)
 */
export async function POST(request: NextRequest) {
  // Check admin access
  const adminCheck = await requireAdmin()
  if (adminCheck) return adminCheck

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    console.log(`\n=== PDF Description Extraction Started ===`)
    console.log(`File: ${file.name}`)
    console.log(`Size: ${(file.size / 1024).toFixed(2)} KB`)
    console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Not set'}`)
    console.log(`Gemini API Key: ${process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Not set'}`)

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Strategy 1: Try OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      console.log('→ Attempting OpenAI extraction...')
      try {
        const aiDescription = await extractWithOpenAI(buffer, file.name)
        if (aiDescription) {
          console.log(`✓ OpenAI extraction successful: "${aiDescription.slice(0, 50)}..."`)
          console.log(`=== Extraction Complete ===\n`)
          return NextResponse.json({
            description: aiDescription,
            method: 'openai'
          })
        }
        console.log('✗ OpenAI returned empty description')
      } catch (error: any) {
        console.error('✗ OpenAI extraction failed:', error.message || error)
        if (error.response) {
          console.error('  API Response:', error.response.status, error.response.statusText)
          console.error('  Error details:', error.response.data)
        }
      }
    } else {
      console.log('→ Skipping OpenAI (no API key)')
    }

    // Strategy 2: Try Gemini AI if API key is available
    if (process.env.GEMINI_API_KEY) {
      console.log('→ Attempting Gemini extraction...')
      try {
        const aiDescription = await extractWithGemini(buffer, file.name)
        if (aiDescription) {
          console.log(`✓ Gemini extraction successful: "${aiDescription.slice(0, 50)}..."`)
          console.log(`=== Extraction Complete ===\n`)
          return NextResponse.json({
            description: aiDescription,
            method: 'gemini'
          })
        }
        console.log('✗ Gemini returned empty description')
      } catch (error: any) {
        console.error('✗ Gemini extraction failed:', error.message || error)
      }
    } else {
      console.log('→ Skipping Gemini (no API key)')
    }

    // Strategy 3: Fallback to metadata
    console.log('→ Attempting metadata extraction...')
    const metadataDescription = await extractFromMetadata(buffer)
    if (metadataDescription) {
      console.log(`✓ Metadata extraction successful: "${metadataDescription.slice(0, 50)}..."`)
      console.log(`=== Extraction Complete (fallback) ===\n`)
      return NextResponse.json({
        description: metadataDescription,
        method: 'metadata'
      })
    }
    console.log('✗ No metadata found in PDF')

    // Strategy 4: Fallback to filename
    console.log('→ Using filename as last resort...')
    const filename = file.name.replace(/\.pdf$/i, '').replace(/_/g, ' ')
    console.log(`✓ Using filename: "${filename}"`)
    console.log(`⚠️  RECOMMENDATION: Set OPENAI_API_KEY or GEMINI_API_KEY for AI-generated descriptions`)
    console.log(`=== Extraction Complete (filename fallback) ===\n`)
    return NextResponse.json({
      description: filename,
      method: 'filename'
    })

  } catch (error: any) {
    console.error('✗ Extract description error:', error.message || error)
    console.error('=== Extraction Failed ===\n')
    return NextResponse.json(
      { error: 'Failed to extract description' },
      { status: 500 }
    )
  }
}

async function extractWithOpenAI(pdfBuffer: Buffer, filename: string): Promise<string | null> {
  try {
    // Extract text from PDF
    console.log('  Parsing PDF to extract text...')
    const pdfData = await pdfParse(pdfBuffer)
    const text = pdfData.text.slice(0, 10000) // First 10k chars to stay within limits
    console.log(`  Extracted ${text.length} characters from PDF`)

    if (!text || text.trim().length < 50) {
      console.log('  ✗ Not enough text in PDF (< 50 chars)')
      return null
    }
    console.log(`  ✓ Sufficient text found, sending to OpenAI...`)

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      timeout: 30000, // 30 second timeout
    })

    const prompt = `You are analyzing a PDF document for a homeowners association (HOA) portal.

Document filename: ${filename}

Document content (first part):
${text}

Please provide a clear, concise 1-2 sentence description of what this document is about. Focus on:
- The main purpose or topic of the document
- Key information it contains
- Who it's relevant to (all residents, specific condo, board members, etc.)

Keep it under 150 characters and make it helpful for residents browsing documents.`

    console.log('  Making OpenAI API request...')
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cheap model
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise document descriptions for HOA portals.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    })

    console.log('  OpenAI API responded successfully')
    const description = completion.choices[0]?.message?.content?.trim()

    if (!description) {
      console.log('  ✗ OpenAI returned empty description')
      return null
    }

    console.log(`  Raw response: "${description.slice(0, 100)}..."`)

    // Clean up the response
    const cleaned = description
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/^Description:\s*/i, '') // Remove "Description:" prefix
      .slice(0, 500) // Limit length

    return cleaned

  } catch (error: any) {
    console.error('  ✗ OpenAI API error:', error.message || error)
    if (error.code) console.error('  Error code:', error.code)
    if (error.status) console.error('  HTTP status:', error.status)
    if (error.type) console.error('  Error type:', error.type)
    throw error
  }
}

async function extractWithGemini(pdfBuffer: Buffer, filename: string): Promise<string | null> {
  try {
    // Extract text from PDF
    console.log('  Parsing PDF to extract text...')
    const pdfData = await pdfParse(pdfBuffer)
    const text = pdfData.text.slice(0, 10000) // First 10k chars to stay within limits
    console.log(`  Extracted ${text.length} characters from PDF`)

    if (!text || text.trim().length < 50) {
      console.log('  ✗ Not enough text in PDF (< 50 chars)')
      return null
    }
    console.log(`  ✓ Sufficient text found, sending to Gemini...`)

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are analyzing a PDF document for a homeowners association (HOA) portal.

Document filename: ${filename}

Document content (first part):
${text}

Please provide a clear, concise 1-2 sentence description of what this document is about. Focus on:
- The main purpose or topic of the document
- Key information it contains
- Who it's relevant to (all residents, specific condo, board members, etc.)

Keep it under 150 characters and make it helpful for residents browsing documents.

Description:`

    const result = await model.generateContent(prompt)
    const response = result.response
    const description = response.text().trim()

    // Clean up the response
    const cleaned = description
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/^Description:\s*/i, '') // Remove "Description:" prefix
      .slice(0, 500) // Limit length

    return cleaned

  } catch (error) {
    console.error('Gemini API error:', error)
    return null
  }
}

async function extractFromMetadata(pdfBuffer: Buffer): Promise<string | null> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer)

    const title = pdfDoc.getTitle()
    const subject = pdfDoc.getSubject()

    if (title && subject && title !== subject) {
      return `${title} - ${subject}`.slice(0, 500)
    }

    if (title && title.trim().length > 0) {
      return title.slice(0, 500)
    }

    if (subject && subject.trim().length > 0) {
      return subject.slice(0, 500)
    }

    return null
  } catch (error) {
    console.error('Metadata extraction error:', error)
    return null
  }
}
