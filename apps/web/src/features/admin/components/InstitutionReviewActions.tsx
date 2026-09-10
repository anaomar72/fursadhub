import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, FormField, Modal, Textarea } from '../../../components/ui'
import {
  INSTITUTION_ACTIONS,
  INSTITUTION_ACTION_DESTRUCTIVE,
  INSTITUTION_ACTION_NEEDS_NOTE,
  type InstitutionAction,
} from '../institutionWorkflow'
import type { InstitutionVerificationStatus } from '../types'

export interface InstitutionReviewActionsProps {
  /** Which queue this is, so labels and error copy resolve in the right namespace section. */
  kind: 'organizations' | 'universities'
  status: InstitutionVerificationStatus
  pending: boolean
  error: string | null
  onRun: (action: InstitutionAction, note?: string) => void
}

/**
 * The verification commands for one institution.
 *
 * <p>Shared by both queues because both run the same frozen machine — the organization and
 * university endpoints differ only in their path, so duplicating this would mean two copies of the
 * transition rules drifting apart.
 *
 * <p>Nothing here changes the displayed status. The parent only re-renders once the API has
 * answered, so an approval that fails leaves the institution visibly unverified rather than
 * showing a success the backend never granted.
 */
export function InstitutionReviewActions({
  kind,
  status,
  pending,
  error,
  onRun,
}: InstitutionReviewActionsProps) {
  const { t } = useTranslation()
  const [prompting, setPrompting] = useState<InstitutionAction | null>(null)
  const [note, setNote] = useState('')

  const actions = INSTITUTION_ACTIONS[status]

  function start(action: InstitutionAction) {
    // Everything except `begin-review` is confirmed first, and the ones that must explain
    // themselves collect the note in the same step. `begin-review` only moves the case into the
    // reviewer's own queue and is reversible by carrying on, so it does not interrupt.
    if (action === 'begin-review') {
      onRun(action)
      return
    }
    setNote('')
    setPrompting(action)
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="danger">{error}</Alert>}

      {actions.length === 0 ? (
        <p className="text-sm text-muted">{t(`admin:${kind}.noActions`)}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              size="sm"
              variant={
                action === 'verify'
                  ? 'primary'
                  : INSTITUTION_ACTION_DESTRUCTIVE.has(action)
                    ? 'danger'
                    : 'outline'
              }
              disabled={pending}
              onClick={() => start(action)}
            >
              {t(`admin:${kind}.actions.${action}`)}
            </Button>
          ))}
        </div>
      )}

      <Modal
        open={prompting !== null}
        onClose={() => setPrompting(null)}
        closeLabel={t('common:actions.close')}
        title={prompting ? t(`admin:${kind}.actions.${prompting}`) : ''}
        description={prompting ? t(`admin:${kind}.confirmations.${prompting}`) : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPrompting(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant={prompting && INSTITUTION_ACTION_DESTRUCTIVE.has(prompting) ? 'danger' : 'primary'}
              loading={pending}
              onClick={() => {
                if (!prompting) return
                onRun(prompting, INSTITUTION_ACTION_NEEDS_NOTE.has(prompting) ? note : undefined)
                setPrompting(null)
              }}
            >
              {t('common:actions.confirm')}
            </Button>
          </>
        }
      >
        {prompting && INSTITUTION_ACTION_NEEDS_NOTE.has(prompting) ? (
          <FormField
            label={t(`admin:${kind}.noteLabel`)}
            htmlFor="institution-note"
            hint={t(`admin:${kind}.noteHint`)}
          >
            <Textarea
              id="institution-note"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t(`admin:${kind}.notePlaceholder`)}
            />
          </FormField>
        ) : (
          <p className="text-sm text-foreground-secondary">
            {prompting ? t(`admin:${kind}.confirmations.${prompting}`) : ''}
          </p>
        )}
      </Modal>
    </div>
  )
}
