import type { SellerDraft, SellerListing, SellerActivity, SellerService } from '../../types/seller'

export const demoSellerPolicy = 'Buyers approve a separate test agreement before authorization. Passing checks permits a capture request; delivery requires confirmed completed capture. Failed or inconclusive tests do not capture payment.'
export function createSellerDraft(): SellerDraft {
  return { name: 'Invoice field extractor', category: 'Documents', description: 'Extract key fields from invoice text.', version: 'v1.0', instructions: 'Extract invoice number, total and currency.\nUse only values present in the input.\nReturn the agreed structured fields.', expectedInput: 'Invoice text', expectedOutput: 'Invoice number, total, currency', price: '12.00', currency: 'USD', licence: 'Demo evaluation only; no commercial licence is granted.', exampleInput: 'Invoice INV-1042. Total USD 1250.00.', exampleOutput: '{"invoiceNumber":"INV-1042","total":"1250.00","currency":"USD"}' }
}
export function sellerListingFixtures(): SellerListing[] {
  return [
    { id: 'invoice-demo', status: 'AVAILABLE', draft: createSellerDraft(), contentHash: null, buyerPreview: '/buyer/skills/invoice-field-extractor' },
    { id: 'attributes-draft', status: 'DRAFT', draft: { ...createSellerDraft(), name: 'Product attribute mapper', category: 'Commerce', description: 'Maps product attributes to a standard schema.', version: 'v0.1', instructions: 'Extract brand, color, size and material. Use only attributes present in the input.', expectedInput: 'Product listing text', expectedOutput: 'Brand, color, size, material', price: '', exampleInput: 'Blue cotton shirt, size M.', exampleOutput: '{"color":"blue","size":"M","material":"cotton"}' }, contentHash: null, buyerPreview: null },
  ]
}
export const sellerActivityFixtures: SellerActivity[] = [
  { id: 'AG-004', buyerLabel: 'Buyer 4', skill: 'Invoice field extractor', version: 'v1.0', started: 'Apr 25, 2025 10:14', status: 'TESTING' },
  { id: 'AG-003', buyerLabel: 'Buyer 3', skill: 'Invoice field extractor', version: 'v1.0', started: 'Apr 24, 2025 16:38', status: 'PAYMENT_PENDING' },
  { id: 'AG-002', buyerLabel: 'Buyer 2', skill: 'Invoice field extractor', version: 'v1.0', started: 'Apr 22, 2025 11:05', status: 'DELIVERED' },
  { id: 'AG-001', buyerLabel: 'Buyer 1', skill: 'Product attribute mapper', version: 'v0.1', started: 'Apr 20, 2025 09:21', status: 'FAILED' },
]
export type SellerErrors = Partial<Record<keyof SellerDraft, string>>
export function sellerErrors(draft: SellerDraft): SellerErrors {
  const errors: SellerErrors = {}
  for (const key of ['name', 'description', 'instructions', 'expectedInput', 'expectedOutput', 'licence', 'exampleInput', 'exampleOutput'] as const) {
    const max = key === 'instructions' ? 10000 : key === 'name' ? 100 : 2000
    if (!draft[key].trim() || draft[key].length > max) errors[key] = `Enter ${key === 'name' ? 'a name' : 'text'} of 1–${max} characters.`
  }
  if (!/^v?\d+\.\d+(?:\.\d+)?$/.test(draft.version.trim()) || draft.version.length > 30 || draft.version.trim().replace(/^v/, '').split('.').some(part => !Number.isSafeInteger(Number(part)))) errors.version = 'Use a version such as v1.0 or v1.0.1.'
  if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(draft.price) || Number(draft.price) <= 0 || Number(draft.price) > 999999.99) errors.price = 'Enter a USD price from 0.01 to 999999.99, with at most two decimals.'
  if (!['Documents', 'Operations', 'Commerce'].includes(draft.category)) errors.category = 'Choose a supported category.'
  if (draft.currency !== 'USD') errors.currency = 'This demo supports USD only.'
  return errors
}
export function normalizedSellerDraft(draft: SellerDraft): SellerDraft {
  return { name: draft.name.trim(), category: draft.category, description: draft.description.trim(), version: `v${draft.version.trim().replace(/^v/, '').split('.').map(Number).join('.')}`, instructions: draft.instructions.trim(), expectedInput: draft.expectedInput.trim(), expectedOutput: draft.expectedOutput.trim(), price: Number(draft.price).toFixed(2), currency: 'USD', licence: draft.licence.trim(), exampleInput: draft.exampleInput.trim(), exampleOutput: draft.exampleOutput.trim() }
}
export function sellerPackageText(draft: SellerDraft) { return JSON.stringify({ ...normalizedSellerDraft(draft), evaluationPolicy: demoSellerPolicy }) }
export const mockSellerService: SellerService = {
  async register(draft, listings) {
    if (Object.keys(sellerErrors(draft)).length) throw new Error('Correct the highlighted fields before registering.')
    const normalized = normalizedSellerDraft(draft)
    const existing = listings.find(item => item.status !== 'DRAFT' && item.draft.name.toLowerCase() === normalized.name.toLowerCase() && normalizedSellerDraft(item.draft).version === normalized.version)
    const serialized = sellerPackageText(normalized)
    if (existing && sellerPackageText(existing.draft) !== serialized) throw new Error('This name and version already exist. Use a new version to change the package or offer.')
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized))
    const contentHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    return { id: existing?.id ?? `local-${crypto.randomUUID()}`, status: existing?.status ?? 'LOCAL', draft: structuredClone(normalized), contentHash, buyerPreview: existing?.buyerPreview ?? null }
  },
}
