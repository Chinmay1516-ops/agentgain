import type { CheckedRecord, TestDraft } from '../types/testWorkflow'
import { createTestDraft } from './mock/testFixtures'

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown, limit: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= limit
export function validateRecords(value: unknown): CheckedRecord[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 200) throw new Error('Provide an array of 1–200 records.')
  const ids = new Set<string>()
  return value.map((item, index) => {
    if (!object(item) || !text(item.id, 80) || !text(item.input, 10000) || !object(item.expected)) throw new Error(`Record ${index + 1} needs id, input text and an expected answer.`)
    if (ids.has(item.id)) throw new Error(`Record ${index + 1} has a duplicate id.`)
    ids.add(item.id)
    const answer = item.expected
    if (!text(answer.invoiceNumber, 80) || !text(answer.total, 40) || !/^\d+(\.\d{1,2})?$/.test(answer.total) || !text(answer.currency, 3) || !/^[A-Z]{3}$/.test(answer.currency)) throw new Error(`Record ${index + 1}: expected needs invoiceNumber, decimal total as a string, and a three-letter currency.`)
    return { id: item.id, input: item.input, expected: { invoiceNumber: answer.invoiceNumber, total: answer.total, currency: answer.currency } }
  })
}
export function validateRules(accuracy: number, improvement: number): string | null {
  if (!Number.isFinite(accuracy) || accuracy < 1 || accuracy > 100) return 'Minimum checked accuracy must be between 1 and 100%.'
  if (!Number.isFinite(improvement) || improvement < 0 || improvement > 100) return 'Minimum improvement must be between 0 and 100 percentage points.'
  return null
}
export function parseDraft(value: unknown): TestDraft {
  if (!object(value) || !text(value.filename, 200) || (value.source !== 'demo' && value.source !== 'local') || typeof value.accuracy !== 'number' || typeof value.improvement !== 'number' || validateRules(value.accuracy, value.improvement)) throw new Error('Saved draft is invalid.')
  const records = validateRecords(value.records)
  const scenario = value.scenario === 'below-target' ? 'below-target' : 'standard'
  const source = value.source === 'demo' && JSON.stringify(records) === JSON.stringify(validateRecords(createTestDraft(scenario).records)) ? 'demo' : 'local'
  return { filename: value.filename, source, scenario, records, accuracy: value.accuracy, improvement: value.improvement }
}
