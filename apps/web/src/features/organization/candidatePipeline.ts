import type { StatusTone } from '../../components/ui'
import type { CandidacyStatus, CandidateRowResponse } from '../recruitment/types'

/**
 * The approved dashboard's "Candidate Pipeline" board, mapped onto the REAL candidacy state
 * machine (CLAUDE.md section 37) rather than onto the prototype's invented labels.
 *
 * <p>The prototype shows five columns — New, Reviewing, Shortlisted, Interview, Accepted. Four of
 * those are real states under different names, and the fifth column hides a real state the
 * prototype simply forgot: a candidate who has been sent an offer is in {@code OFFERED} and is
 * neither "Interview" nor "Accepted". Dropping it would make the board lie about where people are,
 * so the board carries the domain's own six active states in the domain's own order:
 *
 * <pre>
 *   SUBMITTED -> UNDER_REVIEW -> SHORTLISTED -> INTERVIEW -> OFFERED -> ACCEPTED
 * </pre>
 *
 * <p>Nothing here is a status of its own invention, and nothing here is a status the UI can set:
 * the backend exposes one named command per transition (CLAUDE.md section 10), so this module only
 * describes and groups. Moving a card is not a thing this board does.
 */

/** The active stages, in lifecycle order — the columns of the board. */
export const PIPELINE_STAGES: CandidacyStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
  'ACCEPTED',
]

/**
 * States a candidate leaves the pipeline in. They are deliberately NOT board columns — a rejected
 * or withdrawn candidate is not "at a stage", and giving them a column would imply work in progress.
 * They are reported as a single closed count instead, and remain filterable in the pool list.
 */
export const CLOSED_STATUSES: CandidacyStatus[] = [
  'REJECTED',
  'WITHDRAWN',
  'OFFER_DECLINED',
  'OFFER_EXPIRED',
]

export function isClosed(status: CandidacyStatus): boolean {
  return CLOSED_STATUSES.includes(status)
}

/**
 * Column accents. These reuse the product's reserved STATUS palette rather than a categorical one,
 * and every column also carries its translated name and count as text — the reading never depends
 * on telling two hues apart (BRAND_AND_UI_GUIDELINES.md section 17).
 */
export const PIPELINE_STAGE_TONE: Record<CandidacyStatus, StatusTone> = {
  SUBMITTED: 'neutral',
  UNDER_REVIEW: 'info',
  SHORTLISTED: 'info',
  INTERVIEW: 'info',
  OFFERED: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
  OFFER_DECLINED: 'neutral',
  OFFER_EXPIRED: 'neutral',
}

export interface PipelineColumn {
  status: CandidacyStatus
  candidates: CandidateRowResponse[]
}

/** Groups a candidate list into the board's columns. Closed candidates are excluded by design. */
export function pipelineColumns(candidates: CandidateRowResponse[]): PipelineColumn[] {
  return PIPELINE_STAGES.map((status) => ({
    status,
    candidates: candidates.filter((candidate) => candidate.status === status),
  }))
}

export function closedCount(candidates: CandidateRowResponse[]): number {
  return candidates.filter((candidate) => isClosed(candidate.status)).length
}

/**
 * The backend's own transition table, transcribed from {@code Candidacy.ALLOWED_TRANSITIONS}.
 *
 * <p>Terminal states are absent as keys and therefore accept nothing — notably {@code ACCEPTED},
 * which is what stops a candidacy moving once a placement exists.
 *
 * <p>This is transcribed rather than approximated on purpose. The previous hand-written version
 * was NARROWER than the server in four places, so the UI hid actions the API would happily have
 * accepted: a recruiter could not send a fresh applicant straight to interview, could not reject
 * someone who was already holding an offer, and could not re-engage a candidate whose offer had
 * lapsed. A frontend guard that is stricter than the backend is not "safe" — it silently removes
 * real capability.
 */
const ALLOWED_TRANSITIONS: Partial<Record<CandidacyStatus, CandidacyStatus[]>> = {
  SUBMITTED: ['UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN'],
  UNDER_REVIEW: ['SHORTLISTED', 'INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['INTERVIEW', 'OFFERED', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW: ['OFFERED', 'REJECTED', 'WITHDRAWN'],
  OFFERED: ['ACCEPTED', 'OFFER_DECLINED', 'OFFER_EXPIRED', 'REJECTED', 'WITHDRAWN'],
  // A lapsed or declined offer returns the candidate to the pool so a recruiter may re-engage them.
  OFFER_DECLINED: ['REJECTED', 'WITHDRAWN'],
  OFFER_EXPIRED: ['SHORTLISTED', 'OFFERED', 'REJECTED', 'WITHDRAWN'],
}

export function canTransition(from: CandidacyStatus, to: CandidacyStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to)
}

/** The named recruitment commands, and the state each one moves a candidacy into. */
export type CandidacyCommand = 'review' | 'shortlist' | 'interview' | 'reject'

export const COMMAND_TARGET: Record<CandidacyCommand, CandidacyStatus> = {
  review: 'UNDER_REVIEW',
  shortlist: 'SHORTLISTED',
  interview: 'INTERVIEW',
  reject: 'REJECTED',
}

/** Presentation order — the forward moves first, with the destructive one last. */
const COMMAND_ORDER: CandidacyCommand[] = ['review', 'shortlist', 'interview', 'reject']

/**
 * Which named commands the API would accept from the current state, derived from the transition
 * table rather than restated.
 *
 * <p>UX only — the server's state machine is authoritative and rejects anything else. This prevents
 * offering a button the backend would refuse; it never grants one, and a stage change is applied to
 * the UI only after the API confirms it.
 *
 * <p>{@code WITHDRAWN} is reachable in the table but is deliberately not a command here: withdrawal
 * belongs to the STUDENT ({@code POST /candidacies/{id}/withdraw} authorizes the owning student),
 * not to the organization.
 */
export function availableCommands(status: CandidacyStatus): CandidacyCommand[] {
  return COMMAND_ORDER.filter((command) => canTransition(status, COMMAND_TARGET[command]))
}

/** The states from which an offer may be sent, straight from the same table. */
export function canSendOffer(status: CandidacyStatus): boolean {
  return canTransition(status, 'OFFERED')
}
