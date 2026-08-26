package com.fursadhub.internshipmanagement.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.file.application.PrivateFileService;
import com.fursadhub.file.domain.FileClassification;
import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.internshipmanagement.domain.FinalReport;
import com.fursadhub.internshipmanagement.domain.FinalReportRepository;
import com.fursadhub.internshipmanagement.domain.FinalReportState;
import com.fursadhub.placement.domain.Placement;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Optional;
import java.util.UUID;

/**
 * Final-report use cases (CLAUDE.md sections 45/47/48, Phase 6 sections 14-17).
 *
 * <p><strong>The document is private.</strong> It is stored in private object storage under a random
 * key, never in PostgreSQL, and FursadHub publishes no URL for it — not even a pre-signed one. The
 * only way to read the bytes is {@link #openDocument}, which re-checks authorization on every call
 * and writes a {@code PRIVATE_FILE_ACCESSED} audit event (CLAUDE.md section 51).
 *
 * <p><strong>Who does what.</strong> The owning student uploads, submits and resubmits their own
 * report. University staff in scope review it — request revision or approve. Organization staff have
 * no access at all, because the final report is an academic submission rather than something the host
 * organization is automatically entitled to read (CLAUDE.md section 16).
 *
 * <p><strong>Concurrency.</strong> One report per placement is guaranteed by
 * {@code uk_final_reports_placement}, and every command re-reads the row {@code FOR UPDATE}, so a
 * double-clicked approve is a no-op rather than a second approval.
 */
@Service
public class FinalReportService {

    private final FinalReportRepository reports;
    private final PrivateFileService fileService;
    private final InternshipManagementAuthorization authorization;
    private final InternshipPolicyResolver policyResolver;
    private final InternshipNotifier notifier;
    private final AuditService audit;

    public FinalReportService(
            FinalReportRepository reports, PrivateFileService fileService,
            InternshipManagementAuthorization authorization, InternshipPolicyResolver policyResolver,
            InternshipNotifier notifier, AuditService audit) {
        this.reports = reports;
        this.fileService = fileService;
        this.authorization = authorization;
        this.policyResolver = policyResolver;
        this.notifier = notifier;
        this.audit = audit;
    }

    // ---------------------------------------------------------------- read

    @Transactional(readOnly = true)
    public Optional<FinalReport> find(UUID actingUserId, UUID placementId) {
        authorization.requireAcademicReadAccess(actingUserId, placementId);
        return reports.findByPlacementId(placementId);
    }

    /** Metadata for the attached document — filename, size, type. Never the storage key. */
    @Transactional(readOnly = true)
    public Optional<StoredFile> findDocumentMetadata(UUID actingUserId, UUID placementId) {
        authorization.requireAcademicReadAccess(actingUserId, placementId);
        return reports.findByPlacementId(placementId)
                .map(FinalReport::getStoredFileId)
                .map(fileService::metadata);
    }

    /**
     * Opens the private document for streaming, after authorizing this specific caller against this
     * specific placement.
     *
     * <p>Authorization happens HERE rather than at upload time or in the file module, because the
     * placement is the only thing that knows who may read this document, and a student's entitlement
     * to their own report says nothing about anyone else's.
     */
    @Transactional
    public Document openDocument(UUID actingUserId, UUID placementId, String ipAddress, String userAgent) {
        authorization.requireAcademicReadAccess(actingUserId, placementId);

        FinalReport report = reports.findByPlacementId(placementId).orElseThrow(this::notFound);
        if (report.getStoredFileId() == null) {
            throw new ApiException("FINAL_REPORT_FILE_MISSING", HttpStatus.NOT_FOUND,
                    "No report document has been uploaded yet.");
        }
        StoredFile file = fileService.metadata(report.getStoredFileId());

        // Every read of a private document is auditable (CLAUDE.md section 47/51). The event carries
        // identifiers only — never the storage key and never any document content.
        audit.record("PRIVATE_FILE_ACCESSED", actingUserId, ipAddress, userAgent,
                "storedFileId=" + file.getId() + ";classification=" + file.getClassification()
                        + ";placementId=" + placementId);

        return new Document(file, fileService.open(file));
    }

    /** A private document being streamed back to an authorized caller. */
    public record Document(StoredFile metadata, InputStream content) {
    }

    // ---------------------------------------------------------------- student commands

    /**
     * Uploads or replaces the report PDF on the student's own placement.
     *
     * <p>The file is validated by classification — PDF only, size-capped, and checked against the
     * actual leading bytes rather than the browser's claim (CLAUDE.md section 48). A replaced
     * document is removed from storage afterwards so an old draft does not linger.
     */
    @Transactional
    public FinalReport uploadDocument(
            UUID studentUserId, UUID placementId, MultipartFile upload, String ipAddress, String userAgent) {
        Placement placement = authorization.requireOwningStudentOnRunningPlacement(studentUserId, placementId);
        policyResolver.resolveAndFreeze(placement);

        FinalReport report = reports.findByPlacementIdForUpdate(placementId)
                .orElseGet(() -> createDraft(placementId));
        if (!report.isFileEditable()) {
            throw new ApiException("FINAL_REPORT_INVALID_TRANSITION", HttpStatus.CONFLICT,
                    "The report cannot be changed in its current state.");
        }

        StoredFile stored = fileService.store(upload, FileClassification.FINAL_REPORT, studentUserId);
        UUID replaced = report.attachFile(stored.getId());
        reports.save(report);

        // Best-effort cleanup of the superseded object; a failure here must not undo the upload.
        fileService.deleteQuietly(replaced);
        return report;
    }

    /** DRAFT or NEEDS_REVISION to SUBMITTED. Idempotent. */
    @Transactional
    public FinalReport submit(UUID studentUserId, UUID placementId, String ipAddress, String userAgent) {
        authorization.requireOwningStudentOnRunningPlacement(studentUserId, placementId);
        FinalReport report = lock(placementId);

        if (report.getState() == FinalReportState.SUBMITTED) {
            return report;
        }
        report.submit();
        reports.save(report);

        audit.record("FINAL_REPORT_SUBMITTED", studentUserId, ipAddress, userAgent, metadata(report));
        return report;
    }

    // ---------------------------------------------------------------- university commands

    /** SUBMITTED to NEEDS_REVISION. The comment is required — a rejection without one is unhelpful. */
    @Transactional
    public FinalReport requestRevision(
            UUID actingUserId, UUID placementId, String comment, String ipAddress, String userAgent) {
        if (comment == null || comment.isBlank()) {
            throw new ApiException("VALIDATION_FAILED", HttpStatus.BAD_REQUEST,
                    "Explain what the student needs to revise.");
        }
        Placement placement = authorization.requireUniversityAcademicAccess(actingUserId, placementId);
        FinalReport report = lock(placementId);

        if (report.getState() == FinalReportState.NEEDS_REVISION) {
            return report;
        }
        report.requestRevision(actingUserId, comment);
        reports.save(report);

        audit.record("FINAL_REPORT_REVISION_REQUESTED", actingUserId, ipAddress, userAgent, metadata(report));
        notifier.finalReportRevisionRequested(placement);
        return report;
    }

    /** SUBMITTED to APPROVED. Terminal — an approved report can no longer be edited or replaced. */
    @Transactional
    public FinalReport approve(
            UUID actingUserId, UUID placementId, String comment, String ipAddress, String userAgent) {
        Placement placement = authorization.requireUniversityAcademicAccess(actingUserId, placementId);
        FinalReport report = lock(placementId);

        if (report.getState() == FinalReportState.APPROVED) {
            return report;
        }
        report.approve(actingUserId, comment);
        reports.save(report);

        audit.record("FINAL_REPORT_APPROVED", actingUserId, ipAddress, userAgent, metadata(report));
        notifier.finalReportApproved(placement);
        return report;
    }

    // ---------------------------------------------------------------- helpers

    private FinalReport createDraft(UUID placementId) {
        try {
            return reports.saveAndFlush(FinalReport.createDraft(placementId));
        } catch (DataIntegrityViolationException e) {
            return reports.findByPlacementIdForUpdate(placementId).orElseThrow(() -> e);
        }
    }

    private FinalReport lock(UUID placementId) {
        return reports.findByPlacementIdForUpdate(placementId).orElseThrow(this::notFound);
    }

    private ApiException notFound() {
        return new ApiException("FINAL_REPORT_NOT_FOUND", HttpStatus.NOT_FOUND,
                "No final report has been started for this placement.");
    }

    /** Safe identifiers only — never the document contents or the review comment (CLAUDE.md section 68). */
    private String metadata(FinalReport report) {
        return "finalReportId=" + report.getId()
                + ";placementId=" + report.getPlacementId()
                + ";state=" + report.getState();
    }
}
