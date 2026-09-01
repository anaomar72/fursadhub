package com.fursadhub.identity.api;

/** Whether a profile picture is on file. No file id — see {@link AvatarController}. */
public record AvatarResponse(boolean present) {
}
