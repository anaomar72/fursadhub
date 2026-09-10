import { createContext, useContext } from 'react'

/**
 * Which workspace family a signed-in area belongs to.
 *
 * <p>`platform` covers the Super Admin / Verification Officer console and `neutral` the role-neutral
 * `/account` area every signed-in person shares. Both are listed so the type is total and the shell
 * always has something to stamp; neither is given a personality of its own. The account area has no
 * family by definition, and Phase E owns the platform console.
 */
export type WorkspaceFamily = 'student' | 'organization' | 'university' | 'platform' | 'neutral'

/**
 * The workspace family, for the handful of places that need it in JavaScript rather than in CSS.
 *
 * <p><strong>Why a data attribute is the primary mechanism, not this.</strong> Personality here is
 * spacing, surface tone, rule colour and rhythm — all of which are CSS. `AppShell` stamps
 * `data-workspace` on its root, a small block of custom properties resolves per family, and shared
 * primitives read those properties. That means a card, a page header or a section rule picks up its
 * family automatically wherever it is rendered, with no prop threaded through it and no forked
 * `StudentCard` / `OrganizationCard` to keep in sync.
 *
 * <p>This context exists for the exceptions: a component that must branch on family in logic rather
 * than in style, and the tests that assert an area got the family it should.
 */
export const WorkspaceContext = createContext<WorkspaceFamily>('neutral')

export function useWorkspace(): WorkspaceFamily {
  return useContext(WorkspaceContext)
}
