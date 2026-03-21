import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function Dashboard() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Get recent threads for accessible sections
  const sections = ['HOA', user.unit.condo]
  const recentThreads = await prisma.thread.findMany({
    where: {
      section: { in: sections }
    },
    include: {
      posts: {
        take: 1,
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  // Get recent documents
  const recentDocuments = await prisma.document.findMany({
    where: {
      section: { in: sections }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Scarborough Glen HOA</h1>
              <p className="text-sm opacity-90">
                {user.unit.condo} - Unit {user.unit.unitNumber}
              </p>
            </div>
            <nav className="flex gap-4 items-center">
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
              <Link href="/forum" className="hover:underline">Forums</Link>
              <Link href="/documents" className="hover:underline">Documents</Link>
              {user.isAdmin && (
                <Link href="/admin" className="hover:underline">Admin</Link>
              )}
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="hover:underline">Logout</button>
              </form>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome, {user.email}</h2>
          <p className="text-gray-600">Your resident portal for Scarborough Glen community</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🏘️</div>
              <div>
                <p className="text-gray-600 text-sm">Your Unit</p>
                <p className="text-2xl font-bold text-primary">
                  {user.unit.condo} - {user.unit.unitNumber}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="text-4xl">💬</div>
              <div>
                <p className="text-gray-600 text-sm">Forum Access</p>
                <p className="text-lg font-semibold">HOA + {user.unit.condo}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="text-4xl">📁</div>
              <div>
                <p className="text-gray-600 text-sm">Documents</p>
                <p className="text-lg font-semibold">{recentDocuments.length} Available</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Forum Posts */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Forum Discussions</h3>
            {recentThreads.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No discussions yet</p>
            ) : (
              <div className="space-y-3">
                {recentThreads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/forum/${thread.section.toLowerCase()}/${thread.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">{thread.title}</p>
                        <p className="text-sm text-gray-600">
                          {thread.section} • {thread.posts.length} {thread.posts.length === 1 ? 'reply' : 'replies'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(thread.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Link href="/forum" className="btn-primary mt-4 block text-center">
              View All Forums
            </Link>
          </div>

          {/* Recent Documents */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Documents</h3>
            {recentDocuments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No documents yet</p>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">{doc.filename}</p>
                        <p className="text-sm text-gray-600">{doc.section}</p>
                      </div>
                      <a
                        href={`/api/documents/download/${doc.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/documents" className="btn-primary mt-4 block text-center">
              View All Documents
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
