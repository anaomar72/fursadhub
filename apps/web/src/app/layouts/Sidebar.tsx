import { forwardRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLogo, Icon } from '../../components/ui'
import { cn } from '../../lib/utils/cn'
import { isNavItemActive, type NavSection } from './navigation'

export interface SidebarProps {
  sections: NavSection[]
  /** Where the brand block links to — the area's own home, not the marketing site. */
  homePath: string
  /** Icons-only rail. Ignored in the drawer, which is never collapsed. */
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** Drawer only: close after a destination is chosen. */
  onNavigate?: () => void
  onSignOut: () => void
  variant?: 'desktop' | 'drawer'
  className?: string
}

/**
 * The approved navy sidebar (design references 10-13): brand block, icon+label destinations with a
 * solid-blue active pill, and sign-out pinned to the bottom.
 *
 * <p>Shared by the fixed desktop rail and the mobile drawer so the two can never drift apart — the
 * drawer is this same component inside a dialog, not a second implementation.
 */
export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(function Sidebar(
  { sections, homePath, collapsed = false, onToggleCollapse, onNavigate, onSignOut, variant = 'desktop', className },
  ref,
) {
  const { t } = useTranslation()
  const location = useLocation()
  const isRail = collapsed && variant === 'desktop'
  // Plain Links with active state computed here, rather than NavLink. NavLink decides "active"
  // from the pathname alone and sets its own aria-current from that, which would both highlight
  // and announce "Candidates" and "Shortlist" together — they share a path and differ only by
  // ?stage=SHORTLISTED. One source of truth avoids the two disagreeing.
  const allItems = sections.flatMap((section) => section.items)

  return (
    <div
      ref={ref}
      className={cn(
        'flex h-full flex-col bg-sidebar text-sidebar-foreground',
        isRail ? 'w-20' : 'w-64',
        'transition-[width] duration-200 ease-in-out motion-reduce:transition-none',
        className,
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center gap-3 px-4',
          isRail ? 'h-auto flex-col gap-2 px-0 py-3' : 'h-[68px]',
        )}
      >
        <Link
          to={homePath}
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <BrandLogo markOnly className="size-9 shrink-0" />
          {!isRail && <span className="truncate font-display text-lg font-extrabold text-white">{t('common:app.name')}</span>}
        </Link>
        {variant === 'desktop' && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? t('common:shell.expandSidebar') : t('common:shell.collapseSidebar')}
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70',
              'transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none',
              isRail ? 'ml-0' : 'ml-auto',
            )}
          >
            <Icon name="chevronRight" className={cn('size-5 transition-transform duration-200 motion-reduce:transition-none', !collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      <nav aria-label={t('common:shell.primaryNavigation')} className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section, index) => (
          <div key={section.label ?? `section-${index}`} className={index > 0 ? 'mt-6' : 'mt-2'}>
            {section.label && !isRail && (
              <h2 className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
                {section.label}
              </h2>
            )}
            {section.label && isRail && <div className="mx-3 mb-2 border-t border-white/10" aria-hidden="true" />}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={isNavItemActive(item, location, allItems) ? 'page' : undefined}
                    // Always titled: in the rail there is no visible label at all, and at full
                    // width a long Somali label (e.g. "Codsiyada magacaabista") truncates.
                    title={item.label}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold',
                      'transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none',
                      isRail && 'justify-center px-0',
                      isNavItemActive(item, location, allItems)
                        ? 'bg-sidebar-active text-white shadow-sm'
                        : 'text-sidebar-foreground hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <Icon name={item.icon} className="size-5 shrink-0" />
                    {!isRail && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onSignOut}
          title={isRail ? t('auth:session.signOut') : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-sidebar-foreground',
            'transition-colors duration-150 ease-in-out hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none',
            isRail && 'justify-center px-0',
          )}
        >
          <Icon name="logout" className="size-5 shrink-0" />
          {!isRail && <span className="truncate">{t('auth:session.signOut')}</span>}
        </button>
      </div>
    </div>
  )
})
