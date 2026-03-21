import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { uploadFile, getBucketName } from '@/lib/storage'
import { normalizeSectionName } from '@/lib/sections'
import { extractPdfDescription } from '@/lib/pdf-utils'

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const adminCheck = await requireAdmin()
    if (adminCheck) return adminCheck

    const formData = await request.formData()
    const file = formData.get('file') as File
    const section = formData.get('section') as string
    const manualDescription = formData.get('description') as string | null

    if (!file || !section) {
      return NextResponse.json(
        { error: 'File and section are required' },
        { status: 400 }
      )
    }

    const normalizedSection = normalizeSectionName(section)

    // Validate section
    const validSections = ['HOA', 'Condo1', 'Condo2', 'Condo3', 'Condo4']
    if (!validSections.includes(normalizedSection)) {
      return NextResponse.json(
        { error: 'Invalid section' },
        { status: 400 }
      )
    }

    // Only accept PDFs
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${sanitizedName}`

    // Extract description from PDF (if not manually provided)
    let description = manualDescription
    if (!description) {
      try {
        description = await extractPdfDescription(buffer)
      } catch (error) {
        console.error('Failed to extract PDF description:', error)
        // Continue without description - it's optional
      }
    }

    // Upload to storage
    const bucketName = getBucketName(normalizedSection)
    await uploadFile(bucketName, fileName, buffer, 'application/pdf')

    // Save metadata to database
    const document = await prisma.document.create({
      data: {
        filename: file.name,
        description: description || null,
        section: normalizedSection,
        filepath: fileName,
      },
    })

    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}
