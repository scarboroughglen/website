import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { deleteFile, getBucketName } from '@/lib/storage'

/**
 * PATCH /api/admin/documents/[id] - Update document description
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin access
  const adminCheck = await requireAdmin()
  if (adminCheck) return adminCheck

  try {
    const { description } = await request.json()

    // Update document
    const document = await prisma.document.update({
      where: { id: params.id },
      data: { description }
    })

    return NextResponse.json({
      success: true,
      document
    })
  } catch (error) {
    console.error('Update document error:', error)
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/documents/[id] - Delete document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin access
  const adminCheck = await requireAdmin()
  if (adminCheck) return adminCheck

  try {
    // Get document info
    const document = await prisma.document.findUnique({
      where: { id: params.id }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete from storage
    const bucketName = getBucketName(document.section)
    await deleteFile(bucketName, document.filepath)

    // Delete from database (cascade will delete download logs)
    await prisma.document.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
