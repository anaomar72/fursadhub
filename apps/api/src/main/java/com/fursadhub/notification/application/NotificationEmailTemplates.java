package com.fursadhub.notification.application;

import com.fursadhub.notification.domain.NotificationType;

import java.util.Map;
import java.util.Optional;

/**
 * Transactional-email wording for the notification types that warrant an email as well as an in-app
 * notification.
 *
 * <p>Not every type is here, and that is deliberate. An email is an interruption: it belongs to the
 * events a user must act on or would want to know about away from the product, not to every state
 * change. Types with no template still produce an in-app notification, which is the channel that is
 * always present.
 *
 * <p>Bodies say WHAT happened and where to go, never the content itself — no log text, no review
 * comment, no report content, no token (CLAUDE.md section 68). Email is not a private channel and
 * FursadHub does not put a student's written work into one.
 *
 * <p>Email copy is English-only for the pilot, matching the existing Phase 1-6 transactional mail.
 * The in-app notification is fully bilingual because it is rendered from a type code by the
 * frontend; making mail bilingual as well needs the recipient's locale threaded through every
 * enqueue site and is deferred, not forgotten.
 */
final class NotificationEmailTemplates {

    record Template(String subject, String body) {
    }

    private NotificationEmailTemplates() {
    }

    static Optional<Template> forType(NotificationType type, Map<String, Object> payload) {
        return Optional.ofNullable(switch (type) {

            // ------------------------------------------------------ verification outcomes

            case STUDENT_VERIFICATION_NEEDS_MORE_EVIDENCE -> new Template(
                    "More evidence is needed for your enrollment",
                    "Your university needs more evidence before it can verify your enrollment. "
                            + "Open FursadHub to see what is required.");
            case STUDENT_VERIFICATION_VERIFIED -> new Template(
                    "Your enrollment has been verified",
                    "Your university enrollment is now verified. You can apply to internships "
                            + "and be nominated for opportunities.");
            case STUDENT_VERIFICATION_REJECTED -> new Template(
                    "Your enrollment verification was not approved",
                    "Your university did not approve your enrollment verification. "
                            + "Open FursadHub to see the reason.");

            case ORGANIZATION_VERIFIED -> new Template(
                    "Your organization has been verified",
                    "FursadHub has verified " + name(payload) + ". You can now publish internship opportunities.");
            case ORGANIZATION_VERIFICATION_CHANGES_REQUESTED -> new Template(
                    "Your organization verification needs changes",
                    "FursadHub needs changes before it can verify " + name(payload)
                            + ". Open FursadHub to see what is required and resubmit.");
            case ORGANIZATION_VERIFICATION_REJECTED -> new Template(
                    "Your organization verification was not approved",
                    "FursadHub did not approve verification for " + name(payload)
                            + ". Open FursadHub to see the reason.");
            case ORGANIZATION_VERIFICATION_SUSPENDED -> new Template(
                    "Your organization verification has been suspended",
                    "Verification for " + name(payload) + " has been suspended. Open FursadHub for details.");
            case ORGANIZATION_VERIFICATION_REVOKED -> new Template(
                    "Your organization verification has been revoked",
                    "Verification for " + name(payload) + " has been revoked. Open FursadHub for details.");

            // ------------------------------------------------------ account

            case ACCOUNT_SUSPENDED -> new Template(
                    "Your FursadHub account has been suspended",
                    "Your FursadHub account has been suspended and you have been signed out. "
                            + "Contact FursadHub support if you believe this is a mistake.");
            case ACCOUNT_REACTIVATED -> new Template(
                    "Your FursadHub account is active again",
                    "Your FursadHub account has been reactivated. You can sign in as usual.");

            // ------------------------------------------------------ privacy requests

            case PRIVACY_REQUEST_RECEIVED -> new Template(
                    "We have received your privacy request",
                    "FursadHub has received your privacy request and will review it. "
                            + "You can follow its progress in FursadHub.");
            case PRIVACY_REQUEST_COMPLETED -> new Template(
                    "Your privacy request has been completed",
                    "FursadHub has completed your privacy request. Open FursadHub to see the outcome.");
            case PRIVACY_REQUEST_REJECTED -> new Template(
                    "Your privacy request was not accepted",
                    "FursadHub could not accept your privacy request. Open FursadHub to see the reason.");

            // ------------------------------------------------------ legal

            case LEGAL_DOCUMENT_UPDATED -> new Template(
                    "FursadHub has updated its terms",
                    "FursadHub has published a new version of its terms. "
                            + "You will be asked to review and accept it the next time you sign in.");

            // ------------------------------------------------------ in-app only
            //
            // Phase 6 internship-management events keep their own email wording in
            // InternshipNotifier, which already sends them with the placement context these
            // templates do not have. Duplicating them here would mean two emails per event.
            default -> null;
        });
    }

    private static String name(Map<String, Object> payload) {
        Object value = payload == null ? null : payload.get("organizationName");
        return value == null ? "your organization" : String.valueOf(value);
    }
}
