import type { StudentEnrollmentResponse } from './types'
import type { StudentCandidacyResponse, StudentNominationResponse } from '../recruitment/types'
import type {
  CompletionRequirementType,
  CompletionStatusResponse,
  PlacementResponse,
  PlacementStatus,
} from '../placements/types'
import type { WeeklyLogResponse } from '../weekly-logs/types'
import type { AttendanceResponse } from '../attendance/types'
import type { DefenseAttemptResponse } from '../defense/types'
import type { LifecycleState } from '../../components/ui'
import { ACTIVE_CANDIDACY_STATUSES } from './studentReadiness'

/**
 * The student's journey, derived — for DISPLAY ONLY — from the same records the student's own
 * pages read. Nothing here is a new state: every stage, step and attention item is a direct reading
 * of a backend status (CLAUDE.md sections 30, 35-39, 41-46), and the backend still decides every
 * transition. The point is ordering: which of the facts the student already owns matters most right
 * now, and what one thing they should do next.
 */

// ---------------------------------------------------------------- where am I

/** Placement statuses that hold the student's one live placement slot. */
export const LIVE_PLACEMENT_STATUSES: ReadonlySet<PlacementStatus> = new Set(['PLANNED', 'ACTIVE', 'COMPLETION_PENDING'])

export type StudentStage =
  | 'placementActive'
  | 'placementPlanned'
  | 'completionPending'
  | 'offerWaiting'
  | 'nominationWaiting'
  | 'enrollmentMissing'
  | 'enrollmentIncomplete'
  | 'enrollmentChangesRequested'
  | 'enrollmentInReview'
  | 'enrollmentClosed'
  | 'applicationsInProgress'
  | 'completed'
  | 'readyToApply'

export interface NextAction {
  /** A `student:journey.actions.*` key. */
  labelKey: string
  to: string
}

export interface StudentStatus {
  stage: StudentStage
  /** The placement the stage is about, when there is one. */
  placement: PlacementResponse | null
  primary: NextAction
  secondary: NextAction | null
}

export interface StudentRecords {
  /** `null` = no enrollment claimed yet (the API answered 404). */
  enrollment: StudentEnrollmentResponse | null
  candidacies: StudentCandidacyResponse[]
  nominations: StudentNominationResponse[]
  placements: PlacementResponse[]
}

const BROWSE: NextAction = { labelKey: 'browse', to: '/student/opportunities' }
const ENROLLMENT: NextAction = { labelKey: 'enrollment', to: '/student/enrollment' }
const APPLICATIONS: NextAction = { labelKey: 'applications', to: '/student/applications' }

export function livePlacement(placements: PlacementResponse[]): PlacementResponse | null {
  return placements.find((placement) => LIVE_PLACEMENT_STATUSES.has(placement.status)) ?? null
}

/** Offers the student must answer: the live offer on a candidacy, still PENDING. */
export function pendingOffers(candidacies: StudentCandidacyResponse[]): StudentCandidacyResponse[] {
  return candidacies
    .filter((candidacy) => candidacy.liveOffer?.status === 'PENDING')
    .sort((a, b) => a.liveOffer!.responseDeadline.localeCompare(b.liveOffer!.responseDeadline))
}

export function pendingNominations(nominations: StudentNominationResponse[]): StudentNominationResponse[] {
  return nominations.filter((nomination) => nomination.status === 'PENDING_STUDENT_CONSENT')
}

/**
 * One stage, chosen in priority order: a live internship first (it is what the student's days are
 * about), then decisions only the student can make (an offer, then a nomination — both expire or
 * block someone else), then what stands between them and taking part (enrollment), then the
 * recruitment they already have going, and only then "ready to apply".
 */
export function deriveStudentStatus({ enrollment, candidacies, nominations, placements }: StudentRecords): StudentStatus {
  const live = livePlacement(placements)
  if (live) {
    const open: NextAction = { labelKey: 'openInternship', to: `/student/placements/${live.id}` }
    const stage: StudentStage =
      live.status === 'ACTIVE' ? 'placementActive' : live.status === 'PLANNED' ? 'placementPlanned' : 'completionPending'
    return { stage, placement: live, primary: open, secondary: null }
  }

  const offers = pendingOffers(candidacies)
  if (offers.length > 0) {
    return {
      stage: 'offerWaiting',
      placement: null,
      primary: { labelKey: 'reviewOffer', to: `/student/applications/${offers[0].id}` },
      secondary: offers.length > 1 ? APPLICATIONS : null,
    }
  }

  if (pendingNominations(nominations).length > 0) {
    return { stage: 'nominationWaiting', placement: null, primary: { labelKey: 'respondNomination', to: '/student/nominations' }, secondary: null }
  }

  const verification = enrollment?.verificationStatus ?? null
  if (verification !== 'VERIFIED') {
    const stage: StudentStage =
      enrollment === null
        ? 'enrollmentMissing'
        : verification === 'NEEDS_MORE_EVIDENCE'
          ? 'enrollmentChangesRequested'
          : verification === 'SUBMITTED' || verification === 'UNDER_REVIEW'
            ? 'enrollmentInReview'
            : verification === 'REJECTED' || verification === 'REVOKED'
              ? 'enrollmentClosed'
              : 'enrollmentIncomplete'
    // While the university reviews, there is nothing to do on the enrollment itself — browsing is
    // the useful thing, and the status stays one click away.
    if (stage === 'enrollmentInReview') {
      return { stage, placement: null, primary: BROWSE, secondary: { labelKey: 'viewEnrollment', to: ENROLLMENT.to } }
    }
    return {
      stage,
      placement: null,
      primary: stage === 'enrollmentClosed' ? { labelKey: 'viewEnrollment', to: ENROLLMENT.to } : ENROLLMENT,
      secondary: stage === 'enrollmentClosed' ? null : BROWSE,
    }
  }

  if (candidacies.some((candidacy) => ACTIVE_CANDIDACY_STATUSES.has(candidacy.status))) {
    return { stage: 'applicationsInProgress', placement: null, primary: APPLICATIONS, secondary: BROWSE }
  }

  const finished = placements.find((placement) => placement.status === 'COMPLETED') ?? null
  if (finished) {
    return {
      stage: 'completed',
      placement: finished,
      primary: { labelKey: 'viewInternship', to: `/student/placements/${finished.id}` },
      secondary: BROWSE,
    }
  }

  return { stage: 'readyToApply', placement: null, primary: BROWSE, secondary: null }
}

// ---------------------------------------------------------------- what needs my attention

export type AttentionItem =
  | { kind: 'offer'; id: string; title: string; deadline: string; to: string }
  | { kind: 'nomination'; id: string; title: string | null; organization: string | null; to: string }
  | { kind: 'enrollment'; status: 'missing' | 'incomplete' | 'changesRequested'; to: string }
  | { kind: 'weeklyLogReturned'; id: string; weekNumber: number; to: string }
  | { kind: 'finalReportRevision'; to: string }
  | { kind: 'defenseScheduled'; id: string; scheduledAt: string; location: string | null; to: string }

export interface PlacementSignals {
  completion?: CompletionStatusResponse
  weeklyLogs?: WeeklyLogResponse[]
  attendance?: AttendanceResponse[]
  defenseAttempts?: DefenseAttemptResponse[]
}

/**
 * Only things the student can act on now (or, for a scheduled defense, must turn up to). Status
 * that is simply waiting on someone else — an application under review, an enrollment in review —
 * is NOT attention: listing it would train the student to ignore the list.
 */
export function deriveAttention(records: StudentRecords, signals: PlacementSignals = {}): AttentionItem[] {
  const items: AttentionItem[] = []
  const live = livePlacement(records.placements)

  for (const candidacy of pendingOffers(records.candidacies)) {
    items.push({
      kind: 'offer',
      id: candidacy.id,
      title: candidacy.opportunityTitle,
      deadline: candidacy.liveOffer!.responseDeadline,
      to: `/student/applications/${candidacy.id}`,
    })
  }

  for (const nomination of pendingNominations(records.nominations)) {
    items.push({
      kind: 'nomination',
      id: nomination.id,
      title: nomination.opportunityTitle,
      organization: nomination.organizationName,
      to: '/student/nominations',
    })
  }

  const verification = records.enrollment?.verificationStatus ?? null
  if (!live && verification !== 'VERIFIED') {
    if (records.enrollment === null) items.push({ kind: 'enrollment', status: 'missing', to: '/student/enrollment' })
    else if (verification === 'NEEDS_MORE_EVIDENCE') items.push({ kind: 'enrollment', status: 'changesRequested', to: '/student/enrollment' })
    else if (verification === 'DRAFT') items.push({ kind: 'enrollment', status: 'incomplete', to: '/student/enrollment' })
  }

  if (live) {
    items.push(...placementAttention(live, signals))
  }

  return items
}

/** Attention inside one placement — shared by the dashboard and the placement hub. */
export function placementAttention(placement: PlacementResponse, signals: PlacementSignals): AttentionItem[] {
  const items: AttentionItem[] = []
  const base = `/student/placements/${placement.id}`
  // Workplace and academic records only move while the internship is running.
  const running = placement.status === 'ACTIVE' || placement.status === 'COMPLETION_PENDING'

  if (running) {
    for (const log of signals.weeklyLogs ?? []) {
      if (log.state === 'RETURNED_FOR_CHANGES') {
        items.push({ kind: 'weeklyLogReturned', id: log.id, weekNumber: log.weekNumber, to: `${base}/weekly-logs` })
      }
    }
    // Attendance is deliberately NOT here: confirming or resolving a record is the organization
    // supervisor's command (AttendanceService.confirm/resolve), never the student's. The student's
    // only move is to dispute a wrong record, which is a choice, not a pending task.

    const report = signals.completion?.requirements.find((requirement) => requirement.type === 'FINAL_REPORT')
    if (report?.required && report.detail === 'NEEDS_REVISION') items.push({ kind: 'finalReportRevision', to: `${base}/final-report` })
  }

  for (const attempt of signals.defenseAttempts ?? []) {
    if (attempt.state === 'SCHEDULED') {
      items.push({ kind: 'defenseScheduled', id: attempt.id, scheduledAt: attempt.scheduledAt, location: attempt.locationDetails, to: `${base}/defense` })
    }
  }

  return items
}

// ---------------------------------------------------------------- lifecycle

/** The tracker's own state vocabulary — see LifecycleTracker. */
export type LifecycleStepState = LifecycleState

export interface LifecycleStep {
  id: 'placement' | 'started' | CompletionRequirementType | 'completion'
  state: LifecycleStepState
  /** Requirements share a group: the backend does not order them, so neither does the tracker. */
  group?: 'requirements'
  /** The backend's own short detail (e.g. "3/12", "NEEDS_REVISION"), for the label to phrase. */
  detail?: string | null
}

/** The modules the student owns and can open, in the order the internship navigation lists them. */
const REQUIREMENT_ORDER: CompletionRequirementType[] = ['WEEKLY_LOGS', 'ATTENDANCE', 'ORGANIZATION_EVALUATION', 'FINAL_REPORT', 'DEFENSE']

/**
 * The internship from confirmation to completion, read from the placement status and the
 * backend-computed completion checklist ONLY. Requirements the placement's policy does not ask for
 * are left out entirely (never drawn as unmet), and they are one unordered group — the backend
 * enforces no sequence between, say, attendance and the final report, so the tracker must not imply
 * one. Without the checklist (still loading, or unavailable) the requirement group is simply absent;
 * nothing is guessed.
 */
export function deriveLifecycle(placement: PlacementResponse, signals: PlacementSignals = {}): LifecycleStep[] {
  const status = placement.status
  const ended = status === 'CANCELLED' || status === 'TERMINATED'
  const started = status === 'ACTIVE' || status === 'COMPLETION_PENDING' || status === 'COMPLETED' || status === 'TERMINATED'
  const attentionTypes = new Set<CompletionRequirementType | null>(
    placementAttention(placement, signals).map((item) =>
      item.kind === 'weeklyLogReturned' ? 'WEEKLY_LOGS' : item.kind === 'finalReportRevision' ? 'FINAL_REPORT' : null,
    ),
  )

  const steps: LifecycleStep[] = [
    { id: 'placement', state: 'complete' },
    { id: 'started', state: started ? 'complete' : ended ? 'notReached' : 'current' },
  ]

  const requirements = (signals.completion?.requirements ?? [])
    .filter((requirement) => requirement.required)
    .sort((a, b) => REQUIREMENT_ORDER.indexOf(a.type) - REQUIREMENT_ORDER.indexOf(b.type))
  for (const requirement of requirements) {
    const state: LifecycleStepState = requirement.satisfied
      ? 'complete'
      : ended
        ? 'notReached'
        : !started
          ? 'upcoming'
          : attentionTypes.has(requirement.type)
            ? 'attention'
            : 'current'
    steps.push({ id: requirement.type, state, group: 'requirements', detail: requirement.detail })
  }

  steps.push({
    id: 'completion',
    state: status === 'COMPLETED' ? 'complete' : status === 'COMPLETION_PENDING' ? 'current' : ended ? 'notReached' : 'upcoming',
  })
  return steps
}

export type JourneyStepId = 'enrollment' | 'apply' | 'offer' | 'placement'

export interface JourneyStep {
  id: JourneyStepId
  state: LifecycleStepState
}

/**
 * Before any placement: the road to one. Each step is a real record — a verified enrollment, an
 * application or accepted nomination, an offer — so the tracker never shows progress the student
 * has not made. "Apply" is complete once anything is in a pipeline, and stays current otherwise.
 */
export function derivePrePlacementJourney({ enrollment, candidacies, nominations }: StudentRecords): JourneyStep[] {
  const verification = enrollment?.verificationStatus ?? null
  const verified = verification === 'VERIFIED'
  const enrollmentNeedsAction = enrollment === null || verification === 'DRAFT' || verification === 'NEEDS_MORE_EVIDENCE'
  const inPipeline =
    candidacies.some((candidacy) => ACTIVE_CANDIDACY_STATUSES.has(candidacy.status) || candidacy.status === 'ACCEPTED') ||
    nominations.some((nomination) => nomination.status === 'ACCEPTED')
  const offerWaiting = pendingOffers(candidacies).length > 0
  const nominationWaiting = pendingNominations(nominations).length > 0

  return [
    { id: 'enrollment', state: verified ? 'complete' : enrollmentNeedsAction ? 'attention' : 'current' },
    {
      id: 'apply',
      state: inPipeline ? 'complete' : nominationWaiting ? 'attention' : verified ? 'current' : 'upcoming',
    },
    { id: 'offer', state: offerWaiting ? 'attention' : 'upcoming' },
    { id: 'placement', state: 'upcoming' },
  ]
}
