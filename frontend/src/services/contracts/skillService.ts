import type { SkillCatalog, SkillDetail } from '../../types/skill'

/** Provisional demo catalogue contract; no backend endpoint or checkout authority. */
export interface SkillService {
  getCatalog(signal?: AbortSignal): Promise<SkillCatalog>
}

export interface SkillDetailService {
  getSkill(id: string, signal?: AbortSignal): Promise<SkillDetail | null>
}
