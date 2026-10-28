import { createContext, useContext, useReducer, type ReactNode } from 'react'
import { createTestDraft, illustrativeSummary, demoInstructionText } from '../services/mock/testFixtures'
import { parseDraft, validateRecords, validateRules } from '../services/testValidation'
import type { TestDraft, TestWorkflow } from '../types/testWorkflow'

export const draftStorageKey = 'agentgain.invoice-draft.v1'
type Action = { type: 'draft'; draft: TestDraft } | { type: 'review' } | { type: 'authorize'; approved: boolean } | { type: 'verify' } | { type: 'results' } | { type: 'capture' } | { type: 'confirm' } | { type: 'reset' }
export function initialWorkflow(): TestWorkflow {
  let draft = createTestDraft()
  try { const saved = sessionStorage.getItem(draftStorageKey); if (saved) draft = parseDraft(JSON.parse(saved)) } catch { /* Unreadable or invalid storage is ignored; no payment state is restored. */ }
  return { draft, agreement: null, approved: false, payment: 'NOT_AUTHORIZED', stage: 'setup' }
}
export function demoOutcome(state: TestWorkflow): 'PASS' | 'FAIL' | 'INCONCLUSIVE' {
  const draft = state.agreement?.draft
  if (!draft || draft.source !== 'demo') return 'INCONCLUSIVE'
  const summary = illustrativeSummary(draft.records, draft.scenario)
  return summary.skilledPercent >= draft.accuracy && summary.improvement >= draft.improvement ? 'PASS' : 'FAIL'
}
export function workflowReducer(state: TestWorkflow, action: Action): TestWorkflow {
  switch (action.type) {
    case 'draft': return state.payment === 'NOT_AUTHORIZED' ? { draft: action.draft, agreement: null, approved: false, payment: 'NOT_AUTHORIZED', stage: 'setup' } : state
    case 'review':
      if (state.payment !== 'NOT_AUTHORIZED' || validateRules(state.draft.accuracy, state.draft.improvement)) return state
      try { validateRecords(state.draft.records) } catch { return state }
      return { ...state, stage: 'review', approved: false, agreement: { draft: structuredClone(state.draft), skill: 'Invoice field extractor', version: 'v1.0', amountMinor: 1200, currency: 'USD', instructionText: demoInstructionText } }
    case 'authorize': return state.stage === 'review' && state.agreement && action.approved && state.payment === 'NOT_AUTHORIZED' ? { ...state, approved: true, payment: 'AUTHORIZED', stage: 'running' } : state
    case 'verify': return state.stage === 'running' && state.payment === 'AUTHORIZED' ? { ...state, stage: 'verifying' } : state
    case 'results': return state.stage === 'verifying' ? { ...state, stage: 'results', payment: demoOutcome(state) === 'PASS' ? 'AUTHORIZED' : 'VOIDED' } : state
    case 'capture': return state.stage === 'results' && state.payment === 'AUTHORIZED' && demoOutcome(state) === 'PASS' ? { ...state, payment: 'CAPTURE_REQUESTED' } : state
    case 'confirm': return state.stage === 'results' && state.payment === 'CAPTURE_REQUESTED' ? { ...state, payment: 'COMPLETED' } : state
    case 'reset': return { draft: createTestDraft(), agreement: null, approved: false, payment: 'NOT_AUTHORIZED', stage: 'setup' }
  }
}
const Context = createContext<{ state: TestWorkflow; dispatch: React.Dispatch<Action> } | null>(null)
export function hasDemoDelivery(state: TestWorkflow) {
  return state.approved && state.stage === 'results' && state.payment === 'COMPLETED' && !!state.agreement?.instructionText && demoOutcome(state) === 'PASS'
}
export function useDemoDelivery() {
  const context = useContext(Context)
  return context ? hasDemoDelivery(context.state) : false
}
export function TestWorkflowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workflowReducer, undefined, initialWorkflow)
  return <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>
}
export function useTestWorkflow() {
  const context = useContext(Context)
  if (!context) throw new Error('TestWorkflowProvider is required')
  return context
}
