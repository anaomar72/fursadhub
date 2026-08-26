import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, FormField, Input, LoadingSpinner, Select, StatusBadge } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import * as adminApi from '../api/adminApi'
import type { PlatformRole } from '../types'

const ROLES: PlatformRole[] = ['SUPER_ADMIN', 'VERIFICATION_OFFICER']

/**
 * Granting and revoking platform roles (CLAUDE.md section 23).
 *
 * <p>Revoked grants stay listed. Who held platform authority and when is exactly the history
 * CLAUDE.md section 51 forbids silently overwriting, so revocation is a soft close rather than a
 * delete — and the list shows it that way.
 *
 * <p>The grant form takes a user ID rather than an email on purpose: an administrator should have to
 * look the account up on the Accounts page first, which makes granting platform authority to the
 * wrong person through a typo considerably harder.
 */
export function AdminPlatformRolesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<PlatformRole>('VERIFICATION_OFFICER')
  const [error, setError] = useState<string | null>(null)

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
    onSuccess: invalidate,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{t('admin:platformRoles.title')}</h1>
        <p className="mt-1 text-sm text-foreground-secondary">{t('admin:platformRoles.description')}</p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
        onSubmit={(event) => {
          event.preventDefault()
          grantMutation.mutate()
        }}
      >
        <FormField label={t('admin:platformRoles.userId')} htmlFor="grant-user-id" className="w-80">
          <Input
            id="grant-user-id"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder={t('admin:platformRoles.userIdPlaceholder')}
            required
          />
        </FormField>
        <FormField label={t('admin:platformRoles.role')} htmlFor="grant-role" className="w-64">
          <Select id="grant-role" value={role} onChange={(event) => setRole(event.target.value as PlatformRole)}>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {t(`admin:platformRoleNames.${value}`)}
              </option>
            ))}
          </Select>
        </FormField>
        <Button type="submit" loading={grantMutation.isPending} disabled={grantMutation.isPending}>
          {t('admin:platformRoles.grant')}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {grantsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {(grantsQuery.data ?? []).map((grant) => (
            <li key={grant.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {grant.email ?? grant.userId}
                </p>
                <p className="text-xs text-foreground-secondary">
                  {t('admin:platformRoles.grantedAt', {
                    role: t(`admin:platformRoleNames.${grant.role}`),
                    date: new Date(grant.grantedAt).toLocaleDateString(),
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge tone={grant.active ? 'success' : 'neutral'}>
                  {grant.active ? t('admin:platformRoles.active') : t('admin:platformRoles.revoked')}
                </StatusBadge>
                {grant.active && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => revokeMutation.mutate(grant.id)}
                    disabled={revokeMutation.isPending}
                  >
                    {t('admin:platformRoles.revoke')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
