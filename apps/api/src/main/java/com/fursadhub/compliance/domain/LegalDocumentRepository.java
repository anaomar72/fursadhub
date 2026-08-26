package com.fursadhub.compliance.domain;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LegalDocumentRepository {

    LegalDocument save(LegalDocument document);

    Optional<LegalDocument> findById(UUID id);

    /**
     * The version currently in force for a type and locale: published, effective on or before today,
     * most recent effective date first. This is what a reader is served and what acceptance points at.
     */
    Optional<LegalDocument> findCurrent(LegalDocumentType documentType, String locale, LocalDate today);

    /** Every published-and-effective document for one locale — drives the acceptance check. */
    List<LegalDocument> findAllCurrent(String locale, LocalDate today);

    /** Everything, drafts included, for the admin console. */
    List<LegalDocument> findAllOrderByCreatedAtDesc();

    boolean existsByDocumentTypeAndVersionAndLocale(LegalDocumentType documentType, String version, String locale);
}
