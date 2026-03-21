import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
    }

    // Find and validate token
    const magicToken = await prisma.magicToken.findUnique({
      where: { token }
    })

    if (!magicToken) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
    }

    if (magicToken.expiresAt < new Date()) {
      await prisma.magicToken.delete({ where: { id: magicToken.id } })
      return NextResponse.redirect(new URL('/login?error=expired_token', request.url))
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: magicToken.email }
    })

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=user_not_found', request.url))
    }

    // Delete used token
    await prisma.magicToken.delete({ where: { id: magicToken.id } })

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('Verify token error:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}
