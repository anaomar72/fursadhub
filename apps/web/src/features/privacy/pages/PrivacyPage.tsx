import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, ErrorState, FormField, PageHeader, Select, StatusBadge, Textarea, SkeletonList, Checkbox } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { formatDate } from '../../../lib/utils/formatDate'
import * as privacyApi from '../api/privacyApi'
import type { ConsentType, PrivacyRequestType } from '../types'
import { PRIVACY_REQUEST_TONE } from '../../../lib/status/statusTones'

const REQUEST_TYPES: PrivacyRequestType[] = [
  'ACCESS',
  'CORRECTION',
  'ERASURE',
  'RESTRICTION',
  'PORTABILITY',
  'OBJECTION',
]

/**
 * The user's own privacy surface: consents and data-subject requests
 * (CLAUDE.md sections 49-50).
 *
 * <p>The two halves are separate on purpose, and the page says so. Accepting the Terms is not
 * consent to optional processing, and withdrawing a consent has no effect on the Terms — collapsing
 * them into one toggle is exactly the conflation CLAUDE.md section 49 warns against.
 */
export function PrivacyPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [requestType, setRequestType] = useState<PrivacyRequestType>('ACCESS')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)

  const requestsQuery = useQuery({
    queryKey: ['privacy-requests'],
    queryFn: privacyApi.listMyPrivacyRequests,
  })
  const consentsQuery = useQuery({
    queryKey: ['consents'],
    queryFn: privacyApi.listMyConsents,
  })

  const submitMutation = useMutation({
    mutationFn: () => {
      setError(null)
      return privacyApi.submitPrivacyRequest(requestType, details).catch((cause) => {
        setError(apiErrorMessage(t, 'privacy', 'requests', cause))
        throw cause
      })
    },
    onSuccess: () => {
      setDetails('')
      void queryClient.invalidateQueries({ queryKey: ['privacy-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const consentMutation = useMutation({
    mutationFn: ({ consentType, granted }: { consentType: ConsentType; granted: boolean }) =>
      privacyApi.setConsent(consentType, granted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consents'] }),
  })

  return (
    <div className="flex flex-col gap-8">
      {/* ------------------------------------------------------------ consents */}
      <section className="flex flex-col gap-3">
        <div>
          <PageHeader title={t('privacy:consents.title')} />
          <p className="mt-1 text-sm text-foreground-secondary">{t('privacy:consents.description')}</p>
        </div>

        {consentsQuery.isLoading ? (
          <SkeletonList rows={3} />
        ) : consentsQuery.isError ? (
          <ErrorState
            title={t('common:status.error')}
            onRetry={() => void consentsQuery.refetch()}
            retryLabel={t('common:actions.retry')}
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {(consentsQuery.data ?? []).map((consent) => (
              <li key={consent.consentType} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {t(`privacy:consentTypes.${consent.consentType}.label`)}
                  </p>
                  <p className="text-sm text-foreground-secondary">
                    {t(`privacy:consentTypes.${consent.consentType}.description`)}
                  </p>
                </div>
                <Checkbox
                  id={`consent-${consent.consentType}`}
                  className="shrink-0"
                  checked={consent.granted}
                  disabled={consentMutation.isPending}
                  onChange={(event) =>
                    consentMutation.mutate({
                      consentType: consent.consentType,
                      granted: event.target.checked,
                    })
                  }
                  label={consent.granted ? t('privacy:consents.granted') : t('privacy:consents.notGranted')}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------------ privacy requests */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('privacy:requests.title')}</h2>
          <p className="mt-1 text-sm text-foreground-secondary">{t('privacy:requests.description')}</p>
        </div>

        <form
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault()
            submitMutation.mutate()
          }}
        >
          <FormField label={t('privacy:requests.typeLabel')} htmlFor="privacy-request-type">
            <Select
              id="privacy-request-type"
              value={requestType}
              onChange={(event) => setRequestType(event.target.value as PrivacyRequestType)}
            >
              {REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`privacy:requestTypes.${type}`)}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label={t('privacy:requests.detailsLabel')} htmlFor="privacy-request-details">
            <Textarea
              id="privacy-request-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={4}
              maxLength={4000}
              placeholder={t('privacy:requests.detailsPlaceholder')}
            />
          </FormField>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={submitMutation.isPending} disabled={submitMutation.isPending}>
              {t('privacy:requests.submit')}
            </Button>
          </div>
        </form>

        {requestsQuery.isLoading ? (
          <SkeletonList rows={3} />
        ) : requestsQuery.isError ? (
          <ErrorState
            title={t('common:status.error')}
            onRetry={() => void requestsQuery.refetch()}
            retryLabel={t('common:actions.retry')}
          />
        ) : (requestsQuery.data ?? []).length === 0 ? (
          <EmptyState title={t('privacy:requests.empty')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {(requestsQuery.data ?? []).map((request) => (
              <li key={request.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-foreground">
                    {t(`privacy:requestTypes.${request.requestType}`)}
                  </h3>
                  <StatusBadge tone={PRIVACY_REQUEST_TONE[request.state]}>
                    {t(`privacy:requestStates.${request.state}`)}
                  </StatusBadge>
                </div>
                <p className="text-xs text-foreground-secondary">
                  {t('privacy:requests.submittedAt', {
                    date: formatDate(request.submittedAt),
                  })}
                </p>
                {request.details && <p className="text-sm text-foreground">{request.details}</p>}
                {request.resolutionNote && (
                  <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-foreground">
                    <span className="font-medium">{t('privacy:requests.outcome')}: </span>
                    {request.resolutionNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
