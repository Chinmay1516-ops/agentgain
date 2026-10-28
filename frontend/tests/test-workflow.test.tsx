import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import { initialWorkflow, workflowReducer, demoOutcome, draftStorageKey, hasDemoDelivery } from '../src/hooks/useTestWorkflow'
import { createTestDraft, illustrativeSummary } from '../src/services/mock/testFixtures'
import { parseDraft, validateRecords, validateRules } from '../src/services/testValidation'

describe('Evaluation safeguards and data', () => {
  it('freezes the alternative example and derives its failed 80% result', () => {
    const draft = createTestDraft('below-target')
    expect(illustrativeSummary(draft.records, draft.scenario)).toMatchObject({ baseline: 12, skilled: 16, skilledPercent: 80, improvement: 20 })
    expect(parseDraft(draft).source).toBe('demo')
    let state = workflowReducer({ ...initialWorkflow(), draft }, { type: 'review' })
    state = workflowReducer(state, { type: 'authorize', approved: true })
    expect(workflowReducer(state, { type: 'draft', draft: createTestDraft() })).toBe(state)
    state = workflowReducer(state, { type: 'verify' }); state = workflowReducer(state, { type: 'results' })
    expect(demoOutcome(state)).toBe('FAIL'); expect(state.payment).toBe('VOIDED')
    expect(workflowReducer(state, { type: 'capture' })).toBe(state)
  })
  it('validates shape, unique IDs, totals and rule ranges', () => {
    const records = createTestDraft().records
    expect(validateRecords(records)).toHaveLength(20)
    expect(() => validateRecords([])).toThrow()
    expect(() => validateRecords([records[0], records[0]])).toThrow('duplicate')
    expect(() => validateRecords([{ ...records[0], expected: { ...records[0].expected, total: 1250 } }])).toThrow('decimal')
    expect(validateRules(NaN, 20)).toBeTruthy()
    expect(validateRules(90, -1)).toBeTruthy()
    expect(validateRules(100, 100)).toBeNull()
  })
  it('restores only validated drafts and never restores payment authority', () => {
    expect(parseDraft(createTestDraft()).source).toBe('demo')
    sessionStorage.setItem(draftStorageKey, JSON.stringify({ ...createTestDraft(), payment: 'COMPLETED', approved: true }))
    expect(initialWorkflow()).toMatchObject({ payment: 'NOT_AUTHORIZED', agreement: null, approved: false })
    const altered = createTestDraft(); altered.records[0].input = 'Changed'
    expect(parseDraft(altered).source).toBe('local')
    sessionStorage.setItem(draftStorageKey, '{broken')
    expect(initialWorkflow().draft.records).toHaveLength(20)
  })
  it('derives the illustrative numbers from the supplied synthetic records', () => {
    expect(illustrativeSummary(createTestDraft().records)).toEqual({ baseline: 12, skilled: 18, baselinePercent: 60, skilledPercent: 90, improvement: 30 })
  })
  it('requires approved terms, a pass, and separate capture confirmation', () => {
    let state = initialWorkflow()
    expect(workflowReducer(state, { type: 'authorize', approved: true })).toBe(state)
    expect(workflowReducer(state, { type: 'capture' })).toBe(state)
    state = workflowReducer(state, { type: 'review' })
    expect(workflowReducer(state, { type: 'authorize', approved: false })).toBe(state)
    state = workflowReducer(state, { type: 'authorize', approved: true })
    expect(state.payment).toBe('AUTHORIZED')
    expect(hasDemoDelivery(state)).toBe(false)
    expect(workflowReducer(state, { type: 'draft', draft: createTestDraft() })).toBe(state)
    expect(workflowReducer(state, { type: 'confirm' })).toBe(state)
    state = workflowReducer(state, { type: 'verify' }); state = workflowReducer(state, { type: 'results' })
    expect(state.payment).toBe('AUTHORIZED')
    state = workflowReducer(state, { type: 'capture' }); expect(state.payment).toBe('CAPTURE_REQUESTED')
    expect(hasDemoDelivery(state)).toBe(false)
    expect(workflowReducer(state, { type: 'capture' })).toBe(state)
    state = workflowReducer(state, { type: 'confirm' }); expect(state.payment).toBe('COMPLETED')
    expect(hasDemoDelivery(state)).toBe(true)
    expect(state.agreement?.instructionText).toContain('Do not infer missing values.')
    expect(hasDemoDelivery({ ...state, approved: false })).toBe(false)
  })
  it.each(['local', 'strict'] as const)('prevents capture for %s tests', kind => {
    let state = initialWorkflow()
    if (kind === 'local') state.draft.source = 'local'; else state.draft.accuracy = 95
    state = workflowReducer(state, { type: 'review' })
    expect(demoOutcome(state)).toBe(kind === 'local' ? 'INCONCLUSIVE' : 'FAIL')
    state = workflowReducer(state, { type: 'authorize', approved: true })
    state = workflowReducer(state, { type: 'verify' }); state = workflowReducer(state, { type: 'results' })
    expect(state.payment).toBe('VOIDED')
    expect(workflowReducer(state, { type: 'capture' })).toBe(state)
  })
  it('keeps the agreement snapshot independent of the editable draft', () => {
    const draft = createTestDraft(); const state = workflowReducer({ ...initialWorkflow(), draft }, { type: 'review' })
    draft.records[0].input = 'Mutated'
    expect(state.agreement?.draft.records[0].input).not.toBe('Mutated')
  })
})

describe('Test setup page', () => {
  it('validates rules, previews stored fields and saves a session draft', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/buyer/evaluations/new']}><App /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Define what passing means.' })
    const accuracy = screen.getByRole('spinbutton', { name: /Minimum checked accuracy/ })
    await user.clear(accuracy)
    expect(screen.getByRole('button', { name: 'Review test terms' })).toBeDisabled()
    await user.type(accuracy, '95')
    await user.click(screen.getByRole('button', { name: 'Invoice001.txt' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('INV-1042')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(JSON.parse(sessionStorage.getItem(draftStorageKey)!)).toMatchObject({ accuracy: 95 })
    expect(screen.getByRole('status')).toHaveTextContent('No payment')
  })
})
