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
 * An organization's own logo (Phase 8) — brand identity it presents to build trust, not evidence it
 * must keep private. Upload is {@code ORGANIZATION_ADMIN}-only, the same as the license; reading it
 * back requires no authentication at all, because the whole point is that a student browsing
 * opportunities or visiting the organization's public profile sees it (CLAUDE.md section 26's "let
 * users build their brand and identity").
 */
@Service
public class OrganizationLogoService {

    private final OrganizationRepository organizations;
    private final OrganizationQueryService queryService;
    private final OrganizationAuthorization authorization;
    private final PrivateFileService fileService;

    public OrganizationLogoService(
            OrganizationRepository organizations, OrganizationQueryService queryService,
            OrganizationAuthorization authorization, PrivateFileService fileService) {
        this.organizations = organizations;
        this.queryService = queryService;
        this.authorization = authorization;
        this.fileService = fileService;
    }

    public record Document(StoredFile metadata, InputStream content) {
    }

    @Transactional
    public StoredFile upload(UUID actingUserId, UUID organizationId, MultipartFile upload) {
        authorization.requireMembership(actingUserId, organizationId, OrganizationRole.ORGANIZATION_ADMIN);

        Organization organization = queryService.getOrThrow(organizationId);
        StoredFile stored = fileService.store(upload, FileClassification.ORGANIZATION_LOGO, actingUserId);
        UUID previous = organization.getLogoStoredFileId();

        organization.attachLogo(stored.getId());
        organizations.save(organization);

        fileService.deleteQuietly(previous);
        return stored;
    }

    /** Public — no authentication, no audit: a logo view is not a private-document access. */
    public Document openPublic(UUID organizationId) {
        Organization organization = queryService.getOrThrow(organizationId);
        if (organization.getLogoStoredFileId() == null) {
            throw new ApiException("ORGANIZATION_LOGO_MISSING", HttpStatus.NOT_FOUND, "This organization has no logo.");
        }
        StoredFile file = fileService.metadata(organization.getLogoStoredFileId());
        return new Document(file, fileService.open(file));
    }
}
