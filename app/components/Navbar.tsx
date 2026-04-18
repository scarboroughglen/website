'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const isActive = (path: string) => pathname === path

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="container mx-auto px-4 flex items-center justify-between h-full">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-primary text-white px-3 py-1 rounded-tr-2xl rounded-bl-2xl text-lg font-bold">SG</span>
          <span className="text-white text-2xl font-medium">Scarborough Glen</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="site-nav">
          <ul className="flex items-center gap-0">
            <li className={isActive('/') ? 'active' : ''}>
              <Link href="/">Home</Link>
            </li>
            <li className={isActive('/for-sale') ? 'active' : ''}>
              <Link href="/for-sale">For Sale</Link>
            </li>
            <li className={isActive('/sales-history') ? 'active' : ''}>
              <Link href="/sales-history">Sales History</Link>
            </li>
            <li
              className={`dropdown ${pathname.startsWith('/forum') || pathname.startsWith('/documents') ? 'active' : ''}`}
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <a href="#" onClick={(e) => e.preventDefault()}>
                <span>Community</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
              <ul className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`}>
                <li><Link href="/forum" prefetch={false} onClick={() => setDropdownOpen(false)}>Forums</Link></li>
                <li><Link href="/documents" prefetch={false} onClick={() => setDropdownOpen(false)}>Documents</Link></li>
              </ul>
            </li>
            <li className={isActive('/login') || isActive('/dashboard') ? 'active' : ''}>
              <Link href="/login">Resident Portal</Link>
            </li>
          </ul>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Nav Drawer */}
      <nav className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        <ul>
          <li>
            <Link href="/" onClick={() => setMobileOpen(false)} className={isActive('/') ? 'active' : ''}>
              Home
            </Link>
          </li>
          <li>
            <Link href="/for-sale" onClick={() => setMobileOpen(false)} className={isActive('/for-sale') ? 'active' : ''}>
              For Sale
            </Link>
          </li>
          <li>
            <Link href="/sales-history" onClick={() => setMobileOpen(false)} className={isActive('/sales-history') ? 'active' : ''}>
              Sales History
            </Link>
          </li>
          <li>
            <button
              className="mobile-dropdown-toggle"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span>Community</span>
              <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <ul className="mobile-dropdown">
                <li>
                  <Link href="/forum" prefetch={false} onClick={() => setMobileOpen(false)}>Forums</Link>
                </li>
                <li>
                  <Link href="/documents" prefetch={false} onClick={() => setMobileOpen(false)}>Documents</Link>
                </li>
              </ul>
            )}
          </li>
          <li>
            <Link href="/login" onClick={() => setMobileOpen(false)} className={isActive('/login') ? 'active' : ''}>
              Resident Portal
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  )
}
