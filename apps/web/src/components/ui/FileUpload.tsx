import { useId, type ChangeEvent, type ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'
import { Icon } from './Icon'

export interface FileUploadProps {
  label: string
  /** Accepted type and size, in words — read before choosing a file. */
  hint?: string
  accept?: string
  multiple?: boolean
  disabled?: boolean
  invalid?: boolean
  onFiles: (files: File[]) => void
  /** An upload is in flight: the zone shows `busyLabel` with a spinner and is marked busy. */
  busy?: boolean
  busyLabel?: string
  /**
   * What is on file now, already phrased by the caller ("A license document is on file." or
   * "Uploaded: licence.pdf"). Shown with a check inside the zone, so the zone itself says both what
   * it accepts and what it currently holds — and choosing again is visibly a replacement.
   */
  current?: ReactNode
  className?: string
}

/**
 * The drop-zone file picker. The whole zone is the `<label>` of a visually hidden native input, so
 * it is keyboard-reachable, announces as a file control, and shows the shared focus ring around the
 * zone while the input inside it has focus. The hint — accepted types and size — is tied to the
 * input with `aria-describedby`, so it is read before a person picks a file, not only seen.
 */
export function FileUpload({ label, hint, accept, multiple, disabled, invalid, onFiles, busy = false, busyLabel, current, className }: FileUploadProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const currentId = `${id}-current`
  const change = (e: ChangeEvent<HTMLInputElement>) => {
    onFiles(Array.from(e.target.files ?? []))
    // Cleared so choosing the same file again (after a failure) still fires a change event.
    e.target.value = ''
  }
  const unavailable = disabled || busy
  return (
    <label
      htmlFor={id}
      aria-busy={busy || undefined}
      className={cn(
        'flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-surface p-5 text-center',
        'transition-colors duration-150 hover:bg-surface-muted focus-within:ring-2 focus-within:ring-focus-ring motion-reduce:transition-none',
        invalid ? 'border-danger' : 'border-border-strong',
        unavailable && 'pointer-events-none cursor-not-allowed',
        disabled && !busy && 'bg-control-disabled opacity-70',
        className,
      )}
    >
      {busy ? (
        <span aria-hidden="true" className="size-6 animate-spin rounded-full border-2 border-brand-accent-ink border-t-transparent motion-reduce:animate-none" />
      ) : (
        <Icon name="upload" className="size-7 text-brand-accent-ink" />
      )}
      <span className="mt-2 break-words text-body font-semibold text-foreground">{busy && busyLabel ? busyLabel : label}</span>
      {hint && <span id={hintId} className="mt-1 break-words text-caption text-foreground-secondary">{hint}</span>}
      {current && !busy && (
        <span id={currentId} className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-caption font-semibold text-success">
          <Icon name="check" className="size-3.5 shrink-0" />
          <span className="min-w-0 break-all">{current}</span>
        </span>
      )}
      <input
        id={id}
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={unavailable}
        aria-invalid={invalid || undefined}
        aria-describedby={[hint && hintId, current && !busy && currentId].filter(Boolean).join(' ') || undefined}
        onChange={change}
      />
    </label>
  )
}
