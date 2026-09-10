import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import * as authApi from '../../auth/api/authApi'
import * as avatarApi from '../api/avatarApi'
import { useAuth } from '../../../lib/auth/AuthContext'
import { useAvatarSrc } from '../../../lib/api/useAvatarSrc'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import {
  Alert,
  Avatar,
  Button,
  Card,
  ConfirmationDialog,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../../../components/ui'
import { PageContainer } from '../../../app/layouts/PageContainer'

/**
 * Role-neutral account identity: email, the profile picture every user can set, and session
 * control.
 *
 * <p>Phase 15 added "sign out everywhere". {@code POST /auth/logout-all} has existed since Phase 1
 * and revokes EVERY refresh-token family for the account, not just this browser's — which is the
 * one thing a person can do themselves after losing a device or suspecting their password is known
 * (CLAUDE.md sections 17-19). It had an API client and no button, so nobody could reach it.
 *
 * <p>It ends this session too, by design: the current browser's refresh token is one of the ones
 * being revoked, so the page signs out locally rather than leaving an access token that will fail
 * at its next refresh.
 */
export function AccountProfilePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [confirmingSignOutAll, setConfirmingSignOutAll] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const meQuery = useQuery({ queryKey: ['me'], queryFn: authApi.getMe })
  const avatarSrc = useAvatarSrc(meQuery.data?.id, meQuery.data?.hasAvatar ?? false)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      setError(null)
      return avatarApi.uploadMyAvatar(file).catch((cause) => {
        setError(apiErrorMessage(t, 'account', 'profile', cause))
        throw cause
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] })
      void queryClient.invalidateQueries({ queryKey: ['avatar'] })
      if (inputRef.current) inputRef.current.value = ''
    },
  })

  const signOutEverywhereMutation = useMutation({
    mutationFn: async () => {
      setError(null)
      await authApi.logoutAll().catch((cause) => {
        setError(apiErrorMessage(t, 'account', 'profile', cause))
        throw cause
      })
      // This browser's own refresh token was in the revoked set, so drop the local session too.
      await signOut()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  if (meQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('common:status.loading')} />
      </PageContainer>
    )
  }

  const me = meQuery.data
  if (meQuery.isError || !me) {
    return (
      <PageContainer>
        <ErrorState
          title={t('common:status.error')}
          onRetry={() => void meQuery.refetch()}
          retryLabel={t('common:actions.retry')}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('account:profile.title')} description={t('account:profile.subtitle')} />

      {error && <Alert tone="danger">{error}</Alert>}

      <Card padding="lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar src={avatarSrc} name={me.email} size="lg" />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="truncate font-medium text-foreground">{me.email}</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png"
                aria-label={t('account:profile.changePicture')}
                className="text-sm text-foreground-secondary file:mr-3 file:rounded-md file:border-0 file:bg-brand-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-on-brand"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) uploadMutation.mutate(file)
                }}
                disabled={uploadMutation.isPending}
              />
              {uploadMutation.isPending && (
                <span className="text-xs text-foreground-secondary">
                  {t('account:profile.uploading')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">{t('account:profile.hint')}</p>
          </div>
        </div>
      </Card>

      <Card padding="lg" className="flex flex-col gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{t('account:profile.sessionsTitle')}</h2>
          <p className="text-sm text-foreground-secondary">{t('account:profile.sessionsBody')}</p>
        </div>
        <Button
          variant="danger"
          className="self-start"
          loading={signOutEverywhereMutation.isPending}
          onClick={() => setConfirmingSignOutAll(true)}
        >
          {t('account:profile.signOutEverywhere')}
        </Button>
      </Card>

      <ConfirmationDialog
        open={confirmingSignOutAll}
        onClose={() => setConfirmingSignOutAll(false)}
        onConfirm={() => signOutEverywhereMutation.mutate()}
        closeLabel={t('common:actions.close')}
        title={t('account:profile.signOutEverywhereTitle')}
        description={t('account:profile.signOutEverywhereDescription')}
        confirmLabel={t('account:profile.signOutEverywhere')}
        cancelLabel={t('common:actions.cancel')}
        destructive
        loading={signOutEverywhereMutation.isPending}
      />
    </PageContainer>
  )
}
