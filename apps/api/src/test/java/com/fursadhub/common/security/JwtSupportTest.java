package com.fursadhub.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwsHeader;

import java.security.KeyPair;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pure unit coverage of RS256 encode/validate (CLAUDE.md mandatory tests: valid/expired JWT,
 * invalid issuer/audience/signature). Builds keys and encoder/decoder directly through
 * {@link JwtSupport} — the same pipeline {@code JwtKeyConfig} wires as beans — so no Spring
 * context or database is needed.
 */
class JwtSupportTest {

    private static final String ISSUER = "fursadhub";
    private static final String AUDIENCE = "fursadhub-api";

    private final KeyPair keyPair = JwtSupport.generateEphemeralKeyPair();
    private final RSAPublicKey publicKey = (RSAPublicKey) keyPair.getPublic();
    private final RSAPrivateKey privateKey = (RSAPrivateKey) keyPair.getPrivate();

    private final JwtEncoder encoder = JwtSupport.buildEncoder(publicKey, privateKey);
    private final JwtDecoder decoder = JwtSupport.buildDecoder(publicKey, ISSUER, AUDIENCE);

    @Test
    void validTokenDecodesSuccessfully() {
        String token = encode(ISSUER, AUDIENCE, Instant.now(), Instant.now().plusSeconds(600));

        Jwt decoded = decoder.decode(token);

        assertThat(decoded.getClaimAsString("iss")).isEqualTo(ISSUER);
        assertThat(decoded.getAudience()).contains(AUDIENCE);
    }

    @Test
    void expiredTokenIsRejected() {
        String token = encode(ISSUER, AUDIENCE, Instant.now().minusSeconds(700), Instant.now().minusSeconds(100));

        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void wrongIssuerIsRejected() {
        String token = encode("someone-else", AUDIENCE, Instant.now(), Instant.now().plusSeconds(600));

        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void wrongAudienceIsRejected() {
        String token = encode(ISSUER, "someone-elses-api", Instant.now(), Instant.now().plusSeconds(600));

        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void wrongSignatureIsRejected() {
        KeyPair otherKeyPair = JwtSupport.generateEphemeralKeyPair();
        JwtEncoder otherEncoder = JwtSupport.buildEncoder((RSAPublicKey) otherKeyPair.getPublic(), (RSAPrivateKey) otherKeyPair.getPrivate());

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(UUID.randomUUID().toString())
                .issuer(ISSUER)
                .audience(List.of(AUDIENCE))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(600))
                .build();
        String token = otherEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), claims)).getTokenValue();

        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }

    private String encode(String issuer, String audience, Instant issuedAt, Instant expiresAt) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(UUID.randomUUID().toString())
                .issuer(issuer)
                .audience(List.of(audience))
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .id(UUID.randomUUID().toString())
                .build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), claims)).getTokenValue();
    }
}
