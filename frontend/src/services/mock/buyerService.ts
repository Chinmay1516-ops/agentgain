import type { BuyerService } from '../contracts/buyerService'
import type { BuyerOverview } from '../../types/buyer'

export const buyerOverviewFixture: BuyerOverview = {
  demo: true,
  profile: { displayName: 'Jordan Diaz', initials: 'JD', role: 'Buyer', fictional: true },
  currentTask: { title: 'Extract invoice fields', concern: 'Needs a better result', source: 'BUYER_REPORTED' },
  evaluations: [
    { id: 'invoice-example', name: 'Invoice field extractor', seller: 'Demo Studio', version: 'v1.0', recordCount: 20, kind: 'invoice', preparation: 'READY', contractApproved: false, paymentAuthorized: false, evaluationExecuted: false },
    { id: 'order-example', name: 'Order categorizer', seller: 'Demo Studio', version: 'v1.0', recordCount: 20, kind: 'categorization', preparation: 'DRAFT', contractApproved: false, paymentAuthorized: false, evaluationExecuted: false },
  ],
  purchasedSkillCount: 0,
}

export const mockBuyerService: BuyerService = {
  async getOverview(signal) {
    signal?.throwIfAborted()
    return structuredClone(buyerOverviewFixture)
  },
}
