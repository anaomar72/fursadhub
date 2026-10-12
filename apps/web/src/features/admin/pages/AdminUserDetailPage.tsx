import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  Alert,
  Breadcrumbs,
  Button,
  ConfirmationDialog,
  ErrorState,
  FormField,
  Modal,
  Panel,
  SkeletonList,
  StatusBadge,
  Textarea,
  useToast,
} from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { AdminDetailSkeleton } from '../components/AdminSkeletons'
import { AdminDetailLayout, DangerZone, DetailSection } from '../components/AdminDetailLayout'
import * as adminApi from '../api/adminApi'
import { adminQueries } from '../adminQueries'
import { USER_STATUS_TONE } from '../statusTone'
import { formatDateTime } from '../../../lib/utils/formatDate'
import { DetailField } from '../components/DetailField'

/**
 * One account (Phase 8 layout): identity on the left, its state and the one command that state
 * allows on the right, its platform grants and what the console deliberately cannot show below.
 *
 * <p>The only two commands are the only two the backend has — suspend and reactivate
 * ({@code AdminAccountService}). FursadHub has no admin endpoint to delete an account, edit its
 * email, read or reset its password, inspect its sessions or act as it, so none is offered.
 *
 * <p>Suspension signs the person out everywhere in the same transaction (every active refresh
 * session is revoked), so it sits in its own danger panel, states that consequence, and runs only
 * after confirmation. The status changes on screen only after the API confirms it.
 *
 * <p>Platform grants come from the same list the platform-roles page reads, filtered to this account
 * — a cache hit when the reviewer came from there, and nothing beyond what that page already shows.
 * Tenant memberships have no platform-wide endpoint, and the page says so rather than guessing.
 */
export function AdminUserDetailPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { userId = '' } = useParams()
  const queryClient = useQueryClient()

  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<'suspend' | 'reactivate' | null>(null)
  const [reason, setReason] = useState('')

  const userQuery = useQuery(adminQueries.user(userId))
  const grantsQuery = useQuery({ ...adminQueries.platformRoles(), retry: false })

  function afterChange(message: string) {
    setConfirming(null)
    setReason('')
    void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
    toast.success(message)
  }

  const run = (call: () => Promise<unknown>) => {
    setError(null)
    return call().catch((cause) => {
      setError(apiErrorMessage(t, 'admin', 'users', cause))
      setConfirming(null)
      throw cause
    })
  }

  const suspendMutation = useMutation({
    mutationFn: () => run(() => adminApi.suspendUser(userId, reason.trim())),
    onSuccess: () => afterChange(t('admin:users.done.suspend')),
  })
  const reactivateMutation = useMutation({
    mutationFn: () => run(() => adminApi.reactivateUser(userId)),
    onSuccess: () => afterChange(t('admin:users.done.reactivate')),
  })

  const crumbs = [{ label: t('admin:users.title'), to: '/admin/users' }]
  const user = userQuery.data

  if (userQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[...crumbs, { label: t('admin:users.account') }]} />
        <AdminDetailSkeleton />
      </div>
    )
  }

  if (userQuery.isError || !user) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[...crumbs, { label: t('admin:users.account') }]} />
        <ErrorState
          title={t('common:status.error')}
          description={t('admin:users.notFound')}
          onRetry={() => void userQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      </div>
    )
  }

  const pending = suspendMutation.isPending || reactivateMutation.isPending
  const grants = (grantsQuery.data ?? []).filter((grant) => grant.userId === user.id)

  return (
    <>
      <AdminDetailLayout
        breadcrumbs={[...crumbs, { label: user.email }]}
        eyebrow={t('admin:users.account')}
        title={user.email}
        status={<StatusBadge tone={USER_STATUS_TONE[user.status]}>{t(`admin:statusLabels.${user.status}`)}</StatusBadge>}
        notice={error && <Alert tone="danger">{error}</Alert>}
        asideLabel={t('admin:users.stateTitle')}
        summary={
          <DetailSection title={t('admin:users.accountDetails')}>
            <DetailField label={t('admin:users.email')}>{user.email}</DetailField>
            <DetailField label={t('admin:users.locale')}>{t(`admin:locales.${user.preferredLocale}`, user.preferredLocale)}</DetailField>
            <DetailField label={t('admin:users.registered')}>{formatDateTime(user.createdAt)}</DetailField>
            <DetailField label={t('admin:users.emailVerified')}>
              {user.emailVerifiedAt ? formatDateTime(user.emailVerifiedAt) : t('admin:users.notVerified')}
            </DetailField>
          </DetailSection>
        }
        aside={
          <>
            <Panel title={t('admin:users.stateTitle')}>
              <p className="text-body text-foreground-secondary">{t(`admin:users.stateHelp.${user.status}`)}</p>
              {user.status === 'SUSPENDED' && (
                <Button className="mt-4" onClick={() => setConfirming('reactivate')} disabled={pending}>
                  {t('admin:users.actions.reactivate')}
                </Button>
              )}
            </Panel>
            {(user.status === 'ACTIVE' || user.status === 'PENDING_CONTACT_VERIFICATION') && (
              <DangerZone title={t('admin:users.dangerTitle')} description={t('admin:users.suspendDescription')}>
                <Button
                  variant="danger"
                  disabled={pending}
                  onClick={() => {
                    setReason('')
                    setConfirming('suspend')
                  }}
                >
                  {t('admin:users.actions.suspend')}
                </Button>
              </DangerZone>
            )}
          </>
        }
        main={
          <>
            <Panel
              title={t('admin:users.platformRoles.title')}
              description={t('admin:users.platformRoles.description')}
              action={
                <Link
                  to="/admin/platform-roles"
                  className="rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {t('admin:users.platformRoles.manage')}
                </Link>
              }
            >
              {grantsQuery.isLoading ? (
                <SkeletonList rows={1} />
              ) : grantsQuery.isError ? (
                <ErrorState variant="inline" onRetry={() => void grantsQuery.refetch()} retryLabel={t('common:actions.retry')} />
              ) : grants.length === 0 ? (
                <p className="text-body text-foreground-secondary">{t('admin:users.platformRoles.none')}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {grants.map((grant) => (
                    <li key={grant.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-body font-semibold text-foreground">{t(`admin:platformRoleNames.${grant.role}`)}</span>
                      <span className="text-caption text-foreground-secondary">
                        {grant.active
                          ? t('admin:users.platformRoles.since', { date: formatDateTime(grant.grantedAt) })
                          : t('admin:users.platformRoles.revokedOn', { date: formatDateTime(grant.revokedAt) })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title={t('admin:users.notShown.title')}>
              <div className="flex flex-col gap-2 text-body text-foreground-secondary">
                <p>{t('admin:users.notShown.body')}</p>
                <p>{t('admin:users.notShown.memberships')}</p>
              </div>
            </Panel>
          </>
        }
      />

      {/* Suspension takes an audit note, so it is a form rather than a bare confirmation. The note is
          internal: AdminAccountService records it in the audit trail and does NOT send it on. */}
      <Modal
        open={confirming === 'suspend'}
        onClose={() => setConfirming(null)}
        closeLabel={t('common:actions.close')}
        title={t('admin:users.suspendTitle')}
        description={t('admin:users.suspendDescription')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="danger" loading={suspendMutation.isPending} onClick={() => suspendMutation.mutate()}>
              {t('admin:users.actions.suspend')}
            </Button>
          </>
        }
      >
        <FormField label={t('admin:users.reasonLabel')} htmlFor="suspend-reason" hint={t('admin:users.reasonHint')}>
          <Textarea
            id="suspend-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('admin:users.reasonPlaceholder')}
          />
        </FormField>
      </Modal>

      <ConfirmationDialog
        open={confirming === 'reactivate'}
        onClose={() => setConfirming(null)}
        onConfirm={() => reactivateMutation.mutate()}
        closeLabel={t('common:actions.close')}
        title={t('admin:users.reactivateTitle')}
        description={t('admin:users.reactivateDescription')}
        confirmLabel={t('admin:users.actions.reactivate')}
        cancelLabel={t('common:actions.cancel')}
        loading={reactivateMutation.isPending}
      />
    </>
  )
}
