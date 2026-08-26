import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, StatusIndicator } from '../../../components/ui'
import { apiErrorMessage } from '../../../lib/api/errorMessage'

interface PrivateDocumentUploadProps {
  title: string
  description: string
  /** Whether a document is already on file. */
  present: boolean
  accept: string
  /** i18n page key under the `student` namespace, for machine-readable error lookup. */
  errorPage: string
  /** Query keys to invalidate after a successful upload or removal. */
  invalidateKeys: unknown[][]
  onUpload: (file: File) => Promise<unknown>
  onDownload: () => Promise<Blob>
  onRemove?: () => Promise<unknown>
  downloadFilename: string
}

/**
 * Upload, replace, download and (optionally) remove one private document.
 *
 * <p>Shared by the CV on the profile page and the evidence on the enrollment page, so both get the
 * same handling of the things that matter: errors branch on the API's stable `code` rather than its
 * prose (CLAUDE.md section 11), the state is stated in words as well as an indicator, and downloading
 * streams the bytes through the authorized endpoint into a short-lived blob rather than linking to
 * storage (CLAUDE.md section 47).
 */
export function PrivateDocumentUpload({
  title,
  description,
  present,
  accept,
  errorPage,
  invalidateKeys,
  onUpload,
  onDownload,
  onRemove,
  downloadFilename,
}: PrivateDocumentUploadProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function invalidate() {
    invalidateKeys.forEach((key) => void queryClient.invalidateQueries({ queryKey: key }))
  }

  function run<T>(promise: Promise<T>) {
    setError(null)
    return promise.catch((cause) => {
      setError(apiErrorMessage(t, 'student', errorPage, cause))
      throw cause
    })
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => run(onUpload(file)),
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: () => run(onRemove!()),
    onSuccess: invalidate,
  })

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const blob = await run(onDownload())
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = downloadFilename
      anchor.click()
      // Released immediately so the blob does not outlive the click that needed it.
      URL.revokeObjectURL(objectUrl)
    },
  })

  const busy = uploadMutation.isPending || removeMutation.isPending || downloadMutation.isPending

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-foreground-secondary">{description}</p>
      </div>

      {/* State in words and an indicator — never colour alone. */}
      <StatusIndicator
        tone={present ? 'success' : 'neutral'}
        label={present ? t('student:documents.onFile') : t('student:documents.notUploaded')}
      />

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={title}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) uploadMutation.mutate(file)
          // Cleared so choosing the same filename again still fires a change event.
          event.target.value = ''
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          loading={uploadMutation.isPending}
        >
          {present ? t('student:documents.replace') : t('student:documents.upload')}
        </Button>
        {present && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => downloadMutation.mutate()}
            disabled={busy}
          >
            {t('student:documents.download')}
          </Button>
        )}
        {present && onRemove && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => removeMutation.mutate()}
            disabled={busy}
          >
            {t('student:documents.remove')}
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  )
}
