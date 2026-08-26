/** Phase 7 legal-document contracts (CLAUDE.md section 49). */

export type LegalDocumentType = 'TERMS' | 'PRIVACY_POLICY' | 'COOKIE_POLICY'

export interface LegalDocument {
  id: string
  documentType: LegalDocumentType
  version: string
  /**
   * The language actually returned, which is not always the one requested: a document with no Somali
   * version yet falls back to English, and the UI says so rather than implying it is translated.
   */
  locale: string
  title: string
  /** Null in summary listings, which omit the body because it can be very long. */
  body: string | null
  effectiveFrom: string
  publishedAt: string | null
  requiresAcceptance: boolean
}

/**
 * What the signed-in user still has to accept.
 *
 * An empty `outstanding` includes the case where nothing has been published at all — a fresh pilot
 * environment must not block anyone because an administrator has not published terms yet.
 */
export interface LegalStatus {
  acceptanceRequired: boolean
  outstanding: LegalDocument[]
}
