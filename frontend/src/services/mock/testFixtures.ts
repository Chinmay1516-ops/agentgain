import type { TestDraft, CheckedRecord, InvoiceFields } from '../../types/testWorkflow'

export const demoInstructionText = 'Extract invoice number, total and currency from the input.\nReturn the agreed structured fields.\nDo not infer missing values.'

/** Synthetic UI examples, not an evaluated dataset. All numbers are demo fixtures. */
export function createTestDraft(scenario: TestDraft['scenario'] = 'standard'): TestDraft {
  return { filename: 'invoice-tests.json', source: 'demo', scenario, accuracy: 90, improvement: 20, records: Array.from({ length: 20 }, (_, index) => {
    const id = `Invoice${String(index + 1).padStart(3, '0')}`
    const expected = { invoiceNumber: `INV-${1042 + index}`, total: index === 0 ? '1250.00' : scenario === 'below-target' && index === 13 ? '120.00' : `${100 + index * 25}.00`, currency: 'USD' }
    return { id, expected, input: `Acme Supplies Ltd.\nInvoice No: ${expected.invoiceNumber}\nTotal: USD ${expected.total}` }
  }) }
}

export function illustrativeOutput(record: CheckedRecord, index: number, arm: 'baseline' | 'skill', scenario: TestDraft['scenario'] = 'standard'): InvoiceFields {
  if (scenario === 'below-target' && arm === 'skill') {
    if (index === 7) return { ...record.expected, currency: 'EUR' }
    if (index === 13) return { ...record.expected, total: '102.00' }
  }
  const mismatch = arm === 'baseline' ? [0, 1, 3, 4, 5, 6, 7, 8].includes(index) : index >= 18
  return { ...record.expected, currency: mismatch ? 'SGD' : record.expected.currency }
}
export function matchesFields(expected: InvoiceFields, actual: InvoiceFields) {
  return expected.invoiceNumber === actual.invoiceNumber && expected.total === actual.total && expected.currency === actual.currency
}

export function illustrativeSummary(records: CheckedRecord[], scenario: TestDraft['scenario'] = 'standard') {
  const baseline = records.filter((record, index) => matchesFields(record.expected, illustrativeOutput(record, index, 'baseline', scenario))).length
  const skilled = records.filter((record, index) => matchesFields(record.expected, illustrativeOutput(record, index, 'skill', scenario))).length
  return { baseline, skilled, baselinePercent: baseline * 100 / records.length, skilledPercent: skilled * 100 / records.length, improvement: (skilled - baseline) * 100 / records.length }
}
