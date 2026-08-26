package com.fursadhub.administration.api;

import java.util.List;

/**
 * The caller's own platform roles.
 *
 * <p>Returns 200 with an empty list for an ordinary user rather than 403, because this is the probe
 * the web app uses to decide whether to show an Admin area at all — and the answer only ever
 * describes the caller themselves, so there is nothing to leak. It drives navigation ONLY: every
 * admin endpoint re-authorizes independently, and the frontend's route guards are UX
 * (CLAUDE.md section 24).
 */
public record AdminSessionResponse(boolean platformAdmin, List<String> roles) {
}
