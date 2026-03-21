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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading documents...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Manage Documents</h1>
            <nav className="flex gap-4">
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
              <Link href="/admin" className="hover:underline">Admin</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Link href="/admin" className="text-primary hover:underline">
              ← Back to Admin Panel
            </Link>
            <h2 className="text-3xl font-bold text-gray-800 mt-2">Document Management</h2>
          </div>
          <Link href="/admin/upload" className="btn-primary">
            + Upload New Document
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Section</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Filename</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Uploaded</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {doc.section}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      📄 {doc.filename}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {editingId === doc.id ? (
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          placeholder="Enter description..."
                        />
                      ) : (
                        <span className="italic">{doc.description || '(no description)'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {editingId === doc.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleSave(doc.id)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(doc)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id, doc.filename)}
                            className="text-red-600 hover:text-red-800 font-medium"
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
              <div className="text-center py-12 text-gray-500">
                No documents uploaded yet.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Document Management</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Click <strong>Edit</strong> to update a document&apos;s description</li>
            <li>• Click <strong>Delete</strong> to permanently remove a document from storage</li>
            <li>• Deleted documents cannot be recovered</li>
            <li>• All downloads are logged in the audit trail</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
