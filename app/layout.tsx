import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scarborough Glen HOA Portal',
  description: 'Private resident portal for Scarborough Glen community',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
