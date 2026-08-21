package com.fursadhub.identity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RegistrationIT extends AbstractIdentityIT {

    @Test
    void registrationSucceedsAndCreatesPendingAccount() {
        String email = uniqueEmail("register-success");

        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/register"), Map.of("email", email, "password", "Password123"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("email")).isEqualTo(email);
        assertThat(response.getBody().get("status")).isEqualTo("PENDING_CONTACT_VERIFICATION");
    }

    @Test
    void duplicateRegistrationIsRejected() {
        String email = uniqueEmail("register-duplicate");
        restTemplate.postForEntity(url("/api/v1/auth/register"), Map.of("email", email, "password", "Password123"), Map.class);

        ResponseEntity<Map> second = restTemplate.postForEntity(
                url("/api/v1/auth/register"), Map.of("email", email, "password", "Password123"), Map.class);

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(second.getBody().get("code")).isEqualTo("EMAIL_ALREADY_REGISTERED");
    }

    @Test
    void weakPasswordFailsValidation() {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/register"), Map.of("email", uniqueEmail("register-weak"), "password", "short"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }
}
