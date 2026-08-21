import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils/cn'

export interface OtpCodeInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  label: string
}

/**
 * Numeric one-time-code entry: one box per digit, digit-only input, paste of the full code,
 * backspace/arrow-key navigation between boxes, and an `onComplete` callback fired once per
 * completed value (BRAND_AND_UI_GUIDELINES.md section 12/19). The caller owns `value`/`onChange`
 * (controlled) so it can clear the boxes on error/resend without this component needing its own
 * notion of "submitted".
 */
export function OtpCodeInput({
  length = 4,
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  autoFocus = true,
  label,
}: OtpCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const lastCompletedRef = useRef<string | null>(null)

  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus()
    }
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (value.length === length && /^\d+$/.test(value) && lastCompletedRef.current !== value) {
      lastCompletedRef.current = value
      onComplete?.(value)
    }
    if (value.length < length) {
      lastCompletedRef.current = null
    }
  }, [value, length, onComplete])

  function setDigitAt(index: number, digit: string) {
    const next = digits.slice()
    next[index] = digit
    onChange(next.join(''))
  }

  function handleChange(index: number, raw: string) {
    const digitsOnly = raw.replace(/\D/g, '')
    if (!digitsOnly) {
      setDigitAt(index, '')
      return
    }
    // Handles a fast typist whose keystroke lands as multiple characters in one change event too.
    const chars = digitsOnly.split('')
    const next = digits.slice()
    let cursor = index
    for (const char of chars) {
      if (cursor >= length) break
      next[cursor] = char
      cursor++
    }
    onChange(next.join(''))
    const focusIndex = Math.min(cursor, length - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      if (digits[index]) {
        setDigitAt(index, '')
        return
      }
      if (index > 0) {
        event.preventDefault()
        inputRefs.current[index - 1]?.focus()
        setDigitAt(index - 1, '')
      }
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputRefs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted) {
      return
    }
    event.preventDefault()
    const next = pasted.slice(0, length).split('')
    onChange(next.join(''))
    const focusIndex = Math.min(next.length, length - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex justify-center gap-3', invalid && 'motion-safe:animate-otp-shake motion-reduce:animate-none')}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="\d*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`${label} — ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            'size-14 rounded-md border bg-surface text-center text-2xl font-semibold text-foreground',
            'transition-colors duration-150 ease-in-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
            invalid ? 'border-danger' : 'border-border',
            disabled && 'opacity-60',
          )}
        />
      ))}
    </div>
  )
}
