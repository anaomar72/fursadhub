import { createContext, useContext, type ReactNode } from 'react'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export interface ToastOptions {
  description?: ReactNode
  /**
   * Milliseconds before the toast dismisses itself; `0` keeps it until the person dismisses it.
   * Defaults by tone — see {@link DEFAULT_TOAST_DURATION}. An error can never be given a timeout:
   * `danger` toasts always persist.
   */
  duration?: number
  /** One small follow-up control, e.g. a "View" link. */
  action?: ReactNode
}

export interface ToastApi {
  show: (tone: ToastTone, title: string, options?: ToastOptions) => string
  success: (title: string, options?: ToastOptions) => string
  info: (title: string, options?: ToastOptions) => string
  warning: (title: string, options?: ToastOptions) => string
  /**
   * Reports a failed action. Persists until dismissed. A toast is transient by nature, so an error
   * that the person must ACT on — a form that did not save, a field that is invalid — still belongs
   * inline next to its cause; the toast is the acknowledgement, never the only record.
   */
  error: (title: string, options?: ToastOptions) => string
  dismiss: (id: string) => void
}

/**
 * Per-tone dwell. Long enough to read a title and a short sentence, including in Somali — whose
 * strings run noticeably longer than the English — and paused while the pointer or keyboard focus is
 * on the toast (WCAG 2.2.1). Errors and warnings are about something going wrong, so errors never
 * leave on their own and warnings stay twice as long.
 */
export const DEFAULT_TOAST_DURATION: Record<ToastTone, number> = {
  success: 6000,
  info: 6000,
  warning: 12000,
  danger: 0,
}

export const ToastContext = createContext<ToastApi | null>(null)

/**
 * Mutation feedback: `const toast = useToast(); toast.success(t('…saved'))`.
 *
 * <p>Requires {@link ToastProvider} above it (mounted once in `AppProviders`).
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast() must be used inside <ToastProvider>')
  return api
}
