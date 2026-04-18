'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'

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
    <div className="min-h-screen bg-secondary">
      <Navbar />
      <div className="flex items-center justify-center p-4 pt-32 min-h-screen">
      <div className="bg-accent p-8 max-w-md w-full border border-accent hover:border-primary transition-colors">
        <h1 className="text-3xl font-bold text-primary mb-6 text-center">
          Resident Login
        </h1>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <p className="text-[#9b9b9b] mb-6 text-center">
              Enter your email to receive a magic login link
            </p>

            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-white text-black focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="your.email@example.com"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-600 text-red-300 text-sm">
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
            <div className="text-primary text-5xl mb-4">&#10003;</div>
            <h2 className="text-2xl font-semibold text-white mb-4">Check Your Email</h2>
            <p className="text-[#9b9b9b] mb-6">
              We&apos;ve sent a login link to <strong className="text-white">{email}</strong>. Click the link in the email to sign in.
            </p>
            <p className="text-sm text-[#9b9b9b]">
              The link expires in 15 minutes.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-primary hover:text-white text-sm transition-colors">
            &larr; Back to Home
          </Link>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-[#9b9b9b]">
            New resident?{' '}
            <Link href="/invite" className="text-primary hover:text-white font-medium transition-colors">
              Sign up with invite code
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}
