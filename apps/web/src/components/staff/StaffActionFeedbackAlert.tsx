import { useTranslation } from 'react-i18next'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import type { StaffActionFeedback } from './useStaffActionFeedback'

/** Shows the latest staff lifecycle outcome until it is dismissed or the next command starts. */
export function StaffActionFeedbackAlert({ feedback, onDismiss }: { feedback: StaffActionFeedback | null; onDismiss: () => void }) {
  const { t } = useTranslation()
  if (!feedback) return null
  return (
    <Alert
      tone={feedback.tone}
      title={feedback.title}
      actions={
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          {t('common:actions.close')}
        </Button>
      }
    >
      {feedback.detail}
    </Alert>
  )
}
