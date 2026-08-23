package com.fursadhub.candidacy.infrastructure;

import org.springframework.stereotype.Component;

/**
 * Minimal EN/SO transactional-email copy for recruitment events (CLAUDE.md section 55/56).
 *
 * <p>These are enqueued into the PostgreSQL-backed outbox inside the business transaction, so an
 * unreachable SMTP server can never roll back or block a nomination, offer, or acceptance.
 */
@Component
public class RecruitmentEmailTemplates {

    public record RenderedEmail(String subject, String body) {
    }

    public RenderedEmail studentNominated(String locale, String opportunityTitle, String universityName) {
        if (isSomali(locale)) {
            return new RenderedEmail(
                    "Waxaa laguu magacaabay fursad tababar - FursadHub",
                    universityName + " ayaa kuu magacaabay fursadda \"" + opportunityTitle + "\".\n\n"
                            + "Fadlan gal FursadHub si aad u aqbasho ama u diido magacaabistan. "
                            + "Ururka shaqada ma arki doono xogtaada ilaa aad aqbasho.");
        }
        return new RenderedEmail(
                "You have been nominated for an internship - FursadHub",
                universityName + " has nominated you for \"" + opportunityTitle + "\".\n\n"
                        + "Sign in to FursadHub to accept or decline this nomination. "
                        + "The organization will not see your details until you accept.");
    }

    public RenderedEmail offerReceived(String locale, String opportunityTitle, String organizationName, String responseDeadline) {
        if (isSomali(locale)) {
            return new RenderedEmail(
                    "Waxaad heshay dalab tababar - FursadHub",
                    organizationName + " wuxuu kuu soo diray dalab tababar oo ah \"" + opportunityTitle + "\".\n\n"
                            + "Waa inaad ka jawaabtaa ugu dambeyn " + responseDeadline + ".");
        }
        return new RenderedEmail(
                "You have received an internship offer - FursadHub",
                organizationName + " has sent you an internship offer for \"" + opportunityTitle + "\".\n\n"
                        + "You must respond by " + responseDeadline + ".");
    }

    public RenderedEmail offerAccepted(String locale, String opportunityTitle, String studentEmail) {
        if (isSomali(locale)) {
            return new RenderedEmail(
                    "Dalabka tababarka waa la aqbalay - FursadHub",
                    studentEmail + " ayaa aqbalay dalabkaaga tababar ee \"" + opportunityTitle + "\".\n\n"
                            + "Meel-gelin cusub ayaa la abuuray.");
        }
        return new RenderedEmail(
                "Internship offer accepted - FursadHub",
                studentEmail + " has accepted your internship offer for \"" + opportunityTitle + "\".\n\n"
                        + "A placement has been created.");
    }

    public RenderedEmail offerDeclined(String locale, String opportunityTitle, String studentEmail) {
        if (isSomali(locale)) {
            return new RenderedEmail(
                    "Dalabka tababarka waa la diiday - FursadHub",
                    studentEmail + " ayaa diiday dalabkaaga tababar ee \"" + opportunityTitle + "\".");
        }
        return new RenderedEmail(
                "Internship offer declined - FursadHub",
                studentEmail + " has declined your internship offer for \"" + opportunityTitle + "\".");
    }

    public RenderedEmail nominationResolved(String locale, String opportunityTitle, String studentEmail, boolean accepted) {
        if (isSomali(locale)) {
            return new RenderedEmail(
                    "Jawaab magacaabis - FursadHub",
                    studentEmail + (accepted ? " ayaa aqbalay " : " ayaa diiday ")
                            + "magacaabistiisa fursadda \"" + opportunityTitle + "\".");
        }
        return new RenderedEmail(
                "Nomination response - FursadHub",
                studentEmail + (accepted ? " accepted " : " declined ")
                        + "their nomination for \"" + opportunityTitle + "\".");
    }

    private boolean isSomali(String locale) {
        return locale != null && locale.toLowerCase().startsWith("so");
    }
}
