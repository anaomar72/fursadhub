/**
 * Which branded panel an auth route shows.
 *
 * Kept out of `AuthShell.tsx` so that file exports components only — mixing a helper in breaks Fast
 * Refresh for the whole module (`react/only-export-components`).
 *
 * The copy varies BY ROUTE on purpose. Someone resetting a password is not being sold the
 * marketplace; they want to know the link is single-use and where they land afterwards. One
 * repeated marketing paragraph across all five screens is what made the previous shell read as a
 * stock template.
 */
const PANELS = {
  login: 'login',
  register: 'register',
  'verify-email': 'verifyEmail',
  'forgot-password': 'forgotPassword',
  'reset-password': 'resetPassword',
} as const

export type PanelKey = (typeof PANELS)[keyof typeof PANELS]

/** Maps `/login` → `login`. Query strings, trailing slashes and unknown paths all resolve safely. */
export function panelKeyForPath(pathname: string): PanelKey {
  const segment = pathname.replace(/^\/+|\/+$/g, '').split('/')[0]
  return PANELS[segment as keyof typeof PANELS] ?? 'login'
}
