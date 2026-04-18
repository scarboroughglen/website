'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ALL_SECTIONS } from '@/lib/sections'

export default function UploadDocument() {
  const [file, setFile] = useState<File | null>(null)
  const [section, setSection] = useState('HOA')
  const [description, setDescription] = useState('')
  const [extractionMethod, setExtractionMethod] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const extractPdfDescription = async (file: File): Promise<string> => {
    try {
      setExtracting(true)

      // Call API to extract description using AI
      const formData = new FormData()
      formData.append('file', file)

      console.log('Calling AI extraction API...')

      // Add timeout to prevent hanging forever
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

      const response = await fetch('/api/admin/extract-description', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to extract description')
      }

      const data = await response.json()

      // Log which method was used for transparency
      console.log(`Description extracted using: ${data.method}`)

      // Save the extraction method to show appropriate message
      setExtractionMethod(data.method)

      return data.description

    } catch (error: any) {
      console.error('Error extracting PDF description:', error)

      // Show different messages for different error types
      if (error.name === 'AbortError') {
        console.error('AI extraction timed out after 60 seconds')
      }

      // Fallback to filename
      setExtractionMethod('filename')
      return file.name.replace(/\.pdf$/i, '').replace(/_/g, ' ')
    } finally {
      setExtracting(false)
    }
  }

  const handleFileChange = async (selectedFile: File | null) => {
    setFile(selectedFile)

    if (selectedFile) {
      // Auto-extract description
      const extractedDesc = await extractPdfDescription(selectedFile)
      setDescription(extractedDesc)
    } else {
      setDescription('')
      setExtractionMethod('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setError('')
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('section', section)
      if (description.trim()) {
        formData.append('description', description.trim())
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setSuccess(true)
      setFile(null)
      setDescription('')
      setExtractionMethod('')
      // Reset file input
      const fileInput = document.getElementById('file') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-accent text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold"><span className="text-primary">Upload</span> Document</h1>
            <nav className="flex gap-6">
              <Link href="/dashboard" className="text-white hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/admin" className="text-white hover:text-primary transition-colors">Admin</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-primary hover:text-white transition-colors">
            &larr; Back to Admin Panel
          </Link>
          <h2 className="text-3xl font-bold text-white mt-2">Upload Document</h2>
        </div>

        <div className="card max-w-2xl">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="section" className="block text-sm font-medium text-white mb-2">
                Section *
              </label>
              <select
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-white text-black focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {ALL_SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'HOA' ? 'HOA' : s.replace(/(\d+)/, ' $1')}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#9b9b9b] mt-1">
                Select which section can access this document
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="file" className="block text-sm font-medium text-white mb-2">
                PDF File *
              </label>
              <input
                type="file"
                id="file"
                accept=".pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 bg-white border border-white text-black focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={extracting}
              />
              <p className="text-xs text-[#9b9b9b] mt-1">
                Only PDF files are accepted
              </p>
            </div>

            {file && (
              <div className="mb-6 p-4 bg-dark border border-accent">
                <p className="text-sm text-white">
                  <strong>Selected file:</strong> {file.name}
                </p>
                <p className="text-xs text-[#9b9b9b]">
                  Size: {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
                Description {extracting && <span className="text-primary">(Auto-extracting...)</span>}
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-white text-black focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Description will be auto-extracted when you select a PDF..."
                disabled={extracting}
              />
              <p className="text-xs text-[#9b9b9b] mt-1">
                {extracting ? (
                  <span className="text-primary">AI is reading your PDF and generating a smart description...</span>
                ) : file && extractionMethod ? (
                  extractionMethod === 'openai' || extractionMethod === 'gemini' ? (
                    <span className="text-green-400">
                      AI-generated description using {extractionMethod === 'openai' ? 'OpenAI' : 'Gemini'}. Feel free to edit or leave as-is.
                    </span>
                  ) : (
                    <span className="text-yellow-400">
                      Auto-generated from {extractionMethod === 'metadata' ? 'PDF metadata' : 'filename'} (AI not available). Feel free to edit.
                    </span>
                  )
                ) : (
                  'Description will be automatically generated using AI when you select a PDF file'
                )}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-600 text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-primary/20 border border-primary text-white">
                Document uploaded successfully! It will be available to {section} members with watermarking.
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={uploading || !file}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
              <Link href="/admin" className="btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-6 max-w-2xl bg-accent border-l-4 border-primary p-4">
          <h3 className="font-semibold text-white mb-2">Smart Upload Features</h3>
          <ul className="text-sm text-[#9b9b9b] space-y-1">
            <li>&bull; <strong className="text-white">AI Descriptions:</strong> OpenAI or Gemini reads your PDF and generates helpful descriptions automatically</li>
            <li>&bull; <strong className="text-white">Editable:</strong> Review and edit any auto-generated description before uploading</li>
            <li>&bull; <strong className="text-white">Fallback:</strong> If AI is unavailable, extracts from PDF metadata or filename (clearly labeled)</li>
            <li>&bull; <strong className="text-white">Setup:</strong> Set <code className="bg-dark px-1">OPENAI_API_KEY</code> or <code className="bg-dark px-1">GEMINI_API_KEY</code> to enable AI</li>
            <li>&bull; <strong className="text-white">S3 Storage:</strong> Files stored in section-specific buckets (HOA, Condo1-4)</li>
            <li>&bull; <strong className="text-white">Watermarking:</strong> All downloads are watermarked with user info</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
