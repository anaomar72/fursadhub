import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import { cn } from '../../lib/utils/cn'

/** Stagger between children, in ms. Kept small — this is rhythm, not a queue. */
const STEP_MS = 60
/** Nothing waits longer than this, however many children a section has. */
const MAX_DELAY_MS = 240

export interface RevealProps {
  children: ReactNode
  /** Position within its group, for the stagger. Omit for a single element. */
  index?: number
  /** Render as something other than a `div` — `li`, `section`, `figure`. */
  as?: ElementType
  className?: string
  /**
   * Anchor id, for a wrapped element that is also a scroll target. Kept explicit rather than
   * spreading arbitrary props: this component owns its own `className`, `style` and `ref`, and a
   * spread would let a caller quietly overwrite the ones the reveal depends on.
   */
  id?: string
  /** Labelling for a wrapped `section`/`nav`, which needs an accessible name of its own. */
  'aria-labelledby'?: string
  'aria-label'?: string
}

/**
 * Scroll entrance for public-site content.
 *
 * <p><strong>Reveal-once.</strong> The observer disconnects the first time an element crosses the
 * threshold, so scrolling back up does not replay anything and a section near the fold does not
 * flicker as the page settles. This is the difference between motion that feels considered and
 * motion that feels nervous.
 *
 * <p><strong>It cannot hide content.</strong> The element is in the DOM, in the accessibility tree
 * and hit-testable from first paint — only `opacity` and `transform` change, and both are on the
 * compositor. If the observer never fires (no IntersectionObserver, a print stylesheet, a crawler,
 * JS disabled between hydration and effect) the fallback is visible, not hidden: `useState(true)`
 * when the API is missing, and a `motion-reduce` rule that paints the final state outright.
 *
 * <p><strong>Geometry never moves after the reveal.</strong> The transform resolves to `none`, so
 * no hit target ends up displaced and nothing contributes to layout shift — the translate is 14px
 * of entrance, not a hover effect. Hover on public cards remains colour, border and shadow only.
 *
 * <p>Public entrances are deliberately more expressive than portal transitions: 500ms here against
 * the portals' 240ms, because a marketing page is explored and a workspace is used.
 */
export function Reveal({ children, index = 0, as, className, id, ...labelling }: RevealProps) {
  const Component = (as ?? 'div') as ElementType
  const ref = useRef<HTMLElement>(null)
  // Visible from the start when the browser cannot observe — degrade to shown, never to hidden.
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (shown) return undefined
    const node = ref.current
    if (!node) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      // A little before the edge, so content is already settled when it arrives rather than
      // animating in the corner of the eye.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [shown])

  return (
    <Component
      ref={ref}
      id={id}
      {...labelling}
      className={cn('fh-reveal', shown && 'fh-reveal-in', className)}
      style={shown ? { transitionDelay: `${Math.min(index * STEP_MS, MAX_DELAY_MS)}ms` } : undefined}
    >
      {children}
    </Component>
  )
}

/**
 * A heading, its supporting line and its content revealing as one composition rather than three
 * unrelated elements — the "intentional composition" a section intro wants.
 */
export function RevealGroup({ children, className }: { children: ReactNode[]; className?: string }) {
  return (
    <>
      {children.map((child, index) => (
        <Reveal key={index} index={index} className={className}>
          {child}
        </Reveal>
      ))}
    </>
  )
}
