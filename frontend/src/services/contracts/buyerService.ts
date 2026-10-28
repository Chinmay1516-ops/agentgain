import type { BuyerOverview } from '../../types/buyer'

/** Provisional read-only contract; does not authenticate or start evaluations. */
export interface BuyerService {
  getOverview(signal?: AbortSignal): Promise<BuyerOverview>
}
