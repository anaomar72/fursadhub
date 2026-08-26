package com.fursadhub.compliance.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.compliance.domain.LegalDocument;
import com.fursadhub.compliance.domain.LegalDocumentRepository;
import com.fursadhub.compliance.domain.TermsAcceptance;
import com.fursadhub.compliance.domain.TermsAcceptanceRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Records which document versions a user has accepted, and reports what is still outstanding
 * (CLAUDE.md section 49).
 *
 * <p><strong>Why acceptance is not part of registration.</strong> The obvious design is a checkbox on
 * the sign-up form, but that would mean changing the frozen Phase 1 {@code POST /auth/register}
 * contract (CLAUDE.md section 13/19), and it would only ever cover NEW accounts — every existing user
 * would silently be treated as having accepted nothing, and a newly published version would still
 * need a prompt somewhere else. So acceptance is checked after authentication, through
 * {@link #outstandingFor}, and the same prompt handles first sign-in and every later version alike.
 *
 * <p>Acceptance is never inferred. A user who has not accepted the current version has not accepted
 * it, whatever they may have accepted before.
 */
@Service
public class TermsAcceptanceService {

    private final LegalDocumentRepository documents;
    private final TermsAcceptanceRepository acceptances;
    private final AuditService audit;
    private final Clock clock;

    public TermsAcceptanceService(
            LegalDocumentRepository documents, TermsAcceptanceRepository acceptances,
            AuditService audit, Clock clock) {
        this.documents = documents;
        this.acceptances = acceptances;
        this.audit = audit;
        this.clock = clock;
    }

    /**
     * The documents this user still needs to accept, in their language.
     *
     * <p>An empty list means nothing is outstanding — including when no legal documents have been
     * published at all, which is the state a fresh pilot environment starts in. FursadHub must not
     * block a student from working because an administrator has not published terms yet.
     */
    @Transactional(readOnly = true)
    public List<LegalDocument> outstandingFor(UUID userId, String locale) {
        List<LegalDocument> current = documents.findAllCurrent(normalize(locale), LocalDate.now(clock));
        return current.stream()
                .filter(document -> document.getDocumentType().requiresAcceptance())
                .filter(document -> !acceptances.existsByUserIdAndLegalDocumentId(userId, document.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TermsAcceptance> acceptancesOf(UUID userId) {
        return acceptances.findByUserId(userId);
    }

    /**
     * Records acceptance of one exact document version.
     *
     * <p>Exactly one record per user per document version, guaranteed by
     * {@code UNIQUE(user_id, legal_document_id)} rather than by the Java check below — the check
     * exists to make the ordinary double-click a quiet no-op, and the constraint is what holds when
     * two requests arrive at the same instant.
     */
    @Transactional
    public void accept(UUID userId, UUID legalDocumentId, String ip, String userAgent) {
        LegalDocument document = documents.findById(legalDocumentId)
                .orElseThrow(() -> new ApiException("LEGAL_DOCUMENT_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "That document could not be found."));
        document.requireAcceptable(LocalDate.now(clock));

        // The ordinary "clicked Accept twice" case is two sequential requests, and this read catches
        // it, so the common path stays a quiet no-op rather than an error the user sees.
        if (acceptances.existsByUserIdAndLegalDocumentId(userId, legalDocumentId)) {
            return;
        }
        try {
            acceptances.save(TermsAcceptance.of(userId, legalDocumentId, ip, userAgent));
        } catch (DataIntegrityViolationException e) {
            // Two requests at the same instant. UNIQUE(user_id, legal_document_id) — not this Java
            // check — is what guarantees one record, so the other request's acceptance stands and is
            // just as valid. Reported as a conflict rather than swallowed: the violation has already
            // marked this transaction rollback-only, so claiming success here would be a lie the
            // audit record would not back up.
            throw new ApiException("TERMS_ALREADY_ACCEPTED", HttpStatus.CONFLICT,
                    "You have already accepted this document.");
        }
        audit.record("TERMS_ACCEPTED", userId, ip, userAgent,
                document.getDocumentType() + " version " + document.getVersion());
    }

    private String normalize(String locale) {
        return locale == null || locale.isBlank() ? "en" : locale;
    }
}
