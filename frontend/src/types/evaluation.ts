export type EvaluationOutcome = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'TECHNICAL_ERROR'
export type PaymentState = 'AUTHORIZED' | 'CAPTURE_REQUESTED' | 'COMPLETED' | 'VOIDED' | 'UNKNOWN' | 'FAILED'
export type ComparisonArm = { id: 'existing' | 'free' | 'paid'; label: string; correct: number; total: number }
export interface EvaluationPreview {
  demo: true
  skill: string
  buyer: string
  seller: string
  arms: ComparisonArm[]
  outcome: EvaluationOutcome
  paymentState: PaymentState
  licenceUsd: number
  evaluationExpenseUsd: number
  estimatedBenefitUsd: number
  lowerBenefitBoundUsd: number
  requiredBenefitUsd: number
  intervalIsIllustrative: true
}
