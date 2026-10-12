import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import * as recruitmentApi from '../api/recruitmentApi'
import * as publicOpportunityApi from '../../opportunities/api/publicOpportunityApi'
import { ScreeningQuestionFields } from '../components/ScreeningQuestionFields'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { AnimatedCheck, Button, PageHeader, SkeletonPanel, Breadcrumbs } from '../../../components/ui'
import type { ScreeningQuestionResponse } from '../types'
import * as documentsApi from '../../student/api/documentsApi'
import * as studentApi from '../../student/api/studentApi'
import * as placementsApi from '../../placements/api/placementsApi'
import { applyBlocker } from '../../student/studentReadiness'
import { PrivateDocumentUpload } from '../../student/components/PrivateDocumentUpload'
import { useStudentMarketplaceAccess } from '../../student/hooks/useStudentMarketplaceAccess'
import { PageContainer } from '../../../app/layouts/PageContainer'

/**
 * Student self-application to a PUBLIC/HYBRID opportunity (CLAUDE.md Phase 4 section 25).
 *
 * <p>Client-side required-answer checks are UX only — the backend re-validates every answer against
 * the opportunity's own questions, which is the real boundary (CLAUDE.md section 24).
 */
export function ApplyPage() {
  const { t } = useTranslation()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const queryClient = useQueryClient()
  const access = useStudentMarketplaceAccess()
  const [cv, setCv] = useState<(documentsApi.ApplicationCvUpload & { opportunityId: string }) | null>(null)
  const [cvBusy, setCvBusy] = useState(false)
  const selectedCv = cv?.opportunityId === opportunityId ? cv : null
  const enrollment = useQuery({ queryKey: ['student', 'enrollment'], queryFn: studentApi.getMyEnrollment, enabled: access.canAct, retry: false })
  const placements = useQuery({ queryKey: ['student', 'placements'], queryFn: placementsApi.listMyPlacements, enabled: access.canAct, retry: false })
  const candidacies = useQuery({ queryKey: ['student', 'candidacies'], queryFn: recruitmentApi.listMyCandidacies, enabled: access.canAct, retry: false })

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const opportunityQuery = useQuery({
    queryKey: ['public', 'opportunity', opportunityId],
    queryFn: () => publicOpportunityApi.getPublicOpportunity(opportunityId!),
    enabled: !!opportunityId,
  })

  const questionsQuery = useQuery({
    queryKey: ['recruitment', 'screening-questions', opportunityId],
    queryFn: () => recruitmentApi.listPublicScreeningQuestions(opportunityId!),
    enabled: !!opportunityId,
  })

  const applyMutation = useMutation({
    mutationFn: () =>
      recruitmentApi.applyToOpportunity(
        opportunityId!,
        // Blank optional answers are simply not sent.
        Object.entries(answers)
          .filter(([, value]) => value.trim() !== '')
          .map(([questionId, answer]) => ({ questionId, answer })),
        selectedCv?.id,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'candidacies'] })
    },
  })

  const questions: ScreeningQuestionResponse[] = questionsQuery.data ?? []
  const readinessLoaded = enrollment.isSuccess && placements.isSuccess && candidacies.isSuccess && opportunityQuery.isSuccess && questionsQuery.isSuccess
  const blocker = readinessLoaded ? applyBlocker({ enrollment: enrollment.data, placements: placements.data, candidacies: candidacies.data, opportunity: opportunityQuery.data }) : null
  const canSubmit = readinessLoaded && !blocker && !!selectedCv && access.canAct && !cvBusy

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit || applyMutation.isPending || applyMutation.isSuccess) {
      return
    }

    const missing: Record<string, string> = {}
    for (const question of questions) {
      if (question.required && !(answers[question.id] ?? '').trim()) {
        missing[question.id] = t('recruitment:apply.errors.answerRequired')
      }
    }
    setFieldErrors(missing)
    if (Object.keys(missing).length > 0) {
      return
    }

    applyMutation.mutate()
  }

  if (opportunityQuery.isLoading || questionsQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonPanel rows={6} />
      </PageContainer>
    )
  }

  const opportunity = opportunityQuery.data

  // One-time success confirmation, then a stable state — no looping animation
  // (CLAUDE.md section 58).
  if (applyMutation.isSuccess) {
    return (
      <PageContainer width="narrow">
        <div className="flex flex-col items-center gap-6 py-10 text-center">
          <AnimatedCheck label={t('recruitment:apply.successTitle')} />
          <p className="text-sm text-foreground-secondary">{t('recruitment:apply.successBody')}</p>
          <Link
            to="/student/applications"
            className="text-sm font-medium text-link hover:underline"
          >
            {t('recruitment:apply.viewApplications')}
          </Link>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer width="narrow" className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('student:nav.exploreInternships'), to: '/student/opportunities' },
          ...(opportunity ? [{ label: opportunity.title, to: `/student/opportunities/${opportunity.id}` }] : []),
          { label: t('recruitment:apply.title') },
        ]}
      />
      <PageHeader
        title={t('recruitment:apply.title')}
        description={opportunity ? `${opportunity.title} · ${opportunity.organization.name}` : undefined}
      />

      <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
        {access.canAct && <>
          <PrivateDocumentUpload
            title={t('common:applicationCv.title')}
            disabled={applyMutation.isPending}
            description={t('common:applicationCv.description')}
            present={!!selectedCv}
            accept="application/pdf"
            errorPage="cv"
            invalidateKeys={[]}
            onUpload={async (file) => {
              setCvBusy(true)
              try {
              const uploaded = await documentsApi.uploadApplicationCv(opportunityId!, file)
              // The previous selection remains valid if uploading the replacement fails.
              setCv({ ...uploaded, opportunityId: opportunityId! })
              if (selectedCv) await documentsApi.removeApplicationCv(opportunityId!, selectedCv.id)
              } finally { setCvBusy(false) }
            }}
            onDownload={() => documentsApi.downloadApplicationCv(opportunityId!, selectedCv!.id)}
            onRemove={async () => { setCvBusy(true); try { await documentsApi.removeApplicationCv(opportunityId!, selectedCv!.id); setCv(null) } finally { setCvBusy(false) } }}
            downloadFilename={selectedCv?.filename ?? 'cv.pdf'}
          />
          {selectedCv && <p className="text-sm" role="status">{selectedCv.filename} · {selectedCv.contentType}</p>}
        </>}
        {!access.canAct && !access.isLoading && <p>{t('common:remediation.studentActionsOnly')}</p>}
        {blocker && <p role="status" className="text-sm text-foreground-secondary">{t(`recruitment:apply.errors.${blocker}`)}</p>}
        {access.canAct && (enrollment.isError || placements.isError || candidacies.isError || opportunityQuery.isError || questionsQuery.isError) && <p role="alert" className="text-sm text-danger">{t('common:status.error')}</p>}
        {access.canAct && enrollment.data?.verificationStatus !== 'VERIFIED' && <Link to="/student/enrollment" className="text-sm text-link">{t('common:applicationCv.verifyEnrollment')}</Link>}
        <ScreeningQuestionFields
          questions={questions}
          answers={answers}
          errors={fieldErrors}
          disabled={applyMutation.isPending}
          onChange={(questionId, value) => {
            setAnswers((current) => ({ ...current, [questionId]: value }))
            setFieldErrors((current) => {
              if (!current[questionId]) {
                return current
              }
              const next = { ...current }
              delete next[questionId]
              return next
            })
          }}
        />

        {questions.length === 0 && (
          <p className="text-sm text-foreground-secondary">{t('recruitment:apply.noQuestions')}</p>
        )}

        {applyMutation.isError && (
          <p className="text-sm text-danger" role="alert">
            {apiErrorMessage(t, 'recruitment', 'apply', applyMutation.error)}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit} loading={applyMutation.isPending} className="w-full sm:w-auto">
          {t('recruitment:apply.submit')}
        </Button>
      </form>
    </PageContainer>
  )
}
