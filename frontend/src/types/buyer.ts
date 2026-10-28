export interface EvaluationDraft {
  id: string
  name: string
  seller: string
  version: string
  recordCount: number
  kind: 'invoice' | 'categorization'
  preparation: 'READY' | 'DRAFT'
  contractApproved: false
  paymentAuthorized: false
  evaluationExecuted: false
}

/** Separate unexecuted fixtures from the canonical landing evidence example. */
export interface BuyerOverview {
  demo: true
  profile: { displayName: string; initials: string; role: 'Buyer'; fictional: true }
  currentTask: { title: string; concern: string; source: 'BUYER_REPORTED' }
  evaluations: EvaluationDraft[]
  purchasedSkillCount: 0
}
