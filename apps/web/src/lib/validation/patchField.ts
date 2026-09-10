/**
 * The client half of the backend's `PatchField` contract (Backend Phase B2/B3).
 *
 * <p>The wire format has three states, and they are genuinely different:
 *
 * <pre>
 * key omitted        -> keep whatever is stored
 * key present, null  -> clear the stored value
 * key present, value -> replace the stored value
 * </pre>
 *
 * <p>This module exists so a form never sends the wrong one by accident. The dangerous mistake is
 * serialising an untouched optional field as `null`: it looks harmless, and it silently erases data
 * the user never opened. The opposite mistake — omitting a field the user just emptied — leaves a
 * stale value on a public profile the user believes they removed.
 */

/** Marks a field the request should OMIT. Distinct from `null`, which clears. */
export const ABSENT: unique symbol = Symbol('absent')

export type Patch<T> = T | null | typeof ABSENT

/**
 * Resolves one optional TEXT field against what the server currently holds.
 *
 * <p>Compares the trimmed form value with the stored value:
 *
 * <ul>
 *   <li>equal (including "both empty") -> {@link ABSENT}, so the request omits it entirely;</li>
 *   <li>emptied, and something was stored -> `null`, the explicit clear;</li>
 *   <li>anything else -> the new value.</li>
 * </ul>
 *
 * <p>Comparing against the STORED value rather than trusting React Hook Form's `dirtyFields` is
 * deliberate: `dirtyFields` reports a field as dirty when the user typed into it and undid the
 * change, and it is reset by `form.reset` in ways that are easy to get subtly wrong across a
 * refetch. The stored value is the thing the answer actually depends on.
 */
export function patchText(formValue: string | undefined, stored: string | null | undefined): Patch<string> {
  const next = (formValue ?? '').trim()
  const current = (stored ?? '').trim()

  if (next === current) return ABSENT
  if (next === '') return null
  return next
}

/** As {@link patchText}, for a numeric field whose form value is `''` when not stated. */
export function patchNumber(
  formValue: number | '' | undefined,
  stored: number | null | undefined,
): Patch<number> {
  const next = formValue === '' || formValue === undefined ? null : formValue
  const current = stored ?? null

  if (next === current) return ABSENT
  return next
}

/** As {@link patchText}, for a select whose empty option means "not stated". */
export function patchEnum<T extends string>(
  formValue: T | '' | undefined,
  stored: T | null | undefined,
): Patch<T> {
  const next = formValue ? formValue : null
  const current = stored ?? null

  if (next === current) return ABSENT
  return next
}

/**
 * Drops every {@link ABSENT} entry, leaving an object safe to send as the request body.
 *
 * <p>`null` survives — that is the explicit clear — while an untouched field disappears from the
 * JSON entirely, which is what makes "omitted preserves" work.
 */
export function compactPatch<T extends Record<string, Patch<unknown>>>(fields: T): CompactedPatch<T> {
  const body: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value !== ABSENT) body[key] = value
  }
  return body as CompactedPatch<T>
}

/**
 * The result type: every key optional, and {@link ABSENT} removed from each value type.
 *
 * <p>Erasing the symbol from the type is what makes the compaction visible to the compiler — the
 * request DTO accepts `string | null`, and without this every field would still be typed as
 * possibly carrying the absent marker that was just stripped out at runtime.
 *
 * <p>It excludes `symbol` rather than `typeof ABSENT` because inference through the
 * `Record<string, Patch<unknown>>` constraint widens the marker back to plain `symbol`, which
 * `Exclude<…, typeof ABSENT>` then fails to remove. The broader exclusion is exact for the job:
 * these objects become JSON request bodies, and no field of one legitimately holds a symbol.
 */
export type CompactedPatch<T extends Record<string, Patch<unknown>>> = {
  [K in keyof T]?: Exclude<T[K], symbol>
}
