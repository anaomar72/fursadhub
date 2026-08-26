package com.fursadhub.compliance.infrastructure.persistence;

import com.fursadhub.compliance.domain.LegalDocument;
import com.fursadhub.compliance.domain.LegalDocumentRepository;
import com.fursadhub.compliance.domain.LegalDocumentType;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
class LegalDocumentRepositoryAdapter implements LegalDocumentRepository {

    private final JpaLegalDocumentRepository jpaRepository;

    LegalDocumentRepositoryAdapter(JpaLegalDocumentRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public LegalDocument save(LegalDocument document) {
        return jpaRepository.save(document);
    }

    @Override
    public Optional<LegalDocument> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<LegalDocument> findCurrent(LegalDocumentType documentType, String locale, LocalDate today) {
        return jpaRepository.findCurrent(documentType, locale, today).stream().findFirst();
    }

    /**
     * Collapses the query's per-type history down to the single current version of each type. The
     * query is ordered by type then effective date descending, so the first row seen for a type is
     * the one in force.
     */
    @Override
    public List<LegalDocument> findAllCurrent(String locale, LocalDate today) {
        Map<LegalDocumentType, LegalDocument> current = new LinkedHashMap<>();
        for (LegalDocument document : jpaRepository.findAllCurrent(locale, today)) {
            current.putIfAbsent(document.getDocumentType(), document);
        }
        return new ArrayList<>(current.values());
    }

    @Override
    public List<LegalDocument> findAllOrderByCreatedAtDesc() {
        return jpaRepository.findAllByOrderByCreatedAtDesc();
    }

    @Override
    public boolean existsByDocumentTypeAndVersionAndLocale(LegalDocumentType documentType, String version, String locale) {
        return jpaRepository.existsByDocumentTypeAndVersionAndLocale(documentType, version, locale);
    }
}
