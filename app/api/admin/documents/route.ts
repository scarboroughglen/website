import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/documents - Get all documents (admin only)
 */
export async function GET() {
  // Check admin access
  const adminCheck = await requireAdmin()
  if (adminCheck) return adminCheck

  try {
    const documents = await prisma.document.findMany({
      orderBy: [
        { section: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      documents
    })
  } catch (error) {
    console.error('Fetch documents error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}
