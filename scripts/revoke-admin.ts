#!/usr/bin/env tsx

/**
 * Revoke administrator access from a user
 * Usage: npx tsx scripts/revoke-admin.ts user@example.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function revokeAdmin(email: string) {
  try {
    console.log(`\n🔍 Looking for user: ${email}...`)

    const user = await prisma.user.findUnique({
      where: { email },
      include: { unit: true }
    })

    if (!user) {
      console.log(`\n❌ User not found: ${email}\n`)
      process.exit(1)
    }

    if (!user.isAdmin) {
      console.log(`\n✅ ${email} is not an administrator`)
      console.log(`   Unit: ${user.unit.condo} - ${user.unit.unitNumber}`)
      console.log('')
      process.exit(0)
    }

    // Revoke admin
    await prisma.user.update({
      where: { email },
      data: { isAdmin: false }
    })

    console.log(`\n✅ Successfully revoked admin access!`)
    console.log('')
    console.log(`👤 User: ${email}`)
    console.log(`🏠 Unit: ${user.unit.condo} - ${user.unit.unitNumber}`)
    console.log(`🔑 Status: Regular User`)
    console.log('')

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const email = process.argv[2]

if (!email) {
  console.error('\n❌ Error: Email required\n')
  console.log('Usage: npx tsx scripts/revoke-admin.ts user@example.com\n')
  process.exit(1)
}

revokeAdmin(email)
