import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { inviteCode } = await request.json()

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    const unit = await prisma.unit.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() }
    })

    if (!unit) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    if (unit.inviteUsed) {
      return NextResponse.json(
        { error: 'This invite code has already been used' },
        { status: 400 }
      )
    }

    return NextResponse.json({ unit })
  } catch (error) {
    console.error('Verify invite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
