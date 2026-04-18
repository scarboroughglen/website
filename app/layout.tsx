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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-secondary text-white">{children}</body>
    </html>
  )
}
