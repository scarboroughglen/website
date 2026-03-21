'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { normalizeSectionName, getSectionDisplayName } from '@/lib/sections'

export default function NewThread({ params }: { params: { section: string } }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sectionName = normalizeSectionName(params.section)
  const displayName = getSectionDisplayName(sectionName)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/forum/create-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: sectionName,
          title,
          content,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create thread')
      }

      // Redirect to the new thread
      router.push(`/forum/${params.section}/${data.thread.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Create New Thread</h1>
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
          <Link href={`/forum/${params.section}`} className="text-primary hover:underline">
            ← Back to {displayName} Forum
          </Link>
          <h2 className="text-3xl font-bold text-gray-800 mt-2">New Discussion Thread</h2>
          <p className="text-gray-600">Section: {displayName}</p>
        </div>

        <div className="card max-w-3xl">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Thread Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter a descriptive title for your thread"
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
            </div>

            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Initial Post *
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={10}
                maxLength={5000}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                placeholder="Start the conversation..."
              />
              <p className="text-xs text-gray-500 mt-1">{content.length}/5000 characters</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !title.trim() || !content.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Thread'}
              </button>
              <Link
                href={`/forum/${params.section}`}
                className="btn-secondary"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-6 max-w-3xl bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Community Guidelines</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be respectful and courteous to fellow residents</li>
            <li>• Keep discussions relevant to the community</li>
            <li>• No personal attacks or harassment</li>
            <li>• Protect privacy - don&apos;t share personal information</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
