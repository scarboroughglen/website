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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Documents</h1>
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
        <div className="mb-6">
          <Link href="/dashboard" className="text-primary hover:underline mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h2 className="text-3xl font-bold text-gray-800">Document Library</h2>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> All downloaded PDFs are watermarked with your email and unit number for security.
          </p>
        </div>

        {Object.keys(groupedDocs).length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No documents available yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedDocs).map(([section, docs]) => (
              <div key={section}>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{section}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {docs.map((doc) => (
                    <div key={doc.id} className="card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">📄</span>
                            <h4 className="font-semibold text-gray-800">{doc.filename}</h4>
                          </div>
                          {doc.description && (
                            <p className="text-sm text-gray-700 mb-3 italic">
                              {doc.description}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 mb-3">
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
