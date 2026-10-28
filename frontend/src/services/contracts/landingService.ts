import type { EvaluationPreview } from '../../types/evaluation'

/** Provisional frontend contract. No backend URLs or real payment operations. */
export interface LandingService {
  getPreview(signal?: AbortSignal): Promise<EvaluationPreview>
}
