package com.fursadhub.organization;

import com.fursadhub.administration.AbstractPhase7IT;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The organization registration license and who may touch it (CLAUDE.md sections 26, 31, 47-48, 60).
 *
 * <p>Before Phase 7.5 an organization could put itself in the review queue with nothing attached,
 * which made VERIFIED a rubber stamp — and VERIFIED is what lets an organization publish
 * opportunities at all. These tests pin both halves of the fix: the gate on submission, and the
 * boundary around the document itself, which is a private file and therefore reachable only by the
 * organization's own members and by platform reviewers.
 */
class OrganizationVerificationEvidenceIT extends AbstractPhase7IT {

    // ---------------------------------------------------------------- the submission gate

    @Test
    @DisplayName("An organization cannot enter the review queue without a license")
    void submissionRequiresEvidence() {
        String ownerToken = registerVerifiedAndLogin("ev-gate-owner");
        UUID organizationId = createOrganization(ownerToken, "Gate Org " + UUID.randomUUID());

        ResponseEntity<Map> refused = authorizedPost(
                "/api/v1/organizations/" + organizationId + "/verification/submit", ownerToken, null);

        assertThat(refused.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(errorCode(refused)).isEqualTo("ORGANIZATION_VERIFICATION_EVIDENCE_REQUIRED");
        assertThat(organizationStatus(organizationId)).isEqualTo("DRAFT");
        assertThat(authorizedGet("/api/v1/organizations/" + organizationId, ownerToken).getBody().get("hasEvidence"))
                .isEqualTo(false);

        requireOk(uploadOrganizationEvidence(
                ownerToken, organizationId, "license.pdf", "application/pdf", validPdfBytes()),
                "Upload license");

        ResponseEntity<Map> submitted = authorizedPost(
                "/api/v1/organizations/" + organizationId + "/verification/submit", ownerToken, null);

        requireOk(submitted, "Submit");
        assertThat(submitted.getBody().get("verificationStatus")).isEqualTo("SUBMITTED");
        assertThat(submitted.getBody().get("hasEvidence")).isEqualTo(true);
        assertThat(submitted.getBody().get("evidenceUploadedAt")).isNotNull();
    }

    @Test
    @DisplayName("Uploading a license records an audit event")
    void uploadIsAudited() {
        String ownerToken = registerVerifiedAndLogin("ev-audit-owner");
        UUID organizationId = createOrganization(ownerToken, "Audited Org " + UUID.randomUUID());

        int before = countAuditEvents("ORGANIZATION_VERIFICATION_EVIDENCE_UPLOADED");
        requireOk(uploadOrganizationEvidence(
                ownerToken, organizationId, "license.pdf", "application/pdf", validPdfBytes()),
                "Upload license");

        assertThat(countAuditEvents("ORGANIZATION_VERIFICATION_EVIDENCE_UPLOADED")).isEqualTo(before + 1);
    }

    @Test
    @DisplayName("Replacing a license leaves exactly one document behind")
    void replacingEvidenceRemovesThePreviousFile() {
        String ownerToken = registerVerifiedAndLogin("ev-replace-owner");
        UUID organizationId = createOrganization(ownerToken, "Replacing Org " + UUID.randomUUID());

        int before = countStoredFiles();
        requireOk(uploadOrganizationEvidence(
                ownerToken, organizationId, "old.pdf", "application/pdf", validPdfBytes()), "First upload");
        requireOk(uploadOrganizationEvidence(
                ownerToken, organizationId, "new.pdf", "application/pdf", validPdfBytes()), "Second upload");

        assertThat(countStoredFiles()).isEqualTo(before + 1);
    }

    @Test
    @DisplayName("The license must be a PDF, checked on its bytes and not its name")
    void licenseMustBeAPdf() {
        String ownerToken = registerVerifiedAndLogin("ev-mime-owner");
        UUID organizationId = createOrganization(ownerToken, "Mime Org " + UUID.randomUUID());

        ResponseEntity<Map> wrongType = uploadOrganizationEvidence(
                ownerToken, organizationId, "license.png", "image/png", validPngBytes());
        assertThat(wrongType.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(wrongType)).isEqualTo("ORGANIZATION_EVIDENCE_FILE_INVALID");

        ResponseEntity<Map> renamed = uploadOrganizationEvidence(
                ownerToken, organizationId, "license.pdf", "application/pdf",
                "MZ this is an executable".getBytes(StandardCharsets.UTF_8));
        assertThat(renamed.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode(renamed)).isEqualTo("ORGANIZATION_EVIDENCE_FILE_INVALID");
    }

    @Test
    @DisplayName("An organization with no license on file has nothing to download")
    void missingEvidenceIsNotFound() {
        String ownerToken = registerVerifiedAndLogin("ev-empty-owner");
        UUID organizationId = createOrganization(ownerToken, "Empty Org " + UUID.randomUUID());

        ResponseEntity<byte[]> download = downloadDocument(
                "/api/v1/organizations/" + organizationId + "/verification/evidence/document", ownerToken);

        assertThat(download.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ---------------------------------------------------------------- organization isolation

    @Test
    @DisplayName("Organization B cannot upload to or download Organization A's license")
    void organizationIsolationAppliesToTheLicense() {
        String ownerA = registerVerifiedAndLogin("ev-org-a");
        UUID organizationA = createOrganization(ownerA, "Org A " + UUID.randomUUID());
        requireOk(uploadOrganizationEvidence(
                ownerA, organizationA, "license.pdf", "application/pdf", validPdfBytes()), "Upload A");

        String ownerB = registerVerifiedAndLogin("ev-org-b");
        createOrganization(ownerB, "Org B " + UUID.randomUUID());

        // B is an ORGANIZATION_ADMIN — but at their own organization. The role is not the permission.
        ResponseEntity<Map> upload = uploadOrganizationEvidence(
                ownerB, organizationA, "swap.pdf", "application/pdf", validPdfBytes());
        assertThat(upload.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(upload)).isEqualTo("ACCESS_DENIED");

        ResponseEntity<byte[]> download = downloadDocument(
                "/api/v1/organizations/" + organizationA + "/verification/evidence/document", ownerB);
        assertThat(download.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("A recruiter may read their organization's license but not replace it")
    void uploadIsAdminOnlyWhileReadingIsNot() {
        String ownerToken = registerVerifiedAndLogin("ev-recruiter-owner");
        UUID organizationId = createOrganization(ownerToken, "Recruiter Org " + UUID.randomUUID());
        requireOk(uploadOrganizationEvidence(
                ownerToken, organizationId, "license.pdf", "application/pdf", validPdfBytes()), "Upload");
        Staff recruiter = organizationStaff("ev-recruiter", organizationId, "RECRUITER");

        ResponseEntity<Map> upload = uploadOrganizationEvidence(
                recruiter.token(), organizationId, "swap.pdf", "application/pdf", validPdfBytes());
        assertThat(upload.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(errorCode(upload)).isEqualTo("ACCESS_DENIED");

        ResponseEntity<byte[]> download = downloadDocument(
                "/api/v1/organizations/" + organizationId + "/verification/evidence/document", recruiter.token());
        assertThat(download.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(download.getBody()).isEqualTo(validPdfBytes());
    }

    // ---------------------------------------------------------------- the reviewer route

    @Test
    @DisplayName("Both platform reviewer roles can open the license")
    void platformReviewersCanRead() {
        String ownerToken = registerVerifiedAndLogin("ev-review-owner");
        UUID organizationId = createOrganization(ownerToken, "Reviewed Org " + UUID.randomUUID());
        submitOrganizationForVerification(ownerToken, organizationId);

        Staff officer = verificationOfficer("ev-officer");
        Staff admin = superAdmin("ev-super");
        String path = "/api/v1/admin/organizations/" + organizationId + "/verification/evidence/document";

        assertThat(downloadDocument(path, officer.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(downloadDocument(path, admin.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("A student with no platform grant cannot open any organization's license")
    void ordinaryUsersAreRefusedTheReviewerRoute() {
        UUID universityId = insertVerifiedUniversity("License Onlooker University");
        UUID departmentId = insertDepartment(universityId, "Computing", "CS");
        StudentFixture student = createVerifiedStudent("ev-onlooker", universityId, departmentId);

        String ownerToken = registerVerifiedAndLogin("ev-onlooked-owner");
        UUID organizationId = createOrganization(ownerToken, "Onlooked Org " + UUID.randomUUID());
        submitOrganizationForVerification(ownerToken, organizationId);

        // Neither the reviewer route nor the organization's own route is open to an outsider.
        assertThat(downloadDocument(
                "/api/v1/admin/organizations/" + organizationId + "/verification/evidence/document",
                student.accessToken()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(downloadDocument(
                "/api/v1/organizations/" + organizationId + "/verification/evidence/document",
                student.accessToken()).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("An unauthenticated caller reaches neither route")
    void anonymousCallersAreRefused() {
        String ownerToken = registerVerifiedAndLogin("ev-anon-owner");
        UUID organizationId = createOrganization(ownerToken, "Anon Org " + UUID.randomUUID());
        submitOrganizationForVerification(ownerToken, organizationId);

        assertThat(unauthenticatedGet(
                "/api/v1/organizations/" + organizationId + "/verification/evidence/document")
                .getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unauthenticatedGet(
                "/api/v1/admin/organizations/" + organizationId + "/verification/evidence/document")
                .getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("No response ever exposes the license's storage key")
    void storageKeysAreNeverExposed() {
        String ownerToken = registerVerifiedAndLogin("ev-key-owner");
        UUID organizationId = createOrganization(ownerToken, "Key Org " + UUID.randomUUID());

        ResponseEntity<Map> upload = uploadOrganizationEvidence(
                ownerToken, organizationId, "license.pdf", "application/pdf", validPdfBytes());
        requireOk(upload, "Upload");

        String storageKey = jdbcTemplate.queryForObject(
                "SELECT sf.storage_key FROM stored_files sf "
                        + "JOIN organizations o ON o.evidence_stored_file_id = sf.id WHERE o.id = ?",
                String.class, organizationId);

        assertThat(storageKey).isNotBlank();
        assertThat(upload.getBody().toString()).doesNotContain(storageKey);
        assertThat(authorizedGet("/api/v1/organizations/" + organizationId, ownerToken).getBody().toString())
                .doesNotContain(storageKey);
    }

    private String organizationStatus(UUID organizationId) {
        return jdbcTemplate.queryForObject(
                "SELECT verification_status FROM organizations WHERE id = ?", String.class, organizationId);
    }
}
