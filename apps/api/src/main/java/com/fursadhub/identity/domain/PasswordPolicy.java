package com.fursadhub.identity.domain;

/** Shared password strength rule, referenced by both registration and reset request validation. */
public final class PasswordPolicy {

    /** At least 8 characters, containing at least one letter and one digit. */
    public static final String REGEX = "^(?=.*[A-Za-z])(?=.*\\d).{8,100}$";

    private PasswordPolicy() {
    }
}
