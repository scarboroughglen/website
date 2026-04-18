'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Document {
  id: string
  filename: string
  description: string | null
  section: string
  createdAt: string
}

export default function AdminDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/admin/documents')
      if (!response.ok) throw new Error('Failed to fetch documents')
      const data = await response.json()
      setDocuments(data.documents)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (doc: Document) => {
    setEditingId(doc.id)
    setEditDescription(doc.description || '')
  }

  const handleSave = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDescription })
      })

      if (!response.ok) throw new Error('Failed to update document')

      setDocuments(docs =>
        docs.map(doc =>
          doc.id === id ? { ...doc, description: editDescription } : doc
        )
      )
      setEditingId(null)
      setEditDescription('')
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/documents/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete document')

      setDocuments(docs => docs.filter(doc => doc.id !== id))
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <p className="text-[#9b9b9b]">Loading documents...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-accent text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold"><span className="text-primary">Manage</span> Documents</h1>
            <nav className="flex gap-6">
              <Link href="/dashboard" className="text-white hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/admin" className="text-white hover:text-primary transition-colors">Admin</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link href="/admin" className="text-primary hover:text-white transition-colors">
              &larr; Back to Admin Panel
            </Link>
            <h2 className="text-3xl font-bold text-white mt-2">Document Management</h2>
          </div>
          <Link href="/admin/upload" className="btn-primary">
            + Upload New Document
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600 text-red-300">
            {error}
          </div>
        )}

        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark border-b border-accent">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#9b9b9b]">Section</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#9b9b9b]">Filename</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#9b9b9b]">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#9b9b9b]">Uploaded</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[#9b9b9b]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-dark">
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium">
                        {doc.section}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-white">
                      {doc.filename}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#9b9b9b]">
                      {editingId === doc.id ? (
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-white text-black"
                          placeholder="Enter description..."
                        />
                      ) : (
                        <span className="italic">{doc.description || '(no description)'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#9b9b9b]">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {editingId === doc.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleSave(doc.id)}
                            className="text-green-400 hover:text-green-300 font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-[#9b9b9b] hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(doc)}
                            className="text-primary hover:text-white font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id, doc.filename)}
                            className="text-red-400 hover:text-red-300 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {documents.length === 0 && (
              <div className="text-center py-12 text-[#9b9b9b]">
                No documents uploaded yet.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-accent border-l-4 border-primary p-4">
          <h3 className="font-semibold text-white mb-2">Document Management</h3>
          <ul className="text-sm text-[#9b9b9b] space-y-1">
            <li>&bull; Click <strong className="text-white">Edit</strong> to update a document&apos;s description</li>
            <li>&bull; Click <strong className="text-white">Delete</strong> to permanently remove a document from storage</li>
            <li>&bull; Deleted documents cannot be recovered</li>
            <li>&bull; All downloads are logged in the audit trail</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
