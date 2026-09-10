import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

/** Camera access starts only on an explicit button click; captured bytes remain local until Use photo. */
export function PhotoCapture({ onUse, disabled = false }: { onUse: (file: File) => void; disabled?: boolean }) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const generation = useRef(0)
  const previewUrl = useRef<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  function stop() {
    generation.current++
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
  }

  function releasePreview() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = null
    setPreview(null)
  }

  function close() {
    stop()
    releasePreview()
    setPhoto(null)
    setReady(false)
    dialog.current?.close()
  }

  useEffect(() => () => {
    generation.current++
    stream.current?.getTracks().forEach((track) => track.stop())
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
  }, [])

  async function start() {
    stop()
    releasePreview()
    setPhoto(null)
    setReady(false)
    setError(false)
    if (!dialog.current?.open) dialog.current?.showModal()
    const attempt = generation.current
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if (attempt !== generation.current) {
        acquired.getTracks().forEach((track) => track.stop())
        return
      }
      stream.current = acquired
      if (video.current) {
        video.current.srcObject = acquired
        await video.current.play()
      }
    } catch {
      if (attempt === generation.current) { stop(); setError(true) }
    }
  }

  function capture() {
    if (!video.current || !ready) return
    const canvas = document.createElement('canvas')
    canvas.width = video.current.videoWidth
    canvas.height = video.current.videoHeight
    canvas.getContext('2d')?.drawImage(video.current, 0, 0)
    stop()
    setReady(false)
    const attempt = generation.current
    canvas.toBlob((blob) => {
      if (attempt !== generation.current) return
      if (!blob) { setError(true); return }
      previewUrl.current = URL.createObjectURL(blob)
      setPreview(previewUrl.current)
      setPhoto(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.9)
  }

  return <>
    <Button type="button" variant="outline" disabled={disabled} onClick={() => void start()}>{t('common:photo.take')}</Button>
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); close() }} className="m-auto w-[min(92vw,36rem)] rounded-xl border border-border bg-surface p-5 text-foreground backdrop:bg-black/60" aria-label={t('common:photo.take')}>
      <h2 className="mb-4 text-lg font-bold">{t('common:photo.take')}</h2>
      <video ref={video} hidden={!!photo || error} autoPlay muted playsInline onLoadedData={() => setReady(!!stream.current)} className="aspect-video w-full rounded-lg bg-black object-contain" aria-label={t('common:photo.live')} />
      {photo && preview && <img src={preview} alt={t('common:photo.preview')} className="max-h-96 w-full rounded-lg object-contain" />}
      {error && <p role="alert" className="text-sm text-danger">{t('common:photo.unavailable')}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {photo ? <>
          <Button type="button" onClick={() => { const captured = photo; close(); onUse(captured) }}>{t('common:photo.use')}</Button>
          <Button type="button" variant="outline" onClick={() => void start()}>{t('common:photo.retake')}</Button>
        </> : !error && <Button type="button" disabled={!ready} onClick={capture}>{t('common:photo.capture')}</Button>}
        <Button type="button" variant="ghost" onClick={close}>{t('common:actions.cancel')}</Button>
      </div>
    </dialog>
  </>
}
