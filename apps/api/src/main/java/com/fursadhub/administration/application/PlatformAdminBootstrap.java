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
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Grants the very first SUPER_ADMIN from configuration, once.
 *
 * <p>Guarded three ways so it cannot become a backdoor: it does nothing unless the property is set,
 * nothing unless the named account already exists (it never creates an account), and nothing at all
 * once ANY active platform grant exists. That last guard is the important one — after the first
 * admin is in place this runner is permanently inert, so setting the property later cannot restore
 * platform authority to an account someone deliberately revoked.
 *
 * <p>The grant is audited like any other, with a null actor, because no human performed it.
 */
@Component
public class PlatformAdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PlatformAdminBootstrap.class);

    private final AdministrationProperties properties;
    private final PlatformAdminRepository platformAdmins;
    private final UserRepository users;
    private final AuditService audit;

    public PlatformAdminBootstrap(
            AdministrationProperties properties, PlatformAdminRepository platformAdmins,
            UserRepository users, AuditService audit) {
        this.properties = properties;
        this.platformAdmins = platformAdmins;
        this.users = users;
        this.audit = audit;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String configured = properties.bootstrapSuperAdminEmail();
        if (configured == null || configured.isBlank()) {
            return;
        }
        if (platformAdmins.existsAnyActive()) {
            return;
        }

        Optional<User> account = users.findByEmail(EmailNormalizer.normalize(configured));
        if (account.isEmpty()) {
            // Not an error: the usual local-development order is to start the API, register the
            // account through the normal flow, then restart.
            log.warn("Bootstrap super admin is configured but no account exists yet for that address — "
                    + "register it and restart to grant the role.");
            return;
        }

        User user = account.get();
        platformAdmins.save(PlatformAdmin.grant(user.getId(), PlatformRole.SUPER_ADMIN, null));
        audit.record("PLATFORM_ROLE_GRANTED", null, null, null,
                "bootstrap SUPER_ADMIN for user " + user.getId());
        log.info("Granted bootstrap SUPER_ADMIN to user {}", user.getId());
    }
}
