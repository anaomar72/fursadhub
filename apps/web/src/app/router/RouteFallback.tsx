import { Suspense, type ReactNode } from 'react'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

/**
 * What a route renders while its code chunk is in flight.
 *
 * <p>Deliberately quiet. A route chunk on a warm cache resolves in a few milliseconds, so anything
 * with a border, a card or a skeleton grid would flash a structure that is immediately replaced —
 * which reads as a glitch rather than as loading. This is a centred spinner on the page ground, and
 * the delay class holds it invisible for 160ms so a fast navigation shows nothing at all and only a
 * genuinely slow one announces itself.
 *
 * <p>`role="status"` with a polite live region, so a screen reader hears that the page is loading
 * rather than silence. The label is intentionally the shared `common:status.loading` string that
 * the rest of the product already uses.
 */
export function RouteFallback() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-64 items-center justify-center p-10 motion-safe:animate-fallback-in">
      <LoadingSpinner />
      <span className="sr-only">Loading</span>
    </div>
  )
}

/** Wraps a route outlet in the boundary its lazily-loaded children need. */
export function RouteSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}
