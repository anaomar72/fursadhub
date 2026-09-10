import { useRef, useState, type KeyboardEvent, type Ref, type AriaAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'
import { cn } from '../../lib/utils/cn'

export interface TagInputProps {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  /** Hard cap, mirroring the backend's own limit. Adding is refused, never silently truncated. */
  maxTags: number
  /** Per-entry character limit, mirroring the backend column. */
  maxLength: number
  placeholder?: string
  disabled?: boolean
  'aria-describedby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
  ref?: Ref<HTMLInputElement>
  onBlur?: () => void
  className?: string
}

/**
 * A controlled chip/tag input, for the Backend Phase B3 skills and perks lists.
 *
 * <p>Committing on Enter AND on comma, because a list of skills is something people paste
 * comma-separated; pasting "React, TypeScript, SQL" produces three chips rather than one long one.
 * Backspace on an empty field removes the last chip, which is the behaviour every tag field has.
 *
 * <p><strong>Duplicates are compared case-insensitively</strong> — "React" and "react" are one
 * skill, and offering both would clutter the listing. The backend normalises and de-duplicates
 * again on save and remains the authority; this only spares the user a rejected submit.
 *
 * <p>Chips wrap rather than scroll, so a long list stays fully readable at 375px instead of hiding
 * entries behind a horizontal scroll the user cannot see.
 */
export function TagInput({
  id,
  value,
  onChange,
  maxTags,
  maxLength,
  placeholder,
  disabled = false,
  className,
  ref,
  onBlur,
  ...rest
}: TagInputProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const atCapacity = value.length >= maxTags

  function commit(raw: string) {
    const tag = raw.trim()
    if (!tag) return

    if (atCapacity) {
      setNotice(t('common:tagInput.limitReached', { count: maxTags }))
      return
    }
    if (tag.length > maxLength) {
      setNotice(t('common:tagInput.tooLong', { count: maxLength }))
      return
    }
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setNotice(t('common:tagInput.duplicate'))
      setDraft('')
      return
    }

    setNotice(null)
    onChange([...value, tag])
    setDraft('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter inside a tag field must add a tag, never submit the surrounding form.
      event.preventDefault()
      commit(draft)
      return
    }
    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
      setNotice(null)
    }
  }

  return (
    <div className={className}>
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 rounded-lg border border-border-strong bg-surface p-2',
          'focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-focus-ring',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-blue-soft py-1 pe-1 ps-2.5 text-sm font-medium text-brand-navy dark:bg-info-bg dark:text-info"
          >
            <span className="truncate">{tag}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(value.filter((existing) => existing !== tag))
                setNotice(null)
                inputRef.current?.focus()
              }}
              aria-label={t('common:tagInput.remove', { tag })}
              className="flex size-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-brand-navy/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          </span>
        ))}

        <input
          ref={(node) => {
            inputRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          id={id}
          type="text"
          value={draft}
          disabled={disabled}
          placeholder={atCapacity ? undefined : placeholder}
          maxLength={maxLength}
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.target.value)
            setNotice(null)
          }}
          onKeyDown={handleKeyDown}
          // A tag typed but not committed would otherwise be silently discarded on submit.
          onBlur={() => { commit(draft); onBlur?.() }}
          className="h-8 min-w-[8rem] flex-1 bg-transparent px-1.5 text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed"
          {...rest}
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <p className={cn('text-xs', notice ? 'text-danger' : 'text-foreground-secondary')} role={notice ? 'alert' : undefined}>
          {notice ?? t('common:tagInput.hint')}
        </p>
        <p className="text-xs text-muted" aria-live="polite">
          {t('common:tagInput.count', { used: value.length, max: maxTags })}
        </p>
      </div>
    </div>
  )
}
