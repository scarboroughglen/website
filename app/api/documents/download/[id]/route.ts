import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getFile, getBucketName } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: params.id }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check access
    const sections = ['HOA', user.unit.condo]
    if (!sections.includes(document.section)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Read the PDF file from MinIO
    const bucketName = getBucketName(document.section)
    const pdfBytes = await getFile(bucketName, document.filepath)

    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Generate unique tracking ID for forensic purposes
    const timestamp = new Date().toISOString()
    const trackingId = Buffer.from(
      `${user.id}:${user.email}:${document.id}:${timestamp}`
    ).toString('base64')

    // Add visible watermark text
    const visibleWatermark = `${user.email} | ${user.unit.condo} - Unit ${user.unit.unitNumber} | ${new Date().toLocaleString()}`

    // Add invisible forensic watermark (for tracing)
    const invisibleWatermark = `TRACKING:${trackingId}|USER:${user.id}|EMAIL:${user.email}|UNIT:${user.unit.condo}-${user.unit.unitNumber}|DOC:${document.id}|TIME:${timestamp}`

    // Set PDF metadata (invisible watermark #1)
    pdfDoc.setTitle(document.filename)
    pdfDoc.setAuthor(`Scarborough Glen HOA - ${user.unit.condo} Unit ${user.unit.unitNumber}`)
    pdfDoc.setSubject(`Downloaded by ${user.email} on ${timestamp}`)
    pdfDoc.setKeywords([
      trackingId,
      user.email,
      user.unit.condo,
      `Unit-${user.unit.unitNumber}`,
      timestamp
    ])
    pdfDoc.setProducer('Scarborough Glen HOA Document Portal')
    pdfDoc.setCreator(`User:${user.id}`)

    for (const page of pages) {
      const { width, height } = page.getSize()

      // VISIBLE WATERMARKS

      // 1. Footer watermark (visible)
      page.drawText(visibleWatermark, {
        x: 50,
        y: 20,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.5,
      })

      // 2. Diagonal watermark in center (visible)
      const textWidth = font.widthOfTextAtSize(visibleWatermark, 10)
      page.drawText(visibleWatermark, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: 10,
        font: font,
        color: rgb(0.9, 0.9, 0.9),
        opacity: 0.3,
        rotate: {
          angle: -45,
          type: 'degrees' as any
        }
      })

      // INVISIBLE WATERMARKS (forensic tracking)

      // 3. Hidden text in corners (white text on white - invisible but extractable)
      const hiddenTextSize = 6

      // Top-left corner
      page.drawText(invisibleWatermark, {
        x: 5,
        y: height - 10,
        size: hiddenTextSize,
        font: font,
        color: rgb(1, 1, 1), // White text
        opacity: 0.01, // Nearly invisible
      })

      // Top-right corner
      page.drawText(trackingId, {
        x: width - 200,
        y: height - 10,
        size: hiddenTextSize,
        font: font,
        color: rgb(1, 1, 1),
        opacity: 0.01,
      })

      // Bottom-right corner (redundant tracking)
      page.drawText(`USER:${user.email}|TIME:${timestamp}`, {
        x: width - 250,
        y: 5,
        size: hiddenTextSize,
        font: font,
        color: rgb(1, 1, 1),
        opacity: 0.01,
      })

      // 4. Hidden text in center (under visible watermark)
      page.drawText(invisibleWatermark, {
        x: width / 2 - 200,
        y: height / 2 + 50,
        size: 4,
        font: font,
        color: rgb(1, 1, 1),
        opacity: 0.005,
      })
    }

    // Log download in database for forensic tracking
    await prisma.downloadLog.create({
      data: {
        documentId: document.id,
        userId: user.id,
        userEmail: user.email,
        trackingId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    })

    // Log download for audit trail
    console.log(`[DOWNLOAD AUDIT] Doc: ${document.id} | User: ${user.email} | Tracking: ${trackingId} | Time: ${timestamp}`)

    // Save the watermarked PDF
    const watermarkedPdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(watermarkedPdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${document.filename}"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    )
  }
}
