import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as legalApi from '../api/legalApi'
import * as universityApi from '../../university/api/universityApi'
import * as organizationApi from '../../organization/api/organizationApi'

interface TermsAcceptanceGateProps {
  children: ReactNode
}

/**
 * Prompts for acceptance of any legal document version the user has not yet accepted
 * (CLAUDE.md section 49).
 *
 * <p><strong>Why this is here and not on the registration form.</strong> A sign-up checkbox would
 * only ever cover new accounts, and would need changing every time a version is published. Checking
 * after authentication handles first sign-in and every later version with the same code — and it
 * covers accounts that already existed before any terms were published.
 *
 * <p>Fails OPEN. If the status call errors, the app renders normally rather than locking everyone
 * out of FursadHub because one endpoint is unavailable — this is a compliance prompt, not an
 * authorization boundary, and the backend enforces nothing on the strength of it.
 *
 * <p>Managed staff (CLAUDE.md section 26A) never saw this prompt at sign-up — they never went
 * through public self-registration to begin with, since an admin created their account directly.
 * {@code DEPARTMENT_COORDINATOR}/{@code UNIVERSITY_SUPERVISOR}/{@code RECRUITER}/
 * {@code ORGANIZATION_SUPERVISOR} are exactly the roles that can only exist through that
 * admin-provisioning path (never through self-registration), so holding one of them is a reliable
 * signal to skip the gate entirely rather than surface a prompt with nowhere it came from.
 */
export function TermsAcceptanceGate({ children }: TermsAcceptanceGateProps) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const locale = i18n.resolvedLanguage ?? 'en'
  const [error, setError] = useState<string | null>(null)

  const universityMembershipQuery = useQuery({
    queryKey: ['university', 'my-membership'],
    queryFn: universityApi.getMyMembership,
    retry: false,
  })
  const organizationMembershipsQuery = useQuery({
    queryKey: ['organization', 'my-memberships'],
    queryFn: organizationApi.getMyMemberships,
    retry: false,
  })
  const isManagedStaff =
    (universityMembershipQuery.data && universityMembershipQuery.data.role !== 'UNIVERSITY_ADMIN') ||
    (organizationMembershipsQuery.data?.[0] && organizationMembershipsQuery.data[0].role !== 'ORGANIZATION_ADMIN')

  const statusQuery = useQuery({
    queryKey: ['legal-status', locale],
    queryFn: () => legalApi.getLegalStatus(locale),
    retry: false,
    enabled: !isManagedStaff,
  })

  const acceptMutation = useMutation({
    mutationFn: (legalDocumentId: string) => {
      setError(null)
      return legalApi.acceptLegalDocument(legalDocumentId).catch((cause) => {
        setError(apiErrorMessage(t, 'legal', 'acceptance', cause))
        throw cause
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['legal-status'] }),
  })

  const outstanding = statusQuery.data?.outstanding ?? []

  // Managed staff, still loading, errored, or nothing outstanding — get out of the way.
  if (isManagedStaff || statusQuery.isLoading || statusQuery.isError || outstanding.length === 0) {
    return <>{children}</>
  }

  const document = outstanding[0]

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-gate-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      >
        <div className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-lg">
          <h2 id="terms-gate-title" className="text-lg font-semibold text-foreground">
            {t('legal:acceptance.title')}
          </h2>

          <p className="text-sm text-foreground-secondary">
            {t('legal:acceptance.body', {
              document: t(`legal:documentTypes.${document.documentType}`),
              version: document.version,
            })}
          </p>

          {outstanding.length > 1 && (
            <p className="text-sm text-foreground-secondary">
              {t('legal:acceptance.remaining', { count: outstanding.length - 1 })}
            </p>
          )}

          <a
            href={`/legal/${document.documentType.toLowerCase().replace(/_/g, '-')}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-brand-primary underline-offset-2 hover:underline"
          >
            {t('legal:acceptance.read')}
          </a>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => acceptMutation.mutate(document.id)}
              loading={acceptMutation.isPending}
              disabled={acceptMutation.isPending}
            >
              {t('legal:acceptance.accept')}
            </Button>
          </div>
        </div>
      </div>
      {children}
    </>
  )
}
