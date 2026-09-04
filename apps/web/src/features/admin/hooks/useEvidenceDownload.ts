import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiErrorMessage } from '../../../lib/api/errorMessage'

/**
 * Fetches a private verification document and hands it to the browser.
 *
 * <p>Deliberately not an `<a href>` pointing at object storage. The bytes stream through the API,
 * which re-authorizes the reviewer and records a {@code PRIVATE_FILE_ACCESSED} audit event on every
 * read — a permanent public URL would bypass both (CLAUDE.md sections 47 and 51). The object URL
 * created here is revoked immediately after the click, so it does not linger as an unauthenticated
 * handle to the document.
 */
export function useEvidenceDownload(
  fetchBlob: () => Promise<Blob>,
  filename: string,
  errorSection: string,
  onError: (message: string) => void,
) {
  const { t } = useTranslation()

  return useMutation({
    mutationFn: async () => {
      const blob = await fetchBlob().catch((cause) => {
        onError(apiErrorMessage(t, 'admin', errorSection, cause))
        throw cause
      })
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(objectUrl)
    },
  })
}
