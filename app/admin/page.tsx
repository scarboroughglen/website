import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPanel() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Check admin access
  if (!user.isAdmin) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-accent text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold"><span className="text-primary">Admin</span> Panel</h1>
            <nav className="flex gap-6">
              <Link href="/dashboard" className="text-white hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/forum" className="text-white hover:text-primary transition-colors">Forums</Link>
              <Link href="/documents" className="text-white hover:text-primary transition-colors">Documents</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-primary hover:text-white transition-colors">
            &larr; Back to Dashboard
          </Link>
          <h2 className="text-3xl font-bold text-white mt-2">Administration</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/admin/upload" className="card hover:border-primary cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16">
                <img src="/images/icons/sale.svg" alt="" className="w-full h-full" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary">Upload Documents</h3>
                <p className="text-[#9b9b9b]">Upload PDFs to HOA or Condo sections</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/documents" className="card hover:border-primary cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16">
                <img src="/images/icons/property.svg" alt="" className="w-full h-full" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary">Manage Documents</h3>
                <p className="text-[#9b9b9b]">Edit descriptions and delete documents</p>
              </div>
            </div>
          </Link>

          <div className="card opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16">
                <img src="/images/icons/agent.svg" alt="" className="w-full h-full" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#9b9b9b]">Manage Users</h3>
                <p className="text-[#9b9b9b]">Coming soon...</p>
              </div>
            </div>
          </div>

          <div className="card opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16">
                <img src="/images/icons/inspection.svg" alt="" className="w-full h-full" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#9b9b9b]">Download Audit</h3>
                <p className="text-[#9b9b9b]">Coming soon...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-accent border-l-4 border-primary p-4">
          <p className="text-sm text-[#9b9b9b]">
            <strong className="text-white">Admin Access:</strong> You&apos;re logged in as an administrator. Use the tools above to manage the HOA portal.
          </p>
        </div>
      </main>
    </div>
  )
}
