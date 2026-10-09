import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../lib/auth/AuthContext'
import { RouteTransition } from './RouteTransition'
import { RouteSuspense } from '../router/RouteFallback'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { NavSection } from './navigation'
import type { SidebarBrand } from './Sidebar'
import { WorkspaceContext, type WorkspaceFamily } from './workspace'

/** Ties the drawer to the button that opens it, for `aria-controls`. */
const DRAWER_ID = 'primary-navigation-drawer'

const COLLAPSED_STORAGE_KEY = 'fursadhub-sidebar-collapsed'

export interface AppShellProps {
  /** Translated area name, e.g. "Student". */
  areaLabel: string
  /** Built by each area from its own resolved membership/role — see the area's navigation module. */
  sections: NavSection[]
  /**
   * Which approved rail treatment this area uses: the light rail of references 07/08
   * (student, organization) or the navy rail of references 09/10 (university, platform admin).
   */
  tone?: 'light' | 'navy'
  /** Tenant identity for the rail. Always resolved from the caller's own membership — never hard-coded. */
  brand?: SidebarBrand
  /**
   * Which workspace personality this area wears. Stamped on the shell root as `data-workspace` and
   * published on {@link WorkspaceContext}; everything else follows from CSS custom properties.
   */
  workspace?: WorkspaceFamily
  /** Defaults to the route `<Outlet />`; areas pass children for a pre-membership setup screen. */
  children?: ReactNode
}

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * The one authenticated shell for every signed-in area (student, university, organization, platform
 * admin, account) — the approved sidebar + topbar layout from design references 10-13, replacing
 * the Phase 1 top-navigation shell.
 *
 * <p>One implementation, driven by role-aware configuration: what differs between a recruiter and a
 * university admin is the `sections` their own area computed from real membership data, not a
 * second copy of this file (CLAUDE.md section 9 — one React application with layouts per area).
 */
export function AppShell({ areaLabel, sections, tone = 'light', brand, workspace = 'neutral', children }: AppShellProps) {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Keyed by the path it was opened on: a drawer that survived navigation would cover the very page
  // the visitor just asked for, so it closes on any route change — including browser back/forward —
  // without an effect that re-renders to catch up.
  const [drawer, setDrawer] = useState({ open: false, path: location.pathname })
  const drawerOpen = drawer.open && drawer.path === location.pathname
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const drawerRef = useRef<HTMLDialogElement>(null)
  const drawerTriggerFocusRef = useRef<HTMLElement | null>(null)

  const homePath = sections[0]?.items[0]?.to ?? '/'

  function openDrawer() {
    setDrawer({ open: true, path: location.pathname })
  }

  function closeDrawer() {
    setDrawer((current) => ({ ...current, open: false }))
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next))
      } catch {
        // A browser refusing storage is not a reason to refuse the toggle.
      }
      return next
    })
  }

  // Focus the drawer when it opens, return focus to the trigger when it closes, and close on
  // Escape — the same contract PublicHeader's mobile menu already honors.
  useEffect(() => {
    if (!drawerOpen) return undefined

    drawerTriggerFocusRef.current = document.activeElement as HTMLElement | null
    drawerRef.current?.showModal()
    drawerRef.current?.querySelector<HTMLElement>('a,button')?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      drawerTriggerFocusRef.current?.focus()
    }
  }, [drawerOpen])

  return (
    // A viewport-height frame with the content column scrolling inside it, so the navy rail is
    // always full height (as in the approved references) rather than ending with the page.
    //
    // `data-workspace` is what gives each area its own personality. The custom properties it
    // resolves (see index.css) are read by PageContainer, PageHeader, Card and SectionHeading, so a
    // shared primitive picks up its family wherever it is rendered — no prop threaded through it,
    // and no forked StudentCard/OrganizationCard to keep in sync.
    <WorkspaceContext.Provider value={workspace}>
    <div data-workspace={workspace} className="flex h-svh overflow-hidden bg-background">
      <div className="hidden h-full shrink-0 lg:block">
        <Sidebar
          sections={sections}
          homePath={homePath}
          tone={tone}
          brand={brand}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onSignOut={handleSignOut}
        />
      </div>

      {drawerOpen && (
        <dialog
          ref={drawerRef}
          id={DRAWER_ID}
          aria-modal="true"
          aria-label={t('common:shell.primaryNavigation')}
          onCancel={(event) => { event.preventDefault(); closeDrawer() }}
          // The scrim fades in and the rail slides from the edge it lives on, at the panel
          // duration — a full-height surface travelling its own width, not a dropdown popping open.
          className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-overlay p-0 text-foreground backdrop:bg-transparent motion-safe:animate-backdrop-in"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDrawer()
          }}
        >
          <div
            // The same 18rem rail as desktop, but never more than 85% of a phone, so the page behind
            // stays visible as the thing a tap on the scrim returns to.
            className="h-full w-72 max-w-[85vw] shadow-lg motion-safe:animate-panel-in-left"
          >
            <Sidebar
              variant="drawer"
              className="w-full"
              sections={sections}
              homePath={homePath}
              tone={tone}
              brand={brand}
              onNavigate={() => closeDrawer()}
              onSignOut={handleSignOut}
            />
          </div>
        </dialog>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Topbar
          areaLabel={areaLabel}
          navigationOpen={drawerOpen}
          navigationId={DRAWER_ID}
          onOpenNavigation={() => openDrawer()}
          onSignOut={handleSignOut}
        />
        {/* The family's ground wash. A 3% brand mix — enough that the student workspace feels a
            degree warmer and the university one a degree cooler than the recruiting workspace,
            far too little to read as a colour of its own. Dropped entirely in dark mode, where
            the elevation ramp already carries the plane order. */}
        <main
          style={{ backgroundColor: 'var(--workspace-tint, transparent)' }}
          className="min-w-0 flex-1"
        >
          <RouteTransition><RouteSuspense>{children ?? <Outlet />}</RouteSuspense></RouteTransition>
        </main>
      </div>
    </div>
    </WorkspaceContext.Provider>
  )
}
