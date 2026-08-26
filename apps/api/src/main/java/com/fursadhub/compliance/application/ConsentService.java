package com.fursadhub.compliance.application;

import com.fursadhub.common.audit.AuditService;
import com.fursadhub.compliance.domain.ConsentRecord;
import com.fursadhub.compliance.domain.ConsentRecordRepository;
import com.fursadhub.compliance.domain.ConsentType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The user's own optional-processing consents (CLAUDE.md section 49).
 *
 * <p>Strictly self-service: consent is meaningless if someone else can grant it, so every method here
 * takes the authenticated caller's own id and there is no administrative path to set a consent for
 * another user. An administrator can see that a consent exists in the audit trail; they cannot create
 * one.
 *
 * <p>Absence means "not granted". A user who has never answered is shown the choice, not opted in.
 */
@Service
public class ConsentService {

    private final ConsentRecordRepository consents;
    private final AuditService audit;

    public ConsentService(ConsentRecordRepository consents, AuditService audit) {
        this.consents = consents;
        this.audit = audit;
    }

    /**
     * Every consent type with the user's current position, including the ones they have never
     * answered. Returning the full set rather than only stored rows means the UI can render the
     * complete list without knowing which types exist.
     */
    @Transactional(readOnly = true)
    public List<ConsentRecord> currentFor(UUID userId) {
        Map<ConsentType, ConsentRecord> stored = consents.findByUserId(userId).stream()
                .collect(Collectors.toMap(ConsentRecord::getConsentType, Function.identity(), (a, b) -> a));

        List<ConsentRecord> all = new ArrayList<>();
        for (ConsentType type : ConsentType.values()) {
            all.add(stored.getOrDefault(type, ConsentRecord.initial(userId, type)));
        }
        return all;
    }

    /**
     * Grants or withdraws one consent.
     *
     * <p>Both directions are audited. A withdrawal that left no trace would make it impossible to
     * show later when processing should have stopped, which is exactly what a withdrawal record is
     * for.
     */
    @Transactional
    public ConsentRecord set(UUID userId, ConsentType consentType, boolean granted, String ip, String userAgent) {
        ConsentRecord record = consents.findByUserIdAndConsentType(userId, consentType)
                .orElseGet(() -> ConsentRecord.initial(userId, consentType));

        if (granted) {
            record.grant();
        } else {
            record.withdraw();
        }
        ConsentRecord saved = consents.save(record);

        audit.record(granted ? "CONSENT_GRANTED" : "CONSENT_WITHDRAWN", userId, ip, userAgent,
                consentType.name());
        return saved;
    }
}
