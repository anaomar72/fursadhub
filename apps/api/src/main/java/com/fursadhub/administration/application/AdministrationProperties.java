package com.fursadhub.administration.application;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Administration configuration.
 *
 * @param bootstrapSuperAdminEmail solves the first-admin problem. Platform roles can only be granted
 *        by an existing SUPER_ADMIN, so with an empty table nobody could ever become one and the
 *        admin console would be permanently unreachable. When this names an existing account AND no
 *        active platform grant exists yet, startup promotes that one account. Blank by default, and
 *        it does nothing once any admin exists — so it cannot be used later to quietly re-grant
 *        platform authority to an account someone deliberately revoked.
 */
@ConfigurationProperties(prefix = "fursadhub.administration")
public record AdministrationProperties(String bootstrapSuperAdminEmail) {
}
