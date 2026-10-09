import { useState } from 'react'
import { cn } from '../../../lib/utils/cn'
import { useTranslation } from 'react-i18next'
import { Button, FormField, Modal, Textarea } from '../../../components/ui'
import {
  INSTITUTION_ACTIONS,
  INSTITUTION_ACTION_DESTRUCTIVE,
  INSTITUTION_ACTION_NEEDS_NOTE,
  type InstitutionAction,
} from '../institutionWorkflow'
import type { InstitutionVerificationStatus } from '../types'

export interface InstitutionReviewActionsProps {
  /** Which queue this is, so labels and copy resolve in the right namespace section. */
  kind: 'organizations' | 'universities'
  status: InstitutionVerificationStatus
  pending: boolean
  onRun: (action: InstitutionAction, note?: string) => void
}

/**
 * The verification commands for one institution, split by consequence (Phase 8).
 *
 * <p>Shared by both queues because both run the same frozen machine
 * ({@code Organization}/{@code University}: SUBMITTED → UNDER_REVIEW → VERIFIED / NEEDS_CHANGES /
 * REJECTED; VERIFIED → SUSPENDED; VERIFIED or SUSPENDED → REVOKED). The review decisions sit
 * together; suspension and revocation — which take an operating institution's verification away —
 * sit apart under their own heading, so they are never the nearest button to "Verify".
 *
 * <p>Every command except "begin review" is confirmed in a dialog that states its consequence and is
 * confirmed by a button named after the action, never a bare "Confirm". The commands that tell an
 * institution something is wrong require a reason before they can be sent: the institution acts on
 * it. Nothing here changes the displayed status — the parent re-renders from the refetched record.
 */
export function InstitutionReviewActions({ kind, status, pending, onRun }: InstitutionReviewActionsProps) {
  const { t } = useTranslation()
  const [prompting, setPrompting] = useState<InstitutionAction | null>(null)
  const [note, setNote] = useState('')

  const actions = INSTITUTION_ACTIONS[status]
  const review = actions.filter((action) => action === 'begin-review' || action === 'verify' || action === 'request-changes' || action === 'reject')
  const withdraw = actions.filter((action) => action === 'suspend' || action === 'revoke')
  const needsNote = prompting !== null && INSTITUTION_ACTION_NEEDS_NOTE.has(prompting)

  function start(action: InstitutionAction) {
    // `begin-review` only moves the case into review and is undone by carrying on, so it does not
    // interrupt. Everything else is confirmed with its consequence.
    if (action === 'begin-review') {
      onRun(action)
      return
    }
    setNote('')
    setPrompting(action)
  }

  const button = (action: InstitutionAction) => (
    <Button
      key={action}
      size="sm"
      variant={action === 'verify' ? 'primary' : INSTITUTION_ACTION_DESTRUCTIVE.has(action) ? 'danger' : 'outline'}
      disabled={pending}
      loading={pending && action === 'begin-review'}
      onClick={() => start(action)}
    >
      {t(`admin:${kind}.actions.${action}`)}
    </Button>
  )

  return (
    <div className="flex flex-col gap-5">
      {actions.length === 0 ? (
        <p className="text-body text-foreground-secondary">{t(`admin:${kind}.noActions`)}</p>
      ) : (
        <>
          {review.length > 0 && <div className="flex flex-wrap gap-2">{review.map(button)}</div>}
          {withdraw.length > 0 && (
            // The rule separates withdrawal from review commands; with nothing above it, it would
            // only draw an empty line.
            <div className={cn('flex flex-col gap-2', review.length > 0 && 'border-t border-border pt-4')}>
              <p className="text-label text-foreground">{t('admin:verification.withdrawTitle')}</p>
              <p className="text-caption text-foreground-secondary">{t('admin:verification.withdrawHint')}</p>
              <div className="flex flex-wrap gap-2">{withdraw.map(button)}</div>
            </div>
          )}
        </>
      )}

      <Modal
        open={prompting !== null}
        onClose={() => setPrompting(null)}
        closeLabel={t('common:actions.close')}
        title={prompting ? t(`admin:${kind}.confirmTitles.${prompting}`) : ''}
        description={prompting ? t(`admin:${kind}.confirmations.${prompting}`) : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPrompting(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant={prompting && INSTITUTION_ACTION_DESTRUCTIVE.has(prompting) ? 'danger' : 'primary'}
              loading={pending}
              disabled={needsNote && !note.trim()}
              onClick={() => {
                if (!prompting) return
                onRun(prompting, needsNote ? note.trim() : undefined)
                setPrompting(null)
              }}
            >
              {prompting ? t(`admin:${kind}.actions.${prompting}`) : ''}
            </Button>
          </>
        }
      >
        {needsNote && (
          <FormField label={t(`admin:${kind}.noteLabel`)} htmlFor="institution-note" hint={t(`admin:${kind}.noteHint`)} required>
            <Textarea
              id="institution-note"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t(`admin:${kind}.notePlaceholder`)}
            />
          </FormField>
        )}
      </Modal>
    </div>
  )
}
