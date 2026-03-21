import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home({
  searchParams,
}: {
  searchParams: { logout?: string }
}) {
  const user = await getCurrentUser()

  if (user) {
    redirect('/dashboard')
  }

  const showLogoutMessage = searchParams.logout === 'success'

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center text-white">
          {showLogoutMessage && (
            <div className="mb-6 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg">
              ✓ You&apos;ve been successfully logged out. See you next time!
            </div>
          )}
          <h1 className="text-5xl font-bold mb-6">
            Welcome to Scarborough Glen
          </h1>
          <h2 className="text-3xl mb-8">
            Homeowners Association Portal
          </h2>
          <p className="text-xl mb-12 opacity-90">
            A private community platform for residents to connect, share information, and stay informed.
          </p>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-semibold mb-4">Community Features</h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-white/10 p-6 rounded-lg">
                <div className="text-4xl mb-3">💬</div>
                <h4 className="font-semibold mb-2">Private Forums</h4>
                <p className="text-sm opacity-80">
                  Connect with neighbors in HOA-wide and condo-specific discussion forums
                </p>
              </div>
              <div className="bg-white/10 p-6 rounded-lg">
                <div className="text-4xl mb-3">📁</div>
                <h4 className="font-semibold mb-2">Secure Documents</h4>
                <p className="text-sm opacity-80">
                  Access important documents with personalized watermarking for security
                </p>
              </div>
              <div className="bg-white/10 p-6 rounded-lg">
                <div className="text-4xl mb-3">🔒</div>
                <h4 className="font-semibold mb-2">Invite-Only Access</h4>
                <p className="text-sm opacity-80">
                  Secure access limited to verified residents with unique invite codes
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Link href="/login" className="btn-primary">
              Resident Login
            </Link>
            <Link href="/invite" className="btn-secondary">
              New Resident? Sign Up
            </Link>
          </div>
        </div>
      </div>

      <footer className="text-center text-white/80 py-8">
        <p>&copy; 2024 Scarborough Glen HOA. All rights reserved.</p>
      </footer>
    </div>
  )
}
