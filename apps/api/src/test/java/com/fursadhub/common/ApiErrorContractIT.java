package com.fursadhub.common;

import com.fursadhub.administration.AbstractPhase7IT;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The error half of the API contract (CLAUDE.md section 11): a malformed request must come back as a
 * 4xx carrying a stable {@code code}, never as {@code 500 INTERNAL_ERROR}.
 *
 * <p>Before these existed, everything Spring MVC itself rejected — the wrong HTTP verb, a path
 * variable that is not a UUID, an unknown enum constant, an unparseable timestamp, an unknown path,
 * an unsupported content type — fell through to the catch-all handler and was reported as a server
 * fault. That misleads the caller (the frontend maps {@code code} to translated copy, so every one
 * of these showed "Something went wrong"), and it buries real incidents in the 500 rate that
 * CLAUDE.md section 68 asks operators to alert on.
 */
class ApiErrorContractIT extends AbstractPhase7IT {

    private void assertError(ResponseEntity<Map> response, HttpStatus status, String code) {
        assertThat(response.getStatusCode()).isEqualTo(status);
        assertThat(response.getBody()).containsEntry("code", code);
        assertThat(response.getBody()).containsKey("path");
        assertThat(response.getBody()).containsKey("timestamp");
    }

    @Test
    @DisplayName("The wrong HTTP verb on a real path is 405, not 500")
    void wrongMethodIsMethodNotAllowed() {
        Staff admin = superAdmin("err-method");

        // /organizations exists for POST, not GET.
        assertError(authorizedGet("/api/v1/organizations", admin.token()),
                HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED");
    }

    @Test
    @DisplayName("A path variable that is not a UUID is 400, not 500")
    void malformedUuidPathVariableIsBadRequest() {
        Staff admin = superAdmin("err-uuid");

        assertError(authorizedGet("/api/v1/admin/users/not-a-uuid", admin.token()),
                HttpStatus.BAD_REQUEST, "VALIDATION_FAILED");
    }

    @Test
    @DisplayName("An unknown enum constant in a query parameter is 400, not 500")
    void unknownEnumQueryParameterIsBadRequest() {
        Staff admin = superAdmin("err-enum");

        assertError(authorizedGet("/api/v1/admin/users?status=NOT_A_REAL_STATUS", admin.token()),
                HttpStatus.BAD_REQUEST, "VALIDATION_FAILED");
    }

    @Test
    @DisplayName("An unparseable timestamp in a query parameter is 400, not 500")
    void unparseableInstantIsBadRequest() {
        Staff admin = superAdmin("err-instant");

        assertError(authorizedGet("/api/v1/admin/audit-events?from=not-a-date", admin.token()),
                HttpStatus.BAD_REQUEST, "VALIDATION_FAILED");
    }

    @Test
    @DisplayName("A malformed UUID in a query parameter is 400, not 500")
    void malformedUuidQueryParameterIsBadRequest() {
        Staff admin = superAdmin("err-uuid-query");

        assertError(authorizedGet("/api/v1/admin/audit-events?userId=nope", admin.token()),
                HttpStatus.BAD_REQUEST, "VALIDATION_FAILED");
    }

    @Test
    @DisplayName("An unknown path is 404, not 500")
    void unknownPathIsNotFound() {
        Staff admin = superAdmin("err-404");

        assertError(authorizedGet("/api/v1/there-is-no-such-endpoint", admin.token()),
                HttpStatus.NOT_FOUND, "NOT_FOUND");
    }

    @Test
    @DisplayName("A real resource id that does not exist keeps its own domain code")
    void missingResourceKeepsItsDomainCode() {
        Staff admin = superAdmin("err-missing");

        // Still 404, but from the domain rather than the routing layer — the distinction matters,
        // so the generic NOT_FOUND handler must not swallow it.
        ResponseEntity<Map> response = authorizedGet("/api/v1/admin/users/" + UUID.randomUUID(), admin.token());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().get("code")).isEqualTo("USER_NOT_FOUND");
    }

    @Test
    @DisplayName("A malformed JSON body is still 400 with the validation code")
    void malformedBodyIsBadRequest() {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                url("/api/v1/auth/login"), Map.of("email", "nope"), Map.class);

        // Missing password -> bean validation, not a server fault.
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("code")).isEqualTo("VALIDATION_FAILED");
    }
}
