#!/usr/bin/env tsx

/**
 * Trace a leaked document back to the source user
 * Usage: npx tsx scripts/trace-leak.ts <tracking-id>
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function traceLeak(trackingId: string) {
  try {
    console.log('\n🔍 Tracing leaked document...\n')
    console.log(`Tracking ID: ${trackingId}\n`)

    // Decode tracking ID
    try {
      const decoded = Buffer.from(trackingId, 'base64').toString('utf-8')
      console.log('📋 Decoded Tracking Information:')
      const parts = decoded.split(':')
      parts.forEach((part, i) => {
        console.log(`  [${i}] ${part}`)
      })
      console.log('')
    } catch {
      console.log('⚠️  Warning: Could not decode tracking ID as base64\n')
    }

    // Look up in database
    const downloadLog = await prisma.downloadLog.findUnique({
      where: { trackingId },
      include: {
        document: true,
      }
    })

    if (!downloadLog) {
      console.log('❌ No download record found for this tracking ID\n')
      console.log('This could mean:')
      console.log('  1. The tracking ID is invalid or corrupted')
      console.log('  2. The download happened before audit logging was enabled')
      console.log('  3. The database has been reset\n')
      process.exit(1)
    }

    console.log('✅ Download Record Found!\n')
    console.log('📄 Document Information:')
    console.log(`  File: ${downloadLog.document.filename}`)
    console.log(`  Section: ${downloadLog.document.section}`)
    console.log(`  Document ID: ${downloadLog.document.id}`)
    console.log('')

    console.log('👤 User Information:')
    console.log(`  Email: ${downloadLog.userEmail}`)
    console.log(`  User ID: ${downloadLog.userId}`)
    console.log('')

    console.log('🌐 Download Details:')
    console.log(`  Downloaded: ${downloadLog.createdAt.toLocaleString()}`)
    console.log(`  IP Address: ${downloadLog.ipAddress || 'Unknown'}`)
    console.log(`  User Agent: ${downloadLog.userAgent || 'Unknown'}`)
    console.log('')

    // Get user's full information
    const user = await prisma.user.findUnique({
      where: { id: downloadLog.userId },
      include: { unit: true }
    })

    if (user) {
      console.log('🏠 Unit Information:')
      console.log(`  Condo: ${user.unit.condo}`)
      console.log(`  Unit Number: ${user.unit.unitNumber}`)
      console.log(`  Account Created: ${user.createdAt.toLocaleString()}`)
      console.log('')
    }

    // Check if this user has downloaded other documents
    const otherDownloads = await prisma.downloadLog.findMany({
      where: {
        userId: downloadLog.userId,
        id: { not: downloadLog.id }
      },
      include: { document: true },
      orderBy: { createdAt: 'desc' }
    })

    if (otherDownloads.length > 0) {
      console.log(`📊 User's Download History (${otherDownloads.length} other downloads):`)
      otherDownloads.slice(0, 5).forEach((dl) => {
        console.log(`  • ${dl.document.filename} - ${dl.createdAt.toLocaleString()}`)
      })
      if (otherDownloads.length > 5) {
        console.log(`  ... and ${otherDownloads.length - 5} more`)
      }
      console.log('')
    }

    console.log('🎯 CONCLUSION:')
    console.log(`  This document was downloaded by ${downloadLog.userEmail}`)
    console.log(`  from ${user?.unit.condo} Unit ${user?.unit.unitNumber}`)
    console.log(`  on ${downloadLog.createdAt.toLocaleString()}`)
    console.log('')

  } catch (error) {
    console.error('❌ Error tracing leak:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const trackingId = process.argv[2]

if (!trackingId) {
  console.error('\n❌ Error: Tracking ID required\n')
  console.log('Usage: npx tsx scripts/trace-leak.ts <tracking-id>\n')
  console.log('To extract tracking ID from a PDF:')
  console.log('  npx tsx scripts/extract-watermark.ts /path/to/leaked.pdf\n')
  process.exit(1)
}

traceLeak(trackingId)
