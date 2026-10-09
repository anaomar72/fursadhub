import { useSearchParams } from 'react-router-dom'

/**
 * A console list's status filter and page, kept in the URL (Phase 8) — reload-safe, shareable, and
 * browser back/forward walk through filters the way a reviewer expects. The dashboard links straight
 * into a filtered queue with the same parameters.
 *
 * <p>Search text is deliberately NOT put in the URL: on the accounts list it is an email address,
 * and a URL ends up in history, logs and screenshots. The page is 1-based in the URL for people,
 * 0-based in code for the API.
 *
 * <p>`defaultStatus` is what the list opens on (a queue opens on SUBMITTED); choosing "all" when the
 * default is a specific status is written as `status=ALL` so it survives a reload.
 */
export function useListParams<S extends string>(allowed: readonly S[], defaultStatus: S | '') {
  const [params, setParams] = useSearchParams()
  const raw = params.get('status')
  const status: S | '' = raw === 'ALL' ? '' : raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as S) : defaultStatus
  const page = Math.max(0, (Number.parseInt(params.get('page') ?? '', 10) || 1) - 1)

  function update(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params)
    mutate(next)
    setParams(next, { replace: true })
  }

  return {
    status,
    page,
    setStatus: (value: S | '') =>
      update((next) => {
        next.delete('page')
        if (value === defaultStatus) next.delete('status')
        else next.set('status', value === '' ? 'ALL' : value)
      }),
    setPage: (value: number) =>
      update((next) => {
        if (value <= 0) next.delete('page')
        else next.set('page', String(value + 1))
      }),
    /** Back to the first page without changing the filter — after a new search. */
    resetPage: () => update((next) => next.delete('page')),
  }
}
