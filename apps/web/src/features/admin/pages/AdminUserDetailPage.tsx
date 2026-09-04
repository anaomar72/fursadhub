import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  ConfirmationDialog,
  ErrorState,
  FormField,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
  Textarea,
} from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'
import { USER_STATUS_TONE } from '../statusTone'
import { formatDateTime } from '../../../lib/utils/formatDate'
import { DetailField } from '../components/DetailField'
import type { AdminUser } from '../types'

/**
 * One account (Phase 7 "Admin: account administration").
 *
 * <p>Reached from the directory, and backed by {@code GET /admin/users/{userId}} — an endpoint
 * {@code AdminController} has always exposed and the web app simply never called, so the console
 * previously had no way to look at a single account before acting on it.
 *
 * <p>The only two commands here are the only two the backend has: suspend and reactivate. There is
 * deliberately nothing else. FursadHub has no admin endpoint to delete an account, edit somebody's
 * email, read or reset their password, inspect their sessions, or act as them — so this page offers
 * none of those, rather than showing a control that would 404.
 *
 * <p>Suspension is destructive in the way that matters — {@code AdminAccountService.suspend} revokes
 * every active refresh session in the same transaction, signing the person out everywhere — so it
 * asks first, and the state only changes after the API confirms it.
 */
export function AdminUserDetailPage() {
  const { t } = useTranslation()
  const { userId = '' } = useParams()
  const queryClient = useQueryClient()

  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<'suspend' | 'reactivate' | null>(null)
  const [reason, setReason] = useState('')

  const userQuery = useQuery({
    queryKey: ['admin', 'users', 'detail', userId],
    queryFn: () => adminApi.getUser(userId),
  })

  function afterChange() {
    setConfirming(null)
    setReason('')
    void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'statistics'] })
  }

  const suspendMutation = useMutation({
    mutationFn: () => {
      setError(null)
      return adminApi.suspendUser(userId, reason).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'users', cause))
        throw cause
      })
    },
    onSuccess: afterChange,
  })

  const reactivateMutation = useMutation({
    mutationFn: () => {
      setError(null)
      return adminApi.reactivateUser(userId).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'users', cause))
        throw cause
      })
    },
    onSuccess: afterChange,
  })

  const pending = suspendMutation.isPending || reactivateMutation.isPending

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: t('admin:users.title'), to: '/admin/users' },
          { label: userQuery.data?.email ?? t('admin:users.account') },
        ]}
      />

      {userQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : userQuery.isError || !userQuery.data ? (
        <ErrorState
          title={t('common:status.error')}
          description={t('admin:users.notFound')}
          onRetry={() => void userQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <>
          <PageHeader
            eyebrow={t('admin:users.account')}
            title={userQuery.data.email}
            actions={
              <AccountActions
                user={userQuery.data}
                pending={pending}
                onSuspend={() => {
                  setReason('')
                  setConfirming('suspend')
                }}
                onReactivate={() => setConfirming('reactivate')}
              />
            }
          />

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card padding="lg" className="flex flex-col gap-4">
              <h2 className="font-semibold text-foreground">{t('admin:users.accountDetails')}</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailField label={t('admin:users.status')}>
                  <StatusBadge tone={USER_STATUS_TONE[userQuery.data.status]}>
                    {t(`admin:statusLabels.${userQuery.data.status}`)}
                  </StatusBadge>
                </DetailField>
                <DetailField label={t('admin:users.locale')}>
                  {t(`admin:locales.${userQuery.data.preferredLocale}`, userQuery.data.preferredLocale)}
                </DetailField>
                <DetailField label={t('admin:users.registered')}>
                  {formatDateTime(userQuery.data.createdAt)}
                </DetailField>
                <DetailField label={t('admin:users.emailVerified')}>
                  {userQuery.data.emailVerifiedAt
                    ? formatDateTime(userQuery.data.emailVerifiedAt)
                    : t('admin:users.notVerified')}
                </DetailField>
              </dl>
            </Card>

            <Card padding="lg" className="flex flex-col gap-3">
              <h2 className="font-semibold text-foreground">{t('admin:users.notShown.title')}</h2>
              <p className="text-sm text-foreground-secondary">{t('admin:users.notShown.body')}</p>
              <p className="text-sm text-foreground-secondary">{t('admin:users.notShown.memberships')}</p>
            </Card>
          </div>

          {/* Suspension takes an audit note, so it is a form rather than a bare confirmation. The
              note is internal: AdminAccountService records it in the audit trail and deliberately
              does NOT send it to the account holder. */}
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
                <Button
                  variant="danger"
                  loading={suspendMutation.isPending}
                  onClick={() => suspendMutation.mutate()}
                >
                  {t('admin:users.actions.suspend')}
                </Button>
              </>
            }
          >
            <FormField
              label={t('admin:users.reasonLabel')}
              htmlFor="suspend-reason"
              hint={t('admin:users.reasonHint')}
            >
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
      )}
    </div>
  )
}

/**
 * Which command is offered, from the account's current state.
 *
 * <p>A convenience only: {@code AdminAccountService} re-checks the state and refuses a suspension of
 * a CLOSED account or a reactivation of anything that is not SUSPENDED, whatever this renders.
 */
function AccountActions({
  user,
  pending,
  onSuspend,
  onReactivate,
}: {
  user: AdminUser
  pending: boolean
  onSuspend: () => void
  onReactivate: () => void
}) {
  const { t } = useTranslation()

  if (user.status === 'SUSPENDED') {
    return (
      <Button onClick={onReactivate} disabled={pending}>
        {t('admin:users.actions.reactivate')}
      </Button>
    )
  }
  if (user.status === 'CLOSED') {
    return <p className="text-sm text-muted">{t('admin:users.closedNoActions')}</p>
  }
  return (
    <Button variant="danger" onClick={onSuspend} disabled={pending}>
      {t('admin:users.actions.suspend')}
    </Button>
  )
}

