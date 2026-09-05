package com.fursadhub.student.api;

import java.util.List;

/**
 * Which of the requested opportunities the current student has saved (Backend Phase B4).
 *
 * <p>Deliberately just ids. The caller already has the opportunities — it is rendering a page of
 * cards it fetched from the public API — and asking only "which of these did I save" keeps this
 * endpoint cheap, cacheable-by-nobody, and incapable of leaking opportunity or student data.
 *
 * <p>This exists so the public opportunity endpoints can stay public. Adding a {@code saved} flag to
 * {@code GET /api/v1/public/opportunities} would make an otherwise cacheable, anonymous resource
 * vary per viewer — the personalization belongs in a separate authenticated call.
 */
public record SavedOpportunityStatusResponse(List<String> savedOpportunityIds) {
}
