import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

/**
 * The short content transition between portal routes.
 *
 * <p>Keyed on the pathname, so React discards the old subtree and mounts the new one — which is
 * what makes the entrance animation replay per navigation without any effect, timer or transition
 * state of its own.
 *
 * <p><strong>Content only.</strong> The rail, the topbar and the shell around this do not move on
 * navigation; animating the frame every time someone changes page is what makes an application feel
 * busy rather than smooth. The movement here is 4px and 240ms — enough that a new page reads as
 * having arrived, small enough that nothing is ever chased across the screen.
 *
 * <p><strong>It never delays interaction.</strong> The animation runs on opacity and transform with
 * `both` fill, so the content is laid out, hit-testable and focusable from the first frame; there is
 * no gate, no pointer-events suppression and no exit animation to wait through. Under reduced
 * motion the shared duration tokens collapse to 1ms, so the same state change lands immediately
 * and nothing travels.
 *
 * <p>Query-string changes are deliberately NOT a new key. Filtering a candidate board or paging a
 * table would otherwise re-run the entrance on every keystroke, which is exactly the flicker this
 * is meant to avoid.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div key={pathname} className="motion-safe:animate-route-in">
      {children}
    </div>
  )
}
