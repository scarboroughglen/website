import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, canAccessSection } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeSectionName } from '@/lib/sections'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { section, title, content } = await request.json()

    if (!section || !title || !content) {
      return NextResponse.json(
        { error: 'Section, title, and content are required' },
        { status: 400 }
      )
    }

    const normalizedSection = normalizeSectionName(section)

    // Check if user has access to this section
    const hasAccess = await canAccessSection(user.unit.condo, normalizedSection)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this section' },
        { status: 403 }
      )
    }

    // Create the thread
    const thread = await prisma.thread.create({
      data: {
        title: title.trim(),
        section: normalizedSection,
        userId: user.id,
      },
    })

    // Create the initial post
    await prisma.post.create({
      data: {
        threadId: thread.id,
        userId: user.id,
        content: content.trim(),
      },
    })

    return NextResponse.json({ thread })
  } catch (error) {
    console.error('Create thread error:', error)
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    )
  }
}
