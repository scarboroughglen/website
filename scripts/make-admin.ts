#!/usr/bin/env tsx

/**
 * Make a user an administrator
 * Usage: npx tsx scripts/make-admin.ts user@example.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function makeAdmin(email: string) {
  try {
    console.log(`\n🔍 Looking for user: ${email}...`)

    const user = await prisma.user.findUnique({
      where: { email },
      include: { unit: true }
    })

    if (!user) {
      console.log(`\n❌ User not found: ${email}`)
      console.log('\n💡 Available users:')

      const allUsers = await prisma.user.findMany({
        include: { unit: true }
      })

      if (allUsers.length === 0) {
        console.log('  No users registered yet')
      } else {
        allUsers.forEach((u) => {
          console.log(`  • ${u.email} - ${u.unit.condo} Unit ${u.unit.unitNumber}${u.isAdmin ? ' (Admin)' : ''}`)
        })
      }

      process.exit(1)
    }

    if (user.isAdmin) {
      console.log(`\n✅ ${email} is already an administrator`)
      console.log(`   Unit: ${user.unit.condo} - ${user.unit.unitNumber}`)
      console.log('')
      process.exit(0)
    }

    // Make user admin
    await prisma.user.update({
      where: { email },
      data: { isAdmin: true }
    })

    console.log(`\n✅ Successfully granted admin access!`)
    console.log('')
    console.log(`👤 User: ${email}`)
    console.log(`🏠 Unit: ${user.unit.condo} - ${user.unit.unitNumber}`)
    console.log(`🔑 Status: Administrator`)
    console.log('')
    console.log(`They can now access:`)
    console.log(`  • /admin - Admin panel`)
    console.log(`  • /admin/upload - Upload documents`)
    console.log(`  • /admin/documents - Manage documents`)
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
  console.log('Usage: npx tsx scripts/make-admin.ts user@example.com\n')
  console.log('Example:')
  console.log('  docker compose exec app npx tsx scripts/make-admin.ts admin@scarboroughglen.com\n')
  process.exit(1)
}

makeAdmin(email)
