#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function showCodes() {
  const units = await prisma.unit.findMany({
    orderBy: [
      { condo: 'asc' },
      { unitNumber: 'asc' }
    ],
    include: {
      users: {
        select: {
          email: true
        }
      }
    }
  })

  console.log('\n🎟️  Invite Codes from Database:\n')

  let currentCondo = ''

  for (const unit of units) {
    if (unit.condo !== currentCondo) {
      if (currentCondo) console.log('')
      console.log(`${unit.condo}:`)
      currentCondo = unit.condo
    }

    const status = unit.inviteUsed
      ? `❌ USED by ${unit.users[0]?.email || 'unknown'}`
      : '✅ Available'

    console.log(`  Unit ${unit.unitNumber.padEnd(4)}  ${unit.inviteCode.padEnd(20)}  ${status}`)
  }

  console.log('')

  await prisma.$disconnect()
}

showCodes().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
