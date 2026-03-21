import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, canAccessSection } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { threadId, content } = await request.json()

    if (!threadId || !content) {
      return NextResponse.json(
        { error: 'Thread ID and content are required' },
        { status: 400 }
      )
    }

    // Get the thread to check section access
    const thread = await prisma.thread.findUnique({
      where: { id: threadId }
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
        { error: 'You do not have access to this section' },
        { status: 403 }
      )
    }

    // Create the post
    const post = await prisma.post.create({
      data: {
        threadId,
        userId: user.id,
        content: content.trim(),
      },
    })

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
