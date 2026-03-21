'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send login link')
      }

      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-primary mb-6 text-center">
          Resident Login
        </h1>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <p className="text-gray-600 mb-6 text-center">
              Enter your email to receive a magic login link
            </p>

            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="your.email@example.com"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-semibold mb-4">Check Your Email</h2>
            <p className="text-gray-600 mb-6">
              We&apos;ve sent a login link to <strong>{email}</strong>. Click the link in the email to sign in.
            </p>
            <p className="text-sm text-gray-500">
              The link expires in 15 minutes.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-primary hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            New resident?{' '}
            <Link href="/invite" className="text-primary hover:underline font-medium">
              Sign up with invite code
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
