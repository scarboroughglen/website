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
    <div className="min-h-screen bg-secondary">
      <header className="bg-accent text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold"><span className="text-primary">Forums</span></h1>
            <nav className="flex gap-6">
              <Link href="/dashboard" className="text-white hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/forum" className="text-primary font-medium">Forums</Link>
              <Link href="/documents" className="text-white hover:text-primary transition-colors">Documents</Link>
              {user.isAdmin && (
                <Link href="/admin" className="text-white hover:text-primary transition-colors">Admin</Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-white mb-6">Discussion Forums</h2>

        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`card ${section.accessible ? 'cursor-pointer hover:border-primary' : 'opacity-50'}`}
            >
              {section.accessible ? (
                <Link href={`/forum/${section.id}`} className="block">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-primary">{section.name}</h3>
                      <p className="text-[#9b9b9b]">{section.description}</p>
                    </div>
                    <div className="text-primary text-xl">&rarr;</div>
                  </div>
                </Link>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-[#9b9b9b]">{section.name}</h3>
                    <p className="text-[#9b9b9b]">{section.description}</p>
                  </div>
                  <div className="text-[#9b9b9b]">Locked</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
