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
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-accent text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">
                <span className="text-primary">Scarborough Glen</span> HOA
              </h1>
              <p className="text-sm text-[#9b9b9b]">
                {user.unit.condo} - Unit {user.unit.unitNumber}
              </p>
            </div>
            <nav className="flex gap-6 items-center">
              <Link href="/dashboard" className="text-primary font-medium">Dashboard</Link>
              <Link href="/forum" className="text-white hover:text-primary transition-colors">Forums</Link>
              <Link href="/documents" className="text-white hover:text-primary transition-colors">Documents</Link>
              {user.isAdmin && (
                <Link href="/admin" className="text-white hover:text-primary transition-colors">Admin</Link>
              )}
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="text-white hover:text-primary transition-colors">Logout</button>
              </form>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome, {user.email}</h2>
          <p className="text-[#9b9b9b]">Your resident portal for Scarborough Glen community</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16">
                <img src="/images/icons/house.svg" alt="" className="w-full h-full" />
              </div>
              <div>
                <p className="text-[#9b9b9b] text-sm">Your Unit</p>
                <p className="text-2xl font-bold text-primary">
                  {user.unit.condo} - {user.unit.unitNumber}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16">
                <img src="/images/icons/care.svg" alt="" className="w-full h-full" />
              </div>
              <div>
                <p className="text-[#9b9b9b] text-sm">Forum Access</p>
                <p className="text-lg font-semibold text-white">HOA + {user.unit.condo}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16">
                <img src="/images/icons/property.svg" alt="" className="w-full h-full" />
              </div>
              <div>
                <p className="text-[#9b9b9b] text-sm">Documents</p>
                <p className="text-lg font-semibold text-white">{recentDocuments.length} Available</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Forum Posts */}
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-4">Recent Forum Discussions</h3>
            {recentThreads.length === 0 ? (
              <p className="text-[#9b9b9b] text-center py-8">No discussions yet</p>
            ) : (
              <div className="space-y-3">
                {recentThreads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/forum/${thread.section.toLowerCase()}/${thread.id}`}
                    className="block p-3 bg-secondary hover:bg-dark transition-colors border border-secondary hover:border-primary"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-white">{thread.title}</p>
                        <p className="text-sm text-[#9b9b9b]">
                          {thread.section} &bull; {thread.posts.length} {thread.posts.length === 1 ? 'reply' : 'replies'}
                        </p>
                      </div>
                      <span className="text-xs text-[#9b9b9b]">
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
            <h3 className="text-xl font-bold text-white mb-4">Recent Documents</h3>
            {recentDocuments.length === 0 ? (
              <p className="text-[#9b9b9b] text-center py-8">No documents yet</p>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-secondary border border-secondary"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-white">{doc.filename}</p>
                        <p className="text-sm text-[#9b9b9b]">{doc.section}</p>
                      </div>
                      <a
                        href={`/api/documents/download/${doc.id}`}
                        className="text-primary hover:text-white text-sm transition-colors"
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
