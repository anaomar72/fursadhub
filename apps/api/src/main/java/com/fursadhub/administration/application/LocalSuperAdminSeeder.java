package com.fursadhub.administration.application;

import com.fursadhub.administration.domain.PlatformAdmin;
import com.fursadhub.administration.domain.PlatformAdminRepository;
import com.fursadhub.administration.domain.PlatformRole;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds one predictable {@code SUPER_ADMIN} account for local development, so the admin console is
 * reachable on a fresh database without a manual registration + verification round trip.
 *
 * <p>Strictly local-only: {@code @Profile("local")} means this bean is never even constructed
 * unless {@code spring.profiles.active=local}, so it cannot run in {@code ci}, {@code staging}, or
 * production regardless of other configuration — a framework-level guarantee, not a runtime
 * check, matching the environment separation CLAUDE.md section 63 requires.
 *
 * <p>Deliberately separate from {@link PlatformAdminBootstrap}, which is left untouched: that one
 * solves the production first-admin problem (promote an operator-named, already-registered,
 * already-verified account via {@code BOOTSTRAP_SUPER_ADMIN_EMAIL}). This one creates a fixed,
 * predictable developer account outright, going through the same {@link User#register} +
 * {@link PasswordEncoder} the real registration path uses — but never through
 * {@code POST /api/v1/auth/register} or the email-verification token flow, because this is seed
 * data, not a person signing up.
 *
 * <p>Idempotent by construction: an existing row for the email, or an existing active
 * {@code SUPER_ADMIN} grant for that user, is left exactly as it is. Restarting the app on every
 * local dev session cannot create a duplicate account or a duplicate grant.
 */
@Component
@Profile("local")
public class LocalSuperAdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalSuperAdminSeeder.class);

    private static final String EMAIL = "admin@fursadhub.local";
    private static final String PASSWORD = "SuperAdmin!2026";

    private final UserRepository users;
    private final PlatformAdminRepository platformAdmins;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;

    public LocalSuperAdminSeeder(
            UserRepository users, PlatformAdminRepository platformAdmins,
            PasswordEncoder passwordEncoder, AuditService audit) {
        this.users = users;
        this.platformAdmins = platformAdmins;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String email = EmailNormalizer.normalize(EMAIL);

        User user = users.findByEmail(email).orElseGet(() -> {
            User created = User.register(email, passwordEncoder.encode(PASSWORD), "en");
            created.markEmailVerified();
            users.save(created);
            log.info("Seeded local development account {}", email);
            return created;
        });

        boolean alreadyGranted =
                platformAdmins.findActiveByUserIdAndRole(user.getId(), PlatformRole.SUPER_ADMIN).isPresent();
        if (alreadyGranted) {
            return;
        }

        platformAdmins.save(PlatformAdmin.grant(user.getId(), PlatformRole.SUPER_ADMIN, null));
        audit.record("PLATFORM_ROLE_GRANTED", null, null, null,
                "local dev seed SUPER_ADMIN for user " + user.getId());
        log.info("Granted local development SUPER_ADMIN to {}", email);
    }
}
