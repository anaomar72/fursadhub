package com.fursadhub.identity.infrastructure;

import com.fursadhub.common.notification.NotificationProperties;
import org.springframework.stereotype.Component;

/** Minimal EN/SO transactional-email copy for verification and password-reset messages. */
@Component
public class IdentityEmailTemplates {

    private final NotificationProperties properties;

    public IdentityEmailTemplates(NotificationProperties properties) {
        this.properties = properties;
    }

    public record RenderedEmail(String subject, String body) {
    }

    public RenderedEmail verificationEmail(String locale, String rawToken) {
        String link = properties.appBaseUrl() + "/verify-email?token=" + rawToken;
        if (isSomali(locale)) {
            return new RenderedEmail(
                    "Xaqiiji ciwaanka emailkaaga - FursadHub",
                    "Ku dhow inaad furto akoonkaaga FursadHub. Fadlan xaqiiji ciwaanka emailkaaga adigoo riixaya linkiga hoose:\n\n"
                            + link + "\n\nLinkigani wuxuu dhacayaa 24 saacadood gudahood. Haddii aadan codsan diiwaangelinta, iska indho-tir emailkan.");
        }
        return new RenderedEmail(
                "Verify your email - FursadHub",
                "Welcome to FursadHub. Please verify your email address by opening the link below:\n\n"
                        + link + "\n\nThis link expires in 24 hours. If you did not request this, you can ignore this email.");
    }

    public RenderedEmail passwordResetEmail(String locale, String rawToken) {
        String link = properties.appBaseUrl() + "/reset-password?token=" + rawToken;
        if (isSomali(locale)) {
            return new RenderedEmail(
                    "Dib u deji furahaaga sirta ah - FursadHub",
                    "Waxaa la codsaday dib-u-dejinta furaha sirta ah ee akoonkaaga FursadHub. Haddii aad tahay adiga, riix linkiga hoose:\n\n"
                            + link + "\n\nLinkigani wuxuu dhacayaa 1 saac gudaheed. Haddii aadan codsan tan, iska indho-tir emailkan.");
        }
        return new RenderedEmail(
                "Reset your password - FursadHub",
                "A password reset was requested for your FursadHub account. If this was you, open the link below:\n\n"
                        + link + "\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.");
    }

    private boolean isSomali(String locale) {
        return locale != null && locale.toLowerCase().startsWith("so");
    }
}
