import { forwardRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLogo, Icon } from '../../components/ui'
import { cn } from '../../lib/utils/cn'
import { isNavItemActive, type NavSection } from './navigation'

/**
 * Tenant identity for the rail, as shown in references 08 (organization) and 09 (university):
 * the tenant's own logo and name, then the portal type, with FursadHub attribution moved to a
 * subtle strip below.
 *
 * <p>Always DATA-DRIVEN — every field comes from the caller's own resolved membership/profile.
 * A tenant is never hard-coded, and a missing logo simply falls back to the initial.
 */
export interface SidebarBrand {
  /** The tenant's display name. Omit for the FursadHub-branded rails (student, platform admin). */
  name?: string
  /** Absolute URL of the tenant's logo. Omit when the tenant has not uploaded one. */
  logoUrl?: string
  /** Translated portal type — "University Portal", "Recruiter Portal", "Super Admin Console". */
  portalLabel?: string
}

export interface SidebarProps {
  sections: NavSection[]
  /** Where the brand block links to — the area's own home, not the marketing site. */
  homePath: string
  /**
   * Which approved rail treatment to render: the light rail of references 07/08 (student,
   * organization) or the navy rail of references 09/10 (university, platform admin).
   */
  tone?: 'light' | 'navy'
  brand?: SidebarBrand
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
 * The approved authenticated sidebar (design-reference/presentation-refresh-2026, references
 * 07-10): brand block, titled destination groups, and an active destination marked by a tinted
 * pill with an ORANGE trailing edge — the one constant across all four portals.
 *
 * <p>One component renders both the light and the navy rail; the difference is a scoped set of
 * `--color-sidebar-*` overrides in `tokens.css`, never a second implementation. The same component
 * is also the mobile drawer, so the two can never drift apart.
 */
export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(function Sidebar(
  {
    sections,
    homePath,
    tone = 'light',
    brand,
    collapsed = false,
    onToggleCollapse,
    onNavigate,
    onSignOut,
    variant = 'desktop',
    className,
  },
  ref,
) {
  const { t } = useTranslation()
  const location = useLocation()
  const isRail = collapsed && variant === 'desktop'
  const isTenantBranded = Boolean(brand?.name)
  // Plain Links with active state computed here, rather than NavLink. NavLink decides "active"
  // from the pathname alone and sets its own aria-current from that, which would both highlight
  // and announce "Candidates" and "Shortlist" together — they share a path and differ only by
  // ?stage=SHORTLISTED. One source of truth avoids the two disagreeing.
  const allItems = sections.flatMap((section) => section.items)

  return (
    <div
      ref={ref}
      className={cn(
        tone === 'navy' && 'sidebar-navy',
        'flex h-full flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground',
        isRail ? 'w-20' : 'w-[264px]',
        'transition-[width] duration-200 ease-in-out motion-reduce:transition-none',
        className,
      )}
    >
      {/* ------------------------------------------------------------ brand block */}
      <div className={cn('shrink-0 border-b border-sidebar-border', isRail ? 'px-2 py-3' : 'px-4 py-4')}>
        <div className={cn('flex items-center gap-3', isRail && 'flex-col gap-2')}>
          <Link
            to={homePath}
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {isTenantBranded ? (
              <TenantMark brand={brand!} />
            ) : (
              <BrandLogo surface={tone === 'navy' ? 'dark' : 'light'} markOnly size={isRail ? 'md' : 'md'} />
            )}
            {!isRail && (
              <span className="min-w-0">
                <span className="block truncate font-display text-[15px] font-extrabold leading-tight text-sidebar-strong">
                  {isTenantBranded ? (
                    brand!.name
                  ) : (
                    <>
                      Fursad<span className="text-brand-accent">Hub</span>
                    </>
                  )}
                </span>
                {brand?.portalLabel && (
                  // Reference 09 sets a tenant's portal type in orange caps under its name;
                  // reference 10 sets FursadHub's own console name in plain ink under the wordmark.
                  <span
                    className={cn(
                      'mt-0.5 block truncate',
                      isTenantBranded
                        ? 'text-[11px] font-bold uppercase tracking-wider text-brand-accent'
                        : 'text-xs font-semibold text-sidebar-foreground',
                    )}
                  >
                    {brand.portalLabel}
                  </span>
                )}
              </span>
            )}
          </Link>
          {variant === 'desktop' && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? t('common:shell.expandSidebar') : t('common:shell.collapseSidebar')}
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground',
                'transition-colors hover:bg-sidebar-hover hover:text-sidebar-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
              )}
            >
              <Icon
                name="chevronRight"
                className={cn('size-5 transition-transform duration-200 motion-reduce:transition-none', !collapsed && 'rotate-180')}
              />
            </button>
          )}
        </div>

        {/* The references keep FursadHub attribution present but subordinate inside a tenant's own
            portal — reference 08's "powered by" strip. Only shown when a tenant owns the rail. */}
        {isTenantBranded && !isRail && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-sidebar-heading">
            {t('common:shell.poweredBy')}
            <BrandLogo surface={tone === 'navy' ? 'dark' : 'light'} markOnly size="sm" className="size-4" />
            <span className="font-display font-bold text-sidebar-strong">
              Fursad<span className="text-brand-accent">Hub</span>
            </span>
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------ destinations */}
      <nav aria-label={t('common:shell.primaryNavigation')} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, index) => (
          <div key={section.label ?? `section-${index}`} className={index > 0 ? 'mt-6' : undefined}>
            {section.label && !isRail && (
              <h2 className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-sidebar-heading">
                {section.label}
              </h2>
            )}
            {section.label && isRail && <div className="mx-3 mb-2 border-t border-sidebar-border" aria-hidden="true" />}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isNavItemActive(item, location, allItems)
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      // Always titled: in the rail there is no visible label at all, and at full
                      // width a long Somali label (e.g. "Codsiyada magacaabista") truncates.
                      title={item.label}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold',
                        'transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
                        isRail && 'justify-center px-0',
                        active
                          ? 'bg-sidebar-active text-sidebar-active-text'
                          : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-strong',
                      )}
                    >
                      {/* The approved active marker: a short orange bar on the rail's inner edge. */}
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-1.5 -end-3 w-1 rounded-s-full bg-sidebar-active-edge"
                        />
                      )}
                      <Icon name={item.icon} className={cn('size-5 shrink-0', active && 'text-brand-accent')} />
                      {!isRail && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ------------------------------------------------------------ sign out */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={onSignOut}
          title={isRail ? t('auth:session.signOut') : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-sidebar-foreground',
            'transition-colors duration-150 ease-in-out hover:bg-sidebar-hover hover:text-sidebar-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
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

/** The tenant's own logo, falling back to its initial when the backend reports none. */
function TenantMark({ brand }: { brand: SidebarBrand }) {
  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt=""
        className="size-10 shrink-0 rounded-lg border border-sidebar-border bg-white object-contain p-0.5"
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-navy-soft font-display text-base font-extrabold text-brand-navy"
    >
      {brand.name?.trim().charAt(0).toUpperCase() ?? '?'}
    </span>
  )
}
