import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils/cn'
import { Icon, type IconName } from './Icon'
import { IconButton } from './IconButton'
import { DEFAULT_TOAST_DURATION, ToastContext, type ToastApi, type ToastOptions, type ToastTone } from './toastContext'

export type { ToastTone } from './toastContext'

const TONE_EDGE: Record<ToastTone, string> = {
  info: 'before:bg-info',
  success: 'before:bg-success',
  warning: 'before:bg-warning',
  danger: 'before:bg-danger',
}

const TONE_ICON: Record<ToastTone, { name: IconName; className: string }> = {
  info: { name: 'info', className: 'text-info' },
  success: { name: 'check', className: 'text-success' },
  warning: { name: 'alert', className: 'text-warning' },
  danger: { name: 'alert', className: 'text-danger' },
}

/** How long the exit animation runs before the toast leaves the DOM (matches --duration-fast). */
const EXIT_MS = 150
/** Oldest toasts are dropped beyond this, so a burst of actions never buries the page. */
const MAX_TOASTS = 4

export interface ToastProps {
  title: string
  description?: ReactNode
  tone?: ToastTone
  action?: ReactNode
  onClose: () => void
  /** Plays the exit animation. */
  leaving?: boolean
  className?: string
}

/**
 * One notification card. Presentational — timing, stacking and announcements belong to
 * {@link ToastProvider}. It carries no live-region role of its own: the provider announces each
 * toast once through a persistent region, so a toast is never read twice.
 *
 * <p>Tone is carried three ways — icon shape, a coloured leading edge, and the words — never by
 * colour alone.
 */
export function Toast({ title, description, tone = 'info', action, onClose, leaving = false, className }: ToastProps) {
  const { t } = useTranslation()
  const icon = TONE_ICON[tone]
  return (
    <div
      className={cn(
        'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border border-border bg-surface-raised py-3.5 pe-2 ps-4 text-foreground shadow-md',
        "before:absolute before:inset-y-0 before:start-0 before:w-1 before:content-['']",
        TONE_EDGE[tone],
        leaving ? 'motion-safe:animate-toast-out' : 'motion-safe:animate-toast-in',
        className,
      )}
    >
      <Icon name={icon.name} className={cn('mt-0.5 size-5 shrink-0', icon.className)} />
      <div className="min-w-0 flex-1">
        <p className="break-words text-body font-semibold">{title}</p>
        {description && <div className="mt-0.5 break-words text-body text-foreground-secondary">{description}</div>}
        {action && <div className="mt-2 text-body">{action}</div>}
      </div>
      <IconButton size="sm" label={t('common:a11y.dismissNotification')} onClick={onClose}>
        <Icon name="close" className="size-4" />
      </IconButton>
    </div>
  )
}

/** The fixed stack toasts render into: top of the screen on a phone, top-right from `sm` up. */
export function ToastViewport({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('common:a11y.notifications')}
      className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col gap-2 sm:start-auto sm:end-4 sm:w-96"
    >
      {children}
    </section>
  )
}

interface ToastRecord extends ToastOptions {
  id: string
  tone: ToastTone
  title: string
  leaving: boolean
}

let toastSequence = 0

/**
 * Mounts the toast stack and provides {@link useToast}. Mounted once, in `AppProviders`.
 *
 * <p><strong>Announcements.</strong> Two visually hidden live regions exist from the first render —
 * polite for success/info/warning, assertive for errors — and each new toast's text is written into
 * the matching one. A live region that is created at the same moment as its content is announced
 * unreliably across screen readers; one that already exists is not.
 *
 * <p><strong>Timing.</strong> Success/info dismiss after 6s, warnings after 12s, errors never. The
 * clock stops while the pointer is over a toast or focus is inside it, and restarts in full when it
 * leaves, so nobody loses a message while reading it or reaching its dismiss button.
 *
 * <p><strong>Motion.</strong> Enter/exit are opacity + a few pixels of translate. Under
 * `prefers-reduced-motion` the animations are not applied at all; the toast simply appears.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  // Each announcement is keyed, so it renders as a NEW node: a live region ignores an update that
  // leaves its text unchanged, which would make a second identical "Saved" toast silent.
  const [politeMessage, setPoliteMessage] = useState<{ key: string; text: string } | null>(null)
  const [assertiveMessage, setAssertiveMessage] = useState<{ key: string; text: string } | null>(null)
  const timers = useRef(new Map<string, number>())

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const dismiss = useCallback(
    (id: string) => {
      const timer = timers.current.get(id)
      if (timer !== undefined) window.clearTimeout(timer)
      timers.current.delete(id)
      setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)))
      window.setTimeout(() => remove(id), EXIT_MS)
    },
    [remove],
  )

  const schedule = useCallback(
    (id: string, duration: number) => {
      if (duration <= 0) return
      const existing = timers.current.get(id)
      if (existing !== undefined) window.clearTimeout(existing)
      timers.current.set(id, window.setTimeout(() => dismiss(id), duration))
    },
    [dismiss],
  )

  const pause = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) window.clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const durationOf = useCallback(
    (toast: Pick<ToastRecord, 'tone' | 'duration'>) =>
      toast.tone === 'danger' ? 0 : (toast.duration ?? DEFAULT_TOAST_DURATION[toast.tone]),
    [],
  )

  const show = useCallback<ToastApi['show']>(
    (tone, title, options = {}) => {
      toastSequence += 1
      const id = `toast-${toastSequence}`
      const record: ToastRecord = { ...options, id, tone, title, leaving: false }
      setToasts((current) => [...current, record].slice(-MAX_TOASTS))
      // Title then description, as one sentence, in the region that matches the urgency.
      const spoken = typeof options.description === 'string' ? `${title}. ${options.description}` : title
      if (tone === 'danger') setAssertiveMessage({ key: id, text: spoken })
      else setPoliteMessage({ key: id, text: spoken })
      schedule(id, durationOf(record))
      return id
    },
    [schedule, durationOf],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, options) => show('success', title, options),
      info: (title, options) => show('info', title, options),
      warning: (title, options) => show('warning', title, options),
      error: (title, options) => show('danger', title, options),
      dismiss,
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-toast-announcer="polite">
        {politeMessage && <span key={politeMessage.key}>{politeMessage.text}</span>}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" data-toast-announcer="assertive">
        {assertiveMessage && <span key={assertiveMessage.key}>{assertiveMessage.text}</span>}
      </div>
      {toasts.length > 0 && (
        <ToastViewport>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              onMouseEnter={() => pause(toast.id)}
              onMouseLeave={() => !toast.leaving && schedule(toast.id, durationOf(toast))}
              onFocus={() => pause(toast.id)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !toast.leaving) {
                  schedule(toast.id, durationOf(toast))
                }
              }}
            >
              <Toast
                title={toast.title}
                description={toast.description}
                tone={toast.tone}
                action={toast.action}
                leaving={toast.leaving}
                onClose={() => dismiss(toast.id)}
              />
            </div>
          ))}
        </ToastViewport>
      )}
    </ToastContext.Provider>
  )
}
