export interface InvoiceFields { invoiceNumber: string; total: string; currency: string }
export interface CheckedRecord { id: string; input: string; expected: InvoiceFields }
export interface TestDraft {
  filename: string
  source: 'demo' | 'local'
  scenario?: 'standard' | 'below-target'
  records: CheckedRecord[]
  accuracy: number
  improvement: number
}
export interface TestAgreement { draft: TestDraft; skill: 'Invoice field extractor'; version: 'v1.0'; amountMinor: 1200; currency: 'USD'; instructionText: string }
export type DemoPayment = 'NOT_AUTHORIZED' | 'AUTHORIZED' | 'CAPTURE_REQUESTED' | 'COMPLETED' | 'VOIDED'
export type DemoStage = 'setup' | 'review' | 'running' | 'verifying' | 'results'
export interface TestWorkflow { draft: TestDraft; agreement: TestAgreement | null; approved: boolean; payment: DemoPayment; stage: DemoStage }
