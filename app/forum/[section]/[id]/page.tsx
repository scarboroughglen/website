'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Post {
  id: string
  content: string
  createdAt: string
  user: {
    email: string
    unit: {
      condo: string
      unitNumber: string
    }
  }
}

interface Thread {
  id: string
  title: string
  section: string
  createdAt: string
  posts: Post[]
}

export default function ThreadView({ params }: { params: { section: string; id: string } }) {
  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchThread()
  }, [params.id])

  const fetchThread = async () => {
    try {
      const response = await fetch(`/api/forum/thread/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to load thread')
      }
      const data = await response.json()
      setThread(data.thread)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/forum/create-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: params.id,
          content: replyContent,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to post reply')
      }

      setReplyContent('')
      fetchThread() // Reload thread
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">{error || 'Thread not found'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{thread.section} Forum</h1>
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
            ← Back to {thread.section} Forum
          </Link>
        </div>

        {/* Thread Title */}
        <div className="card mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{thread.title}</h2>
          <p className="text-sm text-gray-600">
            Started {new Date(thread.createdAt).toLocaleDateString()} • {thread.posts.length} {thread.posts.length === 1 ? 'post' : 'posts'}
          </p>
        </div>

        {/* Posts */}
        <div className="space-y-4 mb-8">
          {thread.posts.map((post, index) => (
            <div key={post.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{post.user.email}</p>
                  <p className="text-sm text-gray-600">
                    {post.user.unit.condo} - Unit {post.user.unit.unitNumber}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {index === 0 && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-2">Original Post</span>}
                  {new Date(post.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Form */}
        <div className="card max-w-3xl">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Post a Reply</h3>
          <form onSubmit={handleReply}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              required
              rows={6}
              maxLength={5000}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-y mb-2"
              placeholder="Write your reply..."
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">{replyContent.length}/5000 characters</p>
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
