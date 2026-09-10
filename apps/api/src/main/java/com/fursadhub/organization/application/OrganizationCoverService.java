package com.fursadhub.organization.application;

import com.fursadhub.common.api.ApiException;
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
 * An organization's public profile banner (Backend Phase B2) — the hero image at the top of its
 * public profile.
 *
 * <p>Deliberately identical in shape to {@link OrganizationLogoService}: {@code ORGANIZATION_ADMIN}
 * to upload, no authentication to read, the previous file deleted on replace, and the bytes stored
 * through {@link PrivateFileService} rather than in the organization row or behind an arbitrary
 * external URL. Copying that lifecycle exactly is the point — two nearly identical media features
 * that behave differently is how one of them ends up with the weaker rule.
 *
 * <p>Validation (permitted MIME types, size cap) belongs to
 * {@link FileClassification#ORGANIZATION_COVER} and is enforced inside {@code PrivateFileService},
 * so this service cannot accidentally relax it.
 */
@Service
public class OrganizationCoverService {

    private final OrganizationRepository organizations;
    private final OrganizationQueryService queryService;
    private final OrganizationAuthorization authorization;
    private final PrivateFileService fileService;

    public OrganizationCoverService(
            OrganizationRepository organizations, OrganizationQueryService queryService,
            OrganizationAuthorization authorization, PrivateFileService fileService) {
        this.organizations = organizations;
        this.queryService = queryService;
        this.authorization = authorization;
        this.fileService = fileService;
    }

    public record Document(StoredFile metadata, InputStream content) {
    }

    /**
     * Uploads or replaces the banner.
     *
     * <p>{@code requireMembership} resolves the caller's CURRENT membership at THIS organization, so
     * a recruiter, a supervisor, an admin of a different organization and an unauthenticated caller
     * are all refused before a byte is read — tenant isolation comes from the membership lookup, not
     * from the id in the path (CLAUDE.md section 24).
     */
    @Transactional
    public StoredFile upload(UUID actingUserId, UUID organizationId, MultipartFile upload) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);

        Organization organization = queryService.getOrThrow(organizationId);
        StoredFile stored = fileService.store(upload, FileClassification.ORGANIZATION_COVER, actingUserId);
        UUID previous = organization.getCoverStoredFileId();

        organization.attachCover(stored.getId());
        organizations.save(organization);

        // Only after the new pointer is committed, so a failed delete can never orphan the profile.
        fileService.deleteQuietly(previous);
        return stored;
    }

    /** Public — no authentication, no audit: a banner view is not a private-document access. */
    public Document openPublic(UUID organizationId) {
        Organization organization = queryService.getOrThrow(organizationId);
        if (organization.getCoverStoredFileId() == null) {
            throw new ApiException("ORGANIZATION_COVER_MISSING", HttpStatus.NOT_FOUND,
                    "This organization has no cover image.");
        }
        StoredFile file = fileService.metadata(organization.getCoverStoredFileId());
        return new Document(file, fileService.open(file));
    }
}
