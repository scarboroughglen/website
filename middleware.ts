import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const userId = request.cookies.get('userId')?.value
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/invite', '/for-sale', '/sales-history', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Redirect to login if accessing protected route without auth
  if (!userId && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect to dashboard if accessing login while authenticated
  // Note: Allow /invite access even when authenticated (user may want to view invite info)
  if (userId && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
}
