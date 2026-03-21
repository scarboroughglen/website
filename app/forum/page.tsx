import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ForumIndex() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const sections = [
    { id: 'hoa', name: 'HOA', description: 'Community-wide discussions', accessible: true },
    { id: 'condo1', name: 'Condo 1', description: 'Private discussions for Condo 1', accessible: user.unit.condo === 'Condo1' },
    { id: 'condo2', name: 'Condo 2', description: 'Private discussions for Condo 2', accessible: user.unit.condo === 'Condo2' },
    { id: 'condo3', name: 'Condo 3', description: 'Private discussions for Condo 3', accessible: user.unit.condo === 'Condo3' },
    { id: 'condo4', name: 'Condo 4', description: 'Private discussions for Condo 4', accessible: user.unit.condo === 'Condo4' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Forums</h1>
            <nav className="flex gap-4">
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
              <Link href="/forum" className="hover:underline">Forums</Link>
              <Link href="/documents" className="hover:underline">Documents</Link>
              {user.isAdmin && (
                <Link href="/admin" className="hover:underline">Admin</Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Discussion Forums</h2>

        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`card ${section.accessible ? 'cursor-pointer hover:shadow-lg transition-shadow' : 'opacity-50'}`}
            >
              {section.accessible ? (
                <Link href={`/forum/${section.id}`} className="block">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-primary">{section.name}</h3>
                      <p className="text-gray-600">{section.description}</p>
                    </div>
                    <div className="text-primary">→</div>
                  </div>
                </Link>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-gray-400">{section.name}</h3>
                    <p className="text-gray-400">{section.description}</p>
                  </div>
                  <div className="text-gray-400">🔒</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
