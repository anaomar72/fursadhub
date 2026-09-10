package com.fursadhub.university.api;

import jakarta.validation.constraints.NotBlank;

/**
 * Assigns the one-time login username to an existing managed staff account (Backend Phase B5.5).
 *
 * <p>{@code @NotBlank} is what makes the empty-payload boundary safe: {@code {}}, an explicit null
 * and a blank string all fail request validation as {@code VALIDATION_FAILED}, and a missing body
 * fails through the existing unreadable-body convention. There is deliberately NO clear operation —
 * a username, once assigned, is permanent — so an absent value can never mean "remove it".
 */
public record AssignStaffUsernameRequest(@NotBlank String username) {
}
