import type { LandingService } from '../contracts/landingService'
import type { EvaluationPreview } from '../../types/evaluation'

export const previewFixture: EvaluationPreview = {
  demo: true,
  skill: 'Catalog Normalizer v1.3.2',
  buyer: 'Northwind Commerce (fictional)',
  seller: 'CatalogCraft Labs (fictional)',
  arms: [
    { id: 'existing', label: 'Existing agent', correct: 84, total: 120 },
    { id: 'free', label: 'Free alternative', correct: 89, total: 120 },
    { id: 'paid', label: 'With skill', correct: 106, total: 120 },
  ],
  outcome: 'PASS', paymentState: 'AUTHORIZED', licenceUsd: 200, evaluationExpenseUsd: 15,
  estimatedBenefitUsd: 422.5, lowerBenefitBoundUsd: 172, requiredBenefitUsd: 150, intervalIsIllustrative: true,
}

export const mockLandingService: LandingService = {
  async getPreview(signal) {
    signal?.throwIfAborted()
    // Fresh data prevents one demo from mutating another. No fetch or payment call.
    return structuredClone(previewFixture)
  },
}
