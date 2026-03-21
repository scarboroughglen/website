import { cookies } from 'next/headers'
import { prisma } from './prisma'

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value

  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { unit: true }
  })

  return user
}

export async function canAccessSection(userCondo: string, section: string): Promise<boolean> {
  // Everyone can access HOA section
  if (section === 'HOA') {
    return true
  }

  // Users can only access their own condo section
  return userCondo === section
}
