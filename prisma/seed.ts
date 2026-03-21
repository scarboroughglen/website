import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed units for Scarborough Glen
  const units = [
    // HOA Units (accessible to all)
    // Condo 1 Units
    { condo: 'Condo1', unitNumber: '101', inviteCode: 'SG-C1-101-2024' },
    { condo: 'Condo1', unitNumber: '102', inviteCode: 'SG-C1-102-2024' },
    { condo: 'Condo1', unitNumber: '103', inviteCode: 'SG-C1-103-2024' },
    { condo: 'Condo1', unitNumber: '104', inviteCode: 'SG-C1-104-2024' },
    // Condo 2 Units
    { condo: 'Condo2', unitNumber: '201', inviteCode: 'SG-C2-201-2024' },
    { condo: 'Condo2', unitNumber: '202', inviteCode: 'SG-C2-202-2024' },
    { condo: 'Condo2', unitNumber: '203', inviteCode: 'SG-C2-203-2024' },
    { condo: 'Condo2', unitNumber: '204', inviteCode: 'SG-C2-204-2024' },
    // Condo 3 Units
    { condo: 'Condo3', unitNumber: '301', inviteCode: 'SG-C3-301-2024' },
    { condo: 'Condo3', unitNumber: '302', inviteCode: 'SG-C3-302-2024' },
    { condo: 'Condo3', unitNumber: '303', inviteCode: 'SG-C3-303-2024' },
    { condo: 'Condo3', unitNumber: '304', inviteCode: 'SG-C3-304-2024' },
    // Condo 4 Units
    { condo: 'Condo4', unitNumber: '401', inviteCode: 'SG-C4-401-2024' },
    { condo: 'Condo4', unitNumber: '402', inviteCode: 'SG-C4-402-2024' },
    { condo: 'Condo4', unitNumber: '403', inviteCode: 'SG-C4-403-2024' },
    { condo: 'Condo4', unitNumber: '404', inviteCode: 'SG-C4-404-2024' },
  ]

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { inviteCode: unit.inviteCode },
      update: {},
      create: unit,
    })
  }

  console.log('✅ Database seeded with units')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
