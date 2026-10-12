import { useCallback, useSyncExternalStore } from 'react'

/**
 * Whether a CSS media query currently matches, kept in sync as the viewport changes.
 *
 * <p>For the rare component that must render DIFFERENT MARKUP per breakpoint (DataTable's stacked
 * mobile rows), where hiding one version with CSS would leave two copies of every row in the
 * accessibility tree. Prefer plain responsive classes everywhere else.
 *
 * <p>Where `matchMedia` does not exist (jsdom, very old browsers) it returns `fallback`.
 */
export function useMediaQuery(query: string, fallback = true): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  const getSnapshot = () =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : fallback
  return useSyncExternalStore(subscribe, getSnapshot, () => fallback)
}
