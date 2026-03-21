/**
 * Admin authorization utilities
 */

import { getCurrentUser } from './auth'
import { NextResponse } from 'next/server'

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.isAdmin || false
}

/**
 * Require admin access - returns error response if not admin
 * Use in API routes like: const adminCheck = await requireAdmin(); if (adminCheck) return adminCheck;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized - Please log in' },
      { status: 401 }
    )
  }

  if (!user.isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden - Admin access required' },
      { status: 403 }
    )
  }

  return null
}
