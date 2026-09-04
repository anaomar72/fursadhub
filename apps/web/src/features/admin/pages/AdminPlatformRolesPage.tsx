import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Card,
  ConfirmationDialog,
  DataTable,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'
import { formatDateTime } from '../../../lib/utils/formatDate'
import type { PlatformAdminGrant, PlatformRole } from '../types'

/** The only two platform roles that exist (CLAUDE.md section 23). Not an editable list. */
const ROLES: PlatformRole[] = ['SUPER_ADMIN', 'VERIFICATION_OFFICER']

/**
 * Platform roles — FursadHub's "roles and permissions" screen (CLAUDE.md section 23).
 *
 * <p>What this screen is NOT: a permission editor. FursadHub has no permission model to edit. The
 * two platform roles are a Java enum, and what each may do is compiled into
 * {@code PlatformAuthorization} — {@code requireReviewer} admits both, {@code requireSuperAdmin}
 * admits one. There is no endpoint to define a role, add a permission to one, or change what a role
 * means, so this page grants and revokes the two that exist and says plainly what each carries.
 * Building a frontend permission editor over an enum would be inventing a capability.
 *
 * <p>Revoked grants stay listed. Who held platform authority and when is exactly the history
 * CLAUDE.md section 51 forbids silently overwriting, so revocation is a soft close rather than a
 * delete — and the table shows it that way.
 *
 * <p>The grant form takes a user ID rather than an email on purpose: an administrator should have to
 * look the account up first, which makes granting platform authority to the wrong person through a
 * typo considerably harder.
 */
export function AdminPlatformRolesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<PlatformRole>('VERIFICATION_OFFICER')
  const [error, setError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<PlatformAdminGrant | null>(null)

  const grantsQuery = useQuery({
    queryKey: ['admin', 'platform-roles'],
    queryFn: adminApi.listPlatformRoles,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'platform-roles'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'session'] })
  }

  const grantMutation = useMutation({
    mutationFn: () => {
      setError(null)
      return adminApi.grantPlatformRole(userId.trim(), role).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'platformRoles', cause))
        throw cause
      })
    },
    onSuccess: () => {
      setUserId('')
      invalidate()
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (grantId: string) => {
      setError(null)
      return adminApi.revokePlatformRole(grantId).catch((cause) => {
        setError(apiErrorMessage(t, 'admin', 'platformRoles', cause))
        throw cause
      })
    },
    onSuccess: () => {
      setRevoking(null)
      invalidate()
    },
  })

  const columns: DataTableColumn<PlatformAdminGrant>[] = [
    {
      key: 'holder',
      header: t('admin:platformRoles.holder'),
      render: (grant) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {grant.email ?? t('admin:platformRoles.unknownAccount')}
          </p>
          <p className="font-mono text-xs text-muted">{grant.userId}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('admin:platformRoles.role'),
      render: (grant) => (
        <span className="text-foreground-secondary">{t(`admin:platformRoles.roles.${grant.role}`)}</span>
      ),
    },
    {
      key: 'state',
      header: t('admin:platformRoles.state'),
      render: (grant) => (
        <StatusBadge tone={grant.active ? 'success' : 'neutral'}>
          {grant.active ? t('admin:platformRoles.active') : t('admin:platformRoles.revoked')}
        </StatusBadge>
      ),
    },
    {
      key: 'grantedAt',
      header: t('admin:platformRoles.grantedAt'),
      className: 'whitespace-nowrap',
      render: (grant) => (
        <span className="text-foreground-secondary">{formatDateTime(grant.grantedAt)}</span>
      ),
    },
    {
      key: 'revokedAt',
      header: t('admin:platformRoles.revokedAt'),
      className: 'whitespace-nowrap',
      render: (grant) => (
        <span className="text-foreground-secondary">
          {grant.revokedAt ? formatDateTime(grant.revokedAt) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">{t('admin:platformRoles.revoke')}</span>,
      render: (grant) =>
        grant.active ? (
          <Button
            size="sm"
            variant="danger"
            disabled={revokeMutation.isPending}
            onClick={() => setRevoking(grant)}
          >
            {t('admin:platformRoles.revoke')}
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('admin:dashboard.eyebrow')}
        title={t('admin:platformRoles.title')}
        description={t('admin:platformRoles.description')}
      />

      {error && <Alert tone="danger">{error}</Alert>}

      <Card padding="lg" className="flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-foreground">{t('admin:platformRoles.grantTitle')}</h2>
          <p className="text-sm text-foreground-secondary">{t('admin:platformRoles.grantHint')}</p>
        </div>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            if (!userId.trim()) return
            grantMutation.mutate()
          }}
        >
          <FormField
            label={t('admin:platformRoles.userId')}
            htmlFor="grant-user-id"
            className="flex-1"
          >
            <Input
              id="grant-user-id"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder={t('admin:platformRoles.userIdPlaceholder')}
            />
          </FormField>
          <FormField label={t('admin:platformRoles.role')} htmlFor="grant-role" className="sm:w-64">
            <Select
              id="grant-role"
              value={role}
              onChange={(event) => setRole(event.target.value as PlatformRole)}
            >
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {t(`admin:platformRoles.roles.${value}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <Button type="submit" loading={grantMutation.isPending} disabled={!userId.trim()}>
            {t('admin:platformRoles.grant')}
          </Button>
        </form>
        <p className="text-xs text-muted">{t(`admin:platformRoles.roleMeaning.${role}`)}</p>
      </Card>

      {grantsQuery.isLoading ? (
        <LoadingState label={t('common:status.loading')} />
      ) : grantsQuery.isError ? (
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void grantsQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      ) : (
        <DataTable
          caption={t('admin:platformRoles.title')}
          columns={columns}
          rows={grantsQuery.data ?? []}
          rowKey={(grant) => grant.id}
          empty={<EmptyState title={t('admin:platformRoles.empty')} />}
        />
      )}

      <ConfirmationDialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        onConfirm={() => revoking && revokeMutation.mutate(revoking.id)}
        closeLabel={t('common:actions.close')}
        title={t('admin:platformRoles.revokeTitle')}
        description={t('admin:platformRoles.revokeDescription', {
          holder: revoking?.email ?? revoking?.userId ?? '',
        })}
        confirmLabel={t('admin:platformRoles.revoke')}
        cancelLabel={t('common:actions.cancel')}
        destructive
        loading={revokeMutation.isPending}
      />
    </div>
  )
}
