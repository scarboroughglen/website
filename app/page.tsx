import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/app/components/Navbar'

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
    <div className="min-h-screen bg-secondary relative">
      <Navbar />

      {/* Hero Section with Background Image */}
      <div className="relative min-h-screen flex flex-col">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-bg.jpg"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center pt-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center text-white">
              {showLogoutMessage && (
                <div className="mb-6 bg-primary text-white px-6 py-4 shadow-lg">
                  You&apos;ve been successfully logged out. See you next time!
                </div>
              )}
              <h2 className="text-5xl font-bold mb-6">
                Welcome to <br /><span className="text-primary">Scarborough Glen</span>
              </h2>
              <h3 className="text-2xl mb-4 font-light">
                Homeowners Association Portal
              </h3>
              <p className="text-lg mb-12 text-white/80">
                A private community platform for residents to connect, share information, and stay informed.
              </p>

              <div className="flex gap-4 justify-center mb-16">
                <Link href="/login" className="btn-primary text-lg">
                  Resident Login
                </Link>
                <Link href="/invite" className="btn-secondary text-lg">
                  New Resident? Sign Up
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="relative z-10 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="card">
                  <div className="text-primary text-4xl mb-4">
                    <img src="/images/icons/care.svg" alt="" className="w-16 h-16" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Private Forums</h4>
                  <p className="text-[#9b9b9b]">
                    Connect with neighbors in HOA-wide and condo-specific discussion forums
                  </p>
                </div>
                <div className="card">
                  <div className="text-primary text-4xl mb-4">
                    <img src="/images/icons/property.svg" alt="" className="w-16 h-16" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Secure Documents</h4>
                  <p className="text-[#9b9b9b]">
                    Access important documents with personalized watermarking for security
                  </p>
                </div>
                <div className="card">
                  <div className="text-primary text-4xl mb-4">
                    <img src="/images/icons/inspection.svg" alt="" className="w-16 h-16" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Invite-Only Access</h4>
                  <p className="text-[#9b9b9b]">
                    Secure access limited to verified residents with unique invite codes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-primary py-6">
        <div className="container mx-auto px-4 text-center text-white">
          <p>&copy; 2024 Scarborough Glen HOA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
