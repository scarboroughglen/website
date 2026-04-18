import { getCurrentUser, canAccessSection } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { normalizeSectionName, getSectionDisplayName } from '@/lib/sections'

export default async function ForumSection({ params }: { params: { section: string } }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const sectionName = normalizeSectionName(params.section)
  const displayName = getSectionDisplayName(sectionName)

  // Check access
  const hasAccess = await canAccessSection(user.unit.condo, sectionName)

  if (!hasAccess) {
    redirect('/forum')
  }

  // Get threads for this section
  const threads = await prisma.thread.findMany({
    where: { section: sectionName },
    include: {
      posts: {
        take: 1,
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-accent text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold"><span className="text-primary">{displayName}</span> Forum</h1>
            <nav className="flex gap-6">
              <Link href="/dashboard" className="text-white hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/forum" className="text-white hover:text-primary transition-colors">Forums</Link>
              <Link href="/documents" className="text-white hover:text-primary transition-colors">Documents</Link>
              {user.isAdmin && (
                <Link href="/admin" className="text-white hover:text-primary transition-colors">Admin</Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/forum" className="text-primary hover:text-white mb-2 inline-block transition-colors">
              &larr; Back to Forums
            </Link>
            <h2 className="text-3xl font-bold text-white">{sectionName} Discussions</h2>
          </div>
          <Link href={`/forum/${params.section}/new`} className="btn-primary">
            New Thread
          </Link>
        </div>

        {threads.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-[#9b9b9b] mb-4">No discussions yet. Start one!</p>
            <Link href={`/forum/${params.section}/new`} className="btn-primary inline-block">
              Create First Thread
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/forum/${params.section}/${thread.id}`}
                className="card block hover:border-primary"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{thread.title}</h3>
                    <p className="text-sm text-[#9b9b9b]">
                      {thread.posts.length} {thread.posts.length === 1 ? 'reply' : 'replies'}
                      {' \u2022 '}
                      Started {new Date(thread.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-primary text-xl">&rarr;</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
