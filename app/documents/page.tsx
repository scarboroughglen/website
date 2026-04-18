import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function Documents() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Get documents for accessible sections
  const sections = ['HOA', user.unit.condo]
  const documents = await prisma.document.findMany({
    where: {
      section: { in: sections }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Group documents by section
  const groupedDocs = documents.reduce((acc, doc) => {
    if (!acc[doc.section]) {
      acc[doc.section] = []
    }
    acc[doc.section].push(doc)
    return acc
  }, {} as Record<string, typeof documents>)

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-accent text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold"><span className="text-primary">Documents</span></h1>
            <nav className="flex gap-6">
              <Link href="/dashboard" className="text-white hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/forum" className="text-white hover:text-primary transition-colors">Forums</Link>
              <Link href="/documents" className="text-primary font-medium">Documents</Link>
              {user.isAdmin && (
                <Link href="/admin" className="text-white hover:text-primary transition-colors">Admin</Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-primary hover:text-white mb-2 inline-block transition-colors">
            &larr; Back to Dashboard
          </Link>
          <h2 className="text-3xl font-bold text-white">Document Library</h2>
        </div>

        <div className="bg-accent border-l-4 border-primary p-4 mb-6">
          <p className="text-sm text-[#9b9b9b]">
            <strong className="text-white">Note:</strong> All downloaded PDFs are watermarked with your email and unit number for security.
          </p>
        </div>

        {Object.keys(groupedDocs).length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-[#9b9b9b]">No documents available yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedDocs).map(([section, docs]) => (
              <div key={section}>
                <h3 className="text-2xl font-bold text-white mb-4">{section}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {docs.map((doc) => (
                    <div key={doc.id} className="card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <img src="/images/icons/property.svg" alt="" className="w-8 h-8" />
                            <h4 className="font-semibold text-white">{doc.filename}</h4>
                          </div>
                          {doc.description && (
                            <p className="text-sm text-[#9b9b9b] mb-3 italic">
                              {doc.description}
                            </p>
                          )}
                          <p className="text-sm text-[#9b9b9b] mb-3">
                            Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                          <a
                            href={`/api/documents/download/${doc.id}`}
                            className="btn-primary text-sm inline-block"
                          >
                            Download (Watermarked)
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
