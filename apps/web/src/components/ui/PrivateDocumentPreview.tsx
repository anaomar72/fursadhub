import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, type ButtonProps } from './Button'

/** Fetches through an authorized business endpoint and releases the blob when the viewer closes. */
export function PrivateDocumentPreview({ load, size }: { load: () => Promise<Blob>; size?: ButtonProps['size'] }) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const urlRef = useRef<string | null>(null)
  const generation = useRef(0)
  const [preview, setPreview] = useState<{ url: string; type: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => () => { generation.current++; if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])
  function close() {
    generation.current++
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setPreview(null)
    setBusy(false)
    dialog.current?.close()
  }
  async function open() {
    setFailed(false)
    setBusy(true)
    dialog.current?.showModal()
    const attempt = ++generation.current
    try {
      const blob = await load()
      if (attempt !== generation.current) return
      const type = blob.type.split(';')[0]
      if (!['image/png', 'image/jpeg', 'application/pdf'].includes(type)) throw new Error('Unsupported preview')
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      setPreview({ url, type })
    } catch { if (attempt === generation.current) setFailed(true) }
    finally { if (attempt === generation.current) setBusy(false) }
  }
  return <>
    <Button type="button" variant="outline" size={size} onClick={() => void open()}>{t('common:documentPreview.open')}</Button>
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); close() }} className="m-auto w-[min(95vw,60rem)] rounded-xl border border-border bg-surface p-5 text-foreground backdrop:bg-black/60" aria-label={t('common:documentPreview.open')}>
      <div className="mb-4 flex items-center justify-between gap-4"><h2 className="font-bold">{t('common:documentPreview.open')}</h2><Button type="button" variant="ghost" onClick={close}>{t('common:actions.close')}</Button></div>
      {busy && <p role="status">{t('common:status.loading')}</p>}
      {failed && <p role="alert" className="text-danger">{t('common:documentPreview.failed')}</p>}
      {preview && (preview.type.startsWith('image/') ? <img src={preview.url} alt={t('common:documentPreview.image')} className="max-h-[75vh] w-full object-contain" /> : <iframe src={preview.url} title={t('common:documentPreview.pdf')} sandbox="" className="h-[70vh] w-full rounded-lg border border-border" />)}
    </dialog>
  </>
}
