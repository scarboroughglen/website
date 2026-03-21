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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <nav className="flex gap-4">
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
              <Link href="/forum" className="hover:underline">Forums</Link>
              <Link href="/documents" className="hover:underline">Documents</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-primary hover:underline">
            ← Back to Dashboard
          </Link>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">Administration</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/admin/upload" className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📤</div>
              <div>
                <h3 className="text-xl font-bold text-primary">Upload Documents</h3>
                <p className="text-gray-600">Upload PDFs to HOA or Condo sections</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/documents" className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📁</div>
              <div>
                <h3 className="text-xl font-bold text-primary">Manage Documents</h3>
                <p className="text-gray-600">Edit descriptions and delete documents</p>
              </div>
            </div>
          </Link>

          <div className="card opacity-50">
            <div className="flex items-center gap-4">
              <div className="text-5xl">👥</div>
              <div>
                <h3 className="text-xl font-bold text-gray-400">Manage Users</h3>
                <p className="text-gray-500">Coming soon...</p>
              </div>
            </div>
          </div>

          <div className="card opacity-50">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📊</div>
              <div>
                <h3 className="text-xl font-bold text-gray-400">Download Audit</h3>
                <p className="text-gray-500">Coming soon...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>👤 Admin Access:</strong> You&apos;re logged in as an administrator. Use the tools above to manage the HOA portal.
          </p>
        </div>
      </main>
    </div>
  )
}
