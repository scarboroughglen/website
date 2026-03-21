import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email. Please sign up first.' },
        { status: 404 }
      )
    }

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
    // For now, log to console
    console.log(`Magic link for ${email}: http://localhost:3000/api/auth/verify?token=${token}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Request link error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
