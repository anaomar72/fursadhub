import { RouteSuspense } from '../router/RouteFallback'
import { Outlet } from 'react-router-dom'
import { RoleShell } from './RoleShell'
import { AccountSectionNav } from './AccountSectionNav'
import { PageContainer } from './PageContainer'

/**
 * The role-neutral account area: profile, notifications, privacy and consents.
 *
 * <p>Deliberately NOT a sixth role. Every signed-in person has these, whatever they are on
 * FursadHub, and duplicating them into the student, university, organization and admin areas would
 * mean four copies of the same page — and four places to forget a fix. It is still one React
 * application with layouts per area, exactly as CLAUDE.md section 9 requires.
 *
 * <p><strong>What changed.</strong> This used to render its own {@link AppShell} with a four-item
 * account sidebar, which REPLACED the caller's portal navigation the moment they opened Profile: a
 * student lost Dashboard, Applications and Placements, and on a phone the single hamburger then
 * opened the account list, leaving no way back to the portal except the browser's Back button.
 * Personal settings are secondary navigation; the role portal is primary.
 *
 * <p>It now renders inside {@link RoleShell} — the caller's OWN portal shell, with their own rail
 * and their own hamburger — and the four account destinations become a local strip inside the
 * content area. The routes themselves are untouched: `/account/profile` and the rest keep their
 * addresses, and the pages keep their code. Only the frame around them changed.
 */
export function AccountLayout() {
  return (
    <RoleShell>
      <PageContainer width="narrow">
        <AccountSectionNav />
        <RouteSuspense><Outlet /></RouteSuspense>
      </PageContainer>
    </RoleShell>
  )
}
