package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.file.application.PrivateFileService;
import com.fursadhub.file.domain.FileClassification;
import com.fursadhub.file.domain.StoredFile;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

/**
 * A personal profile picture (Phase 8). Unlike every other document in FursadHub, an avatar is not
 * private: it is identity a person presents to others on the platform, so any authenticated caller
 * may view any other account's avatar — there is no ownership check on the read side, only on the
 * write side (only the account itself may upload or replace its own picture).
 *
 * <p>Still routed through {@link PrivateFileService#openAudited} like every private document, so a
 * random storage key and no public URL hold here too — "not private" means visible to any signed-in
 * user, not literally public on the open internet.
 */
@Service
public class AvatarService {

    private final UserRepository users;
    private final PrivateFileService fileService;

    public AvatarService(UserRepository users, PrivateFileService fileService) {
        this.users = users;
        this.fileService = fileService;
    }

    public record Document(StoredFile metadata, InputStream content) {
    }

    @Transactional
    public StoredFile upload(UUID actingUserId, MultipartFile upload) {
        User user = requireUser(actingUserId);
        StoredFile stored = fileService.store(upload, FileClassification.PROFILE_PICTURE, actingUserId);
        UUID previous = user.getAvatarStoredFileId();

        user.attachAvatar(stored.getId());
        users.save(user);

        // Best-effort, after the pointer has moved — see the identical rationale on the evidence
        // services this mirrors.
        fileService.deleteQuietly(previous);
        return stored;
    }

    @Transactional
    public Document open(UUID targetUserId, UUID actingUserId, String ipAddress, String userAgent) {
        User user = requireUser(targetUserId);
        if (user.getAvatarStoredFileId() == null) {
            throw new ApiException("AVATAR_MISSING", HttpStatus.NOT_FOUND, "This account has no profile picture.");
        }
        StoredFile file = fileService.metadata(user.getAvatarStoredFileId());
        return new Document(file, fileService.openAudited(
                file, actingUserId, "avatarOwnerId=" + targetUserId, ipAddress, userAgent));
    }

    private User requireUser(UUID userId) {
        return users.findById(userId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "No such account."));
    }
}
