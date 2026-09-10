import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getMe } from '../../auth/api/authApi'
import { uploadMyAvatar } from '../../account/api/avatarApi'
import { useAvatarSrc } from '../../../lib/api/useAvatarSrc'
import { Avatar, FileUpload } from '../../../components/ui'
import { PhotoCapture } from '../../../components/ui/PhotoCapture'
import { apiErrorMessage } from '../../../lib/api/errorMessage'

export function StudentProfilePhoto({ name }: { name: string }) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })
  const src = useAvatarSrc(me.data?.id, me.data?.hasAvatar ?? false)
  const upload = useMutation({ mutationFn: uploadMyAvatar, onSuccess: () => {
    void client.invalidateQueries({ queryKey: ['me'] })
    void client.invalidateQueries({ queryKey: ['avatar'] })
  } })
  return <div className="flex flex-wrap items-center gap-5">
    <Avatar name={name} src={src} size="lg" className="size-24" />
    <div className="min-w-0 flex-1 space-y-3">
      {/*
        The shared dropzone, not a bare `<input type="file">` wrapped in text-input styling — that
        rendered the browser's default "Choose File / No file chosen" inside a bordered box, which
        looked unfinished next to the organization and university profile editors, both of which
        already use this control for their logo and cover. One media control across all three
        profile editors.
      */}
      <FileUpload
        label={t('account:profile.changePicture')}
        hint={t('account:profile.hint')}
        accept="image/png,image/jpeg"
        disabled={upload.isPending}
        onFiles={(files) => {
          const file = files[0]
          if (file) upload.mutate(file)
        }}
      />
      <PhotoCapture disabled={upload.isPending} onUse={(file) => upload.mutate(file)} />
      {upload.isError && <p role="alert" className="text-sm text-danger">{apiErrorMessage(t, 'account', 'profile', upload.error)}</p>}
      <p className="text-sm text-foreground-secondary">{me.data?.email}</p>
    </div>
  </div>
}
