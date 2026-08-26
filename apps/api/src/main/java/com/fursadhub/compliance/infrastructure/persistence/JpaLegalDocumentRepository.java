package com.fursadhub.compliance.infrastructure.persistence;

import com.fursadhub.compliance.domain.LegalDocument;
import com.fursadhub.compliance.domain.LegalDocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

interface JpaLegalDocumentRepository extends JpaRepository<LegalDocument, UUID> {

    boolean existsByDocumentTypeAndVersionAndLocale(LegalDocumentType documentType, String version, String locale);

    List<LegalDocument> findAllByOrderByCreatedAtDesc();

    /**
     * Published and already effective, newest effective date first. Returned as a list rather than a
     * single result so the caller takes the first: several versions of the same document can be in
     * force historically, and the newest effective one wins.
     */
    @Query("""
            SELECT d FROM LegalDocument d
            WHERE d.documentType = :documentType
              AND d.locale = :locale
              AND d.publishedAt IS NOT NULL
              AND d.effectiveFrom <= :today
            ORDER BY d.effectiveFrom DESC, d.createdAt DESC
            """)
    List<LegalDocument> findCurrent(
            @Param("documentType") LegalDocumentType documentType,
            @Param("locale") String locale,
            @Param("today") LocalDate today);

    @Query("""
            SELECT d FROM LegalDocument d
            WHERE d.locale = :locale
              AND d.publishedAt IS NOT NULL
              AND d.effectiveFrom <= :today
            ORDER BY d.documentType ASC, d.effectiveFrom DESC, d.createdAt DESC
            """)
    List<LegalDocument> findAllCurrent(@Param("locale") String locale, @Param("today") LocalDate today);
}
