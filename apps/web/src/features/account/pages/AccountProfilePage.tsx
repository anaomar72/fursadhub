import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as authApi from '../../auth/api/authApi'
import * as avatarApi from '../api/avatarApi'
import { useAvatarSrc } from '../../../lib/api/useAvatarSrc'
import { apiErrorMessage } from '../../../lib/api/errorMessage'
import { Avatar, LoadingSpinner, PageHeader } from '../../../components/ui'

/** Role-neutral account identity: email, and the profile picture every user can set (Phase 8). */
export function AccountProfilePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
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

  if (meQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const me = meQuery.data
  if (!me) return null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('account:profile.title')} />

      <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
        <Avatar src={avatarSrc} name={me.email} size="lg" />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">{me.email}</p>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="text-sm text-foreground-secondary file:mr-3 file:rounded-md file:border-0 file:bg-brand-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-on-brand"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) uploadMutation.mutate(file)
              }}
              disabled={uploadMutation.isPending}
            />
            {uploadMutation.isPending && (
              <span className="text-xs text-foreground-secondary">{t('account:profile.uploading')}</span>
            )}
          </div>
          <p className="text-xs text-foreground-secondary">{t('account:profile.hint')}</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
