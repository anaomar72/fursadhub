import type { IconName } from '../../components/ui'

/**
 * One sidebar destination. Every item must point at a route that actually exists and that the
 * caller's CURRENT backend role/scope can reach — an area builds its items from its own resolved
 * membership, never from a static "all roles" list with things switched off.
 *
 * <p>Unauthorized items are omitted entirely rather than rendered disabled, and this is navigation
 * only: the backend re-authorizes every request against current PostgreSQL data, so typing a URL
 * this menu does not show still yields the API's 403 (CLAUDE.md section 24).
 */
export interface NavItem {
  /**
   * The destination. May carry a query string — a filtered view of a list is a real destination
   * when the filter is a real backend concept (e.g. `?stage=SHORTLISTED`, which is the
   * `SHORTLISTED` candidacy status rather than a separate shortlist entity).
   */
  to: string
  /** Already translated by the caller. */
  label: string
  icon: IconName
  /** Exact-match active state, for a parent route that also has children (e.g. an index route). */
  end?: boolean
}

/** A titled group of items. The first group conventionally has no heading. */
export interface NavSection {
  /** Already translated. Omit for the primary group. */
  label?: string
  items: NavItem[]
}

/** The current location, narrowed to what active-state matching actually needs. */
export interface NavLocation {
  pathname: string
  search: string
}

function splitDestination(to: string): { path: string; search: string } {
  const index = to.indexOf('?')
  return index === -1 ? { path: to, search: '' } : { path: to.slice(0, index), search: to.slice(index + 1) }
}

function pathMatches(item: NavItem, path: string, pathname: string): boolean {
  return item.end ? pathname === path : pathname === path || pathname.startsWith(`${path}/`)
}

/**
 * Whether a destination is the one currently being viewed.
 *
 * <p>React Router's own `NavLink` compares pathnames and ignores the query string, which would make
 * "Candidates" and "Shortlist" light up together — they share `/organization/candidates` and differ
 * only by `?stage=SHORTLISTED`. So matching here is query-aware:
 *
 * <ul>
 *   <li>An item that PINS parameters is active only when every pinned parameter matches the current
 *       URL. Extra parameters the user added (a search term, another filter) do not break it.</li>
 *   <li>An item with NO parameters is the plain view of that path, so it yields to any sibling that
 *       pins parameters on the same path and currently matches — otherwise the unfiltered item
 *       would stay highlighted while a filtered one is open.</li>
 * </ul>
 */
export function isNavItemActive(item: NavItem, location: NavLocation, siblings: NavItem[] = []): boolean {
  const { path, search } = splitDestination(item.to)
  if (!pathMatches(item, path, location.pathname)) return false

  const current = new URLSearchParams(location.search)

  if (search) {
    return [...new URLSearchParams(search)].every(([key, value]) => current.get(key) === value)
  }

  return !siblings.some(
    (other) => other !== item && other.to.startsWith(`${path}?`) && isNavItemActive(other, location),
  )
}

/**
 * The item matching the current location, for the topbar's page context. Longest match wins so
 * `/university/placements/:id` resolves to "Placements" rather than to the dashboard, and a pinned
 * filter beats the plain list it filters.
 */
export function findActiveNavItem(sections: NavSection[], location: NavLocation): NavItem | undefined {
  const items = sections.flatMap((section) => section.items)
  return items
    .filter((item) => isNavItemActive(item, location, items))
    .sort((a, b) => b.to.length - a.to.length)[0]
}
