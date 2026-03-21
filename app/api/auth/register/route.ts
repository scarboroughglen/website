import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { inviteCode, email } = await request.json()

    if (!inviteCode || !email) {
      return NextResponse.json(
        { error: 'Invite code and email are required' },
        { status: 400 }
      )
    }

    // Verify invite code
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

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Create user and mark invite as used
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        unitId: unit.id
      }
    })

    await prisma.unit.update({
      where: { id: unit.id },
      data: { inviteUsed: true }
    })

    // Generate magic link token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await prisma.magicToken.create({
      data: {
        email: user.email,
        token,
        expiresAt
      }
    })

    // TODO: Send email with magic link
    // For now, we'll just return success
    console.log(`Magic link for ${email}: http://localhost:3000/api/auth/verify?token=${token}`)

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
