package com.fursadhub.candidacy.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** An owned upload for exactly one opportunity; claiming it never changes its file. */
@Entity @Table(name = "application_cv_uploads")
public class ApplicationCvUpload {
    @Id private UUID id;
    @Column(name = "student_user_id", nullable = false) private UUID studentUserId;
    @Column(name = "opportunity_id", nullable = false) private UUID opportunityId;
    @Column(name = "stored_file_id", nullable = false) private UUID storedFileId;
    @Column(name = "candidacy_id") private UUID candidacyId;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    protected ApplicationCvUpload() {}
    public static ApplicationCvUpload create(UUID student, UUID opportunity, UUID file) {
        var upload = new ApplicationCvUpload();
        upload.id = UUID.randomUUID(); upload.studentUserId = student; upload.opportunityId = opportunity;
        upload.storedFileId = file; upload.createdAt = Instant.now();
        return upload;
    }
    public UUID getId() { return id; }
    public UUID getStudentUserId() { return studentUserId; }
    public UUID getOpportunityId() { return opportunityId; }
    public UUID getStoredFileId() { return storedFileId; }
    public UUID getCandidacyId() { return candidacyId; }
    public void claim(UUID candidacy) {
        if (candidacyId != null) throw new IllegalStateException("CV upload is already claimed");
        candidacyId = candidacy;
    }
}
