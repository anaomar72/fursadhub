import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { IconName } from '../../components/ui'
import { Icon } from '../../components/ui'

/**
 * Secondary navigation between the personal account pages.
 *
 * <p>These four destinations used to be a sidebar — which meant reaching one replaced the portal's
 * primary navigation entirely. They are a local strip inside the content area instead, because that
 * is what they are: subsections of one page of the product, not a peer of the portal itself.
 *
 * <p><strong>Links, not tabs.</strong> The shared {@code Tabs} primitive announces `role="tablist"`
 * and switches panels in place. These change the URL, so tab semantics would tell a screen-reader
 * user that pressing one reveals a panel on the same page when it actually navigates. A `nav` of
 * real links with `aria-current="page"` describes what happens, keeps middle-click and
 * open-in-new-tab working, and gives the strip an accessible name of its own — distinct from the
 * primary navigation landmark, so the two are told apart rather than nested confusingly.
 *
 * <p>It scrolls horizontally on a narrow screen with a fade at whichever edge still has more to
 * reach, matching the section strip on the public detail pages rather than inventing a second
 * pattern for the same problem.
 */
const SECTIONS: { to: string; labelKey: string; icon: IconName }[] = [
  { to: '/account/profile', labelKey: 'account:nav.profile', icon: 'user' },
  { to: '/account/notifications', labelKey: 'notifications:title', icon: 'bell' },
  { to: '/account/privacy', labelKey: 'privacy:nav.privacy', icon: 'lock' },
  { to: '/account/testimonial', labelKey: 'testimonials:nav.title', icon: 'sparkle' },
]

export function AccountSectionNav() {
  const { t } = useTranslation()
  const scroller = useRef<HTMLElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const node = scroller.current
    if (!node) return undefined
    const measure = () => {
      const max = node.scrollWidth - node.clientWidth
      setEdges({ start: node.scrollLeft > 1, end: node.scrollLeft < max - 1 })
    }
    measure()
    node.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => {
      node.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [])

  return (
    <div className="relative mb-6">
      <nav
        ref={scroller}
        aria-label={t('common:nav.account')}
        className="flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain rounded-lg border border-border bg-surface p-1 [scrollbar-width:thin]"
      >
        {SECTIONS.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring motion-reduce:transition-none ${
                isActive
                  ? 'bg-brand-accent-soft text-brand-navy dark:bg-surface-muted dark:text-foreground'
                  : 'text-foreground-secondary hover:bg-control-hover hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={section.icon} className="size-4 shrink-0" />
                {/* `aria-current` is what actually announces the current page; the colour is only
                    the sighted half of the same statement. */}
                <span aria-current={isActive ? 'page' : undefined}>{t(section.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {edges.start && <span aria-hidden="true" className="pointer-events-none absolute inset-y-px start-px w-6 rounded-s-lg bg-gradient-to-r from-surface to-transparent" />}
      {edges.end && <span aria-hidden="true" className="pointer-events-none absolute inset-y-px end-px w-6 rounded-e-lg bg-gradient-to-l from-surface to-transparent" />}
    </div>
  )
}
