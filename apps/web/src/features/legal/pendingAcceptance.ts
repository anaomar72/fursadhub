/**
 * Handoff key for legal-document ids a visitor agreed to on the registration form, before they had
 * an authenticated session to record it against (CLAUDE.md section 49 — acceptance is recorded per
 * authenticated user, never anonymously).
 *
 * <p>Written by RegisterPage right after account creation; read and cleared by LoginPage the
 * moment the account first authenticates, which is when `POST /me/terms-acceptances` becomes
 * callable. `TermsAcceptanceGate` remains the authoritative safety net — an account that never
 * passes through this handoff (a pre-existing account, a browser that lost sessionStorage between
 * tabs) still gets prompted there exactly as before.
 */
export const PENDING_TERMS_ACCEPTANCE_KEY = 'fursadhub:pendingTermsAcceptances'
