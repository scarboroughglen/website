// Helper functions for section name handling

export function normalizeSectionName(section: string): string {
  const upper = section.toUpperCase()

  if (upper === 'HOA') {
    return 'HOA'
  }

  // Convert CONDO1, condo1, Condo1 -> Condo1
  if (upper.startsWith('CONDO')) {
    return 'Condo' + upper.replace('CONDO', '')
  }

  return section
}

export function getSectionDisplayName(section: string): string {
  const normalized = normalizeSectionName(section)

  if (normalized === 'HOA') {
    return 'HOA'
  }

  // Convert Condo1 -> Condo 1
  return normalized.replace(/(\d+)/, ' $1')
}

export const ALL_SECTIONS = ['HOA', 'Condo1', 'Condo2', 'Condo3', 'Condo4']
