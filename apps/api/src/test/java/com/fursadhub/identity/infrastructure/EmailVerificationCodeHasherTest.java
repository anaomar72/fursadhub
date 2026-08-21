package com.fursadhub.identity.infrastructure;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EmailVerificationCodeHasherTest {

    private final EmailVerificationCodeHasher hasher = new EmailVerificationCodeHasher("");

    @Test
    void sameUserAndCodeProduceTheSameHash() {
        UUID userId = UUID.randomUUID();

        assertThat(hasher.hash(userId, "0007")).isEqualTo(hasher.hash(userId, "0007"));
    }

    @Test
    void differentUsersWithTheSameCodeProduceDifferentHashes() {
        String code = "1234";

        assertThat(hasher.hash(UUID.randomUUID(), code)).isNotEqualTo(hasher.hash(UUID.randomUUID(), code));
    }

    @Test
    void differentCodesForTheSameUserProduceDifferentHashes() {
        UUID userId = UUID.randomUUID();

        assertThat(hasher.hash(userId, "0001")).isNotEqualTo(hasher.hash(userId, "0002"));
    }

    @Test
    void hashIsNotThePlainCode() {
        UUID userId = UUID.randomUUID();

        assertThat(hasher.hash(userId, "1234")).doesNotContain("1234");
    }
}
