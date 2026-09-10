package com.fursadhub.candidacy.application;

import com.fursadhub.candidacy.domain.*;
import com.fursadhub.common.api.ApiException;
import com.fursadhub.file.application.PrivateFileService;
import com.fursadhub.file.domain.*;
import com.fursadhub.opportunity.application.PublicOpportunityQueryService;
import com.fursadhub.student.application.StudentMarketplaceAccess;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;
import java.util.UUID;

@Service
public class ApplicationCvService {
    private final ApplicationCvUploadRepository uploads;
    private final PrivateFileService files;
    private final StudentMarketplaceAccess access;
    private final PublicOpportunityQueryService opportunities;
    private final CandidacyRepository candidacies;

    public ApplicationCvService(ApplicationCvUploadRepository uploads, PrivateFileService files,
            StudentMarketplaceAccess access, PublicOpportunityQueryService opportunities, CandidacyRepository candidacies) {
        this.uploads = uploads; this.files = files; this.access = access;
        this.opportunities = opportunities; this.candidacies = candidacies;
    }
    public record Uploaded(UUID id, String filename, String contentType) {}
    public record Document(StoredFile metadata, InputStream content) {}

    @Transactional
    public Uploaded upload(UUID student, UUID opportunity, MultipartFile document) {
        access.requireStudent(student);
        opportunities.getPublicOrThrow(opportunity);
        StoredFile file = files.store(document, FileClassification.CV, student);
        ApplicationCvUpload upload = uploads.save(ApplicationCvUpload.create(student, opportunity, file.getId()));
        return new Uploaded(upload.getId(), file.getOriginalFilename(), file.getContentType());
    }

    /** Called inside the same transaction as screening validation and candidacy creation. */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public ApplicationCvUpload requireReady(UUID student, UUID opportunity, UUID uploadId) {
        if (uploadId == null) throw required();
        ApplicationCvUpload upload = owned(student, opportunity, uploadId);
        if (upload.getCandidacyId() != null) throw new ApiException("APPLICATION_CV_ALREADY_USED", HttpStatus.CONFLICT, "This CV upload is already attached to an application.");
        StoredFile file = files.metadata(upload.getStoredFileId());
        if (!student.equals(file.getUploadedBy()) || file.getClassification() != FileClassification.CV
                || !FileClassification.CV.permittedContentTypes().contains(file.getContentType())) throw required();
        try (var content = files.open(file)) {
            if (content.read() == -1) throw required();
        } catch (java.io.IOException failure) { throw required(); }
        return upload;
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void claim(ApplicationCvUpload upload, Candidacy candidacy) {
        candidacy.attachApplicationCv(upload.getStoredFileId());
        candidacies.save(candidacy);
        upload.claim(candidacy.getId());
        uploads.save(upload);
    }

    @Transactional
    public Document openOwn(UUID student, UUID opportunity, UUID uploadId, String ip, String agent) {
        ApplicationCvUpload upload = owned(student, opportunity, uploadId);
        StoredFile file = files.metadata(upload.getStoredFileId());
        return new Document(file, files.openAudited(file, student, "applicationCvUploadId=" + uploadId, ip, agent));
    }

    @Transactional
    public void remove(UUID student, UUID opportunity, UUID uploadId) {
        ApplicationCvUpload upload = owned(student, opportunity, uploadId);
        if (upload.getCandidacyId() != null) throw new ApiException("APPLICATION_CV_ALREADY_USED", HttpStatus.CONFLICT, "Submitted application CVs cannot be replaced or removed.");
        uploads.delete(upload);
        files.deleteAfterCommit(upload.getStoredFileId());
    }

    private ApplicationCvUpload owned(UUID student, UUID opportunity, UUID id) {
        return uploads.findForUpdate(id)
                .filter(upload -> upload.getStudentUserId().equals(student) && upload.getOpportunityId().equals(opportunity))
                .orElseThrow(() -> new ApiException("APPLICATION_CV_NOT_FOUND", HttpStatus.NOT_FOUND, "Application CV not found."));
    }
    private ApiException required() {
        return new ApiException("APPLICATION_CV_REQUIRED", HttpStatus.BAD_REQUEST, "Upload a CV for this application before submitting.");
    }
}
