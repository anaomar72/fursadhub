import type { PublicOpportunityResponse } from './types'

/** Deterministic similarity within real public results, using only published fields. */
export function similarOpportunities(current: PublicOpportunityResponse, candidates: PublicOpportunityResponse[], today: string) {
  const skills = new Set((current.skills ?? []).map((skill) => skill.toLocaleLowerCase()))
  const score = (candidate: PublicOpportunityResponse) =>
    (candidate.organization.id === current.organization.id ? 3 : 0)
    + (current.location && candidate.location?.toLocaleLowerCase() === current.location.toLocaleLowerCase() ? 2 : 0)
    + (candidate.workMode === current.workMode ? 1 : 0)
    + (candidate.skills ?? []).filter((skill) => skills.has(skill.toLocaleLowerCase())).length * 2
  return candidates.filter((candidate) => candidate.id !== current.id
    && (!candidate.applicationDeadline || candidate.applicationDeadline >= today) && score(candidate) >= 2)
    .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id)).slice(0, 3)
}
