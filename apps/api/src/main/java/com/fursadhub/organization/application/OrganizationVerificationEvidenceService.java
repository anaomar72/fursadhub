package com.fursadhub.organization.application;

import com.fursadhub.administration.application.PlatformAuthorization;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.common.audit.AuditService;
import com.fursadhub.file.application.PrivateFileService;
import com.fursadhub.file.domain.FileClassification;
import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.organization.domain.Organization;
import com.fursadhub.organization.domain.OrganizationRepository;
import com.fursadhub.organization.domain.OrganizationRole;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

/**
 * The registration license backing an organization's verification claim (CLAUDE.md sections 26, 31,
 * 47-48).
 *
 * <p>The document exists so a platform reviewer has something to actually read before deciding that
 * an organization may publish opportunities. It stays private, and the reader list is exactly two
 * kinds of caller:
 *
 * <ul>
 *   <li>a current member of THAT organization, reading their own license back;</li>
 *   <li>a platform SUPER_ADMIN or VERIFICATION_OFFICER, who is the person the document was uploaded
 *       for in the first place.</li>
 * </ul>
 *
 * <p>Nobody else — a member of another organization reaches it by changing the id in the URL and
 * gets ACCESS_DENIED, because every check re-reads current membership from PostgreSQL rather than
 * trusting anything in the request (CLAUDE.md section 24).
 *
 * <p>Uploading is narrower than reading: it is {@code ORGANIZATION_ADMIN} only. A recruiter can see
 * the organization they work for is verified; deciding what the platform reviews on its behalf is
 * the admin's call.
 *
 * <p>No URL is ever issued for the file, and every read goes through
 * {@link PrivateFileService#openAudited} so it lands in the audit trail.
 */
@Service
public class OrganizationVerificationEvidenceService {

    private final OrganizationRepository organizations;
    private final OrganizationQueryService queryService;
    private final OrganizationAuthorization authorization;
    private final PlatformAuthorization platformAuthorization;
    private final PrivateFileService fileService;
    private final AuditService audit;

    public OrganizationVerificationEvidenceService(
            OrganizationRepository organizations,
            OrganizationQueryService queryService,
            OrganizationAuthorization authorization,
            PlatformAuthorization platformAuthorization,
            PrivateFileService fileService,
            AuditService audit) {
        this.organizations = organizations;
        this.queryService = queryService;
        this.authorization = authorization;
        this.platformAuthorization = platformAuthorization;
        this.fileService = fileService;
        this.audit = audit;
    }

    /** A private document being streamed back to an authorized caller. */
    public record Document(StoredFile metadata, InputStream content) {
    }

    /**
     * Uploads or replaces the organization's license.
     *
     * <p>Permitted while the organization is under review, not only while it is a DRAFT: a reviewer
     * who returns it with NEEDS_CHANGES usually wants a better copy of exactly this document, and
     * forcing a state transition first would make that correction harder than the mistake.
     */
    @Transactional
    public StoredFile upload(
            UUID actingUserId, UUID organizationId, MultipartFile upload, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);

        Organization organization = queryService.getOrThrow(organizationId);
        StoredFile stored = fileService.store(
                upload, FileClassification.ORGANIZATION_VERIFICATION_EVIDENCE, actingUserId);
        UUID previous = organization.getEvidenceStoredFileId();

        organization.attachEvidence(stored.getId());
        organizations.save(organization);

        audit.record("ORGANIZATION_VERIFICATION_EVIDENCE_UPLOADED", actingUserId, ipAddress, userAgent,
                "organizationId=" + organizationId + ";storedFileId=" + stored.getId());

        // Best-effort, after the pointer has moved: a storage hiccup here must not roll back an
        // upload the organization has already completed. The worst case is one orphaned object.
        fileService.deleteQuietly(previous);
        return stored;
    }

    /** A member of the organization reading their own license back. */
    @Transactional
    public Document openOwn(UUID actingUserId, UUID organizationId, String ipAddress, String userAgent) {
        authorization.requireMembership(actingUserId, organizationId);
        return open(queryService.getOrThrow(organizationId), actingUserId, ipAddress, userAgent);
    }

    /** A platform reviewer reading the license of an organization they are reviewing. */
    @Transactional
    public Document openForPlatformReviewer(
            UUID actingUserId, UUID organizationId, String ipAddress, String userAgent) {
        platformAuthorization.requireReviewer(actingUserId);
        return open(queryService.getOrThrow(organizationId), actingUserId, ipAddress, userAgent);
    }

    // ---------------------------------------------------------------- internals

    private Document open(Organization organization, UUID actingUserId, String ipAddress, String userAgent) {
        if (organization.getEvidenceStoredFileId() == null) {
            throw new ApiException("ORGANIZATION_VERIFICATION_EVIDENCE_MISSING", HttpStatus.NOT_FOUND,
                    "No registration license has been uploaded for this organization.");
        }
        StoredFile file = fileService.metadata(organization.getEvidenceStoredFileId());
        return new Document(file, fileService.openAudited(
                file, actingUserId, "organizationId=" + organization.getId(), ipAddress, userAgent));
    }
}
