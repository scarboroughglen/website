import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, canAccessSection } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const thread = await prisma.thread.findUnique({
      where: { id: params.id },
      include: {
        posts: {
          include: {
            user: {
              include: {
                unit: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this section
    const hasAccess = await canAccessSection(user.unit.condo, thread.section)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ thread })
  } catch (error) {
    console.error('Get thread error:', error)
    return NextResponse.json(
      { error: 'Failed to load thread' },
      { status: 500 }
    )
  }
}
