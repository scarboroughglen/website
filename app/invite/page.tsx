'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/app/components/Navbar'

function InviteForm() {
  const searchParams = useSearchParams()
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '')
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'code' | 'email' | 'success'>('code')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unitInfo, setUnitInfo] = useState<any>(null)

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid invite code')
      }

      setUnitInfo(data.unit)
      setStep('email')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setStep('success')
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
          Resident Sign Up
        </h1>

        {step === 'code' && (
          <form onSubmit={handleVerifyCode}>
            <p className="text-[#9b9b9b] mb-6 text-center">
              Enter your unique invite code to get started
            </p>

            <div className="mb-6">
              <label htmlFor="code" className="block text-sm font-medium text-white mb-2">
                Invite Code
              </label>
              <input
                type="text"
                id="code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                className="w-full px-4 py-3 bg-white border border-white text-black focus:ring-2 focus:ring-primary focus:border-transparent uppercase"
                placeholder="SG-C1-101-2024"
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
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        )}

        {step === 'email' && (
          <form onSubmit={handleSubmitEmail}>
            <div className="mb-6 p-4 bg-primary/20 border border-primary">
              <p className="text-sm text-white">
                <strong>Unit:</strong> {unitInfo.condo} - {unitInfo.unitNumber}
              </p>
            </div>

            <p className="text-[#9b9b9b] mb-6 text-center">
              Enter your email address to complete registration
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
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="text-center">
            <div className="text-primary text-5xl mb-4">&#10003;</div>
            <h2 className="text-2xl font-semibold text-white mb-4">Welcome to Scarborough Glen!</h2>
            <p className="text-[#9b9b9b] mb-6">
              Your account has been created. We&apos;ve sent a login link to <strong className="text-white">{email}</strong>.
            </p>
            <Link href="/login" className="btn-primary inline-block">
              Go to Login
            </Link>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-primary hover:text-white text-sm transition-colors">
            &larr; Back to Home
          </Link>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-[#9b9b9b]">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-white font-medium transition-colors">
              Login
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}

export default function Invite() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-secondary flex items-center justify-center"><div className="text-white text-xl">Loading...</div></div>}>
      <InviteForm />
    </Suspense>
  )
}
