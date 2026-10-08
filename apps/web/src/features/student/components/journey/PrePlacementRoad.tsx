import { useTranslation } from 'react-i18next'
import { LifecycleTracker } from '../../../../components/ui'
import { derivePrePlacementJourney, type StudentRecords } from '../../studentJourney'

/**
 * Before any placement exists, the tracker shows the road TO one — verified enrollment, applying
 * (or accepting a nomination), an offer, the internship — instead of an empty internship progress
 * bar that would suggest a placement the student does not have.
 */
export function PrePlacementRoad({ records, className }: { records: StudentRecords; className?: string }) {
  const { t } = useTranslation()
  return (
    <LifecycleTracker
      className={className}
      label={t('student:journey.road.label')}
      steps={derivePrePlacementJourney(records).map((step) => ({
        id: step.id,
        label: t(`student:journey.road.steps.${step.id}`),
        state: step.state,
      }))}
    />
  )
}
