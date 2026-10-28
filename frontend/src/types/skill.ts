export type SkillCategory = 'Documents' | 'Operations' | 'Commerce'
export interface SkillSummary {
  id: string
  name: string
  description: string
  seller: string
  category: SkillCategory
  artwork: string
  version: string | null
  illustrativePrice: { amountMinor: number; currency: 'USD' } | null
  preparedExample: boolean
}
export interface SkillCatalog { demo: true; skills: SkillSummary[] }

export interface SkillDetail extends SkillSummary {
  demo: true
  tagline: string
  version: string
  illustrativePrice: { amountMinor: number; currency: 'USD' }
  example: {
    input: string
    invoiceNumber: string
    date: string
    vendor: string
    total: string
    currency: string
  }
}
