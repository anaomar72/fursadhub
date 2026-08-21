package com.fursadhub.common.security;

import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.UUID;

/**
 * Pure (non-Spring-managed) RS256 key handling and encoder/decoder construction, so both the
 * production {@code JwtKeyConfig} beans and unit tests build the exact same signing/validation
 * pipeline without needing a Spring context or a database (see CLAUDE.md sections 15-16).
 */
public final class JwtSupport {

    private static final Logger log = LoggerFactory.getLogger(JwtSupport.class);

    private JwtSupport() {
    }

    /** Generates an ephemeral RSA-2048 keypair for local/test use when no key is configured. */
    public static KeyPair generateEphemeralKeyPair() {
        log.warn("No JWT_PRIVATE_KEY/JWT_PUBLIC_KEY configured — generating an ephemeral RSA keypair. "
                + "This is only safe for local development and tests; staging/production MUST configure real keys.");
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("RSA key generation is unavailable", e);
        }
    }

    public static RSAPrivateKey parsePrivateKey(String pem) {
        try {
            byte[] decoded = Base64.getDecoder().decode(stripPemHeaders(pem));
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            return (RSAPrivateKey) keyFactory.generatePrivate(new PKCS8EncodedKeySpec(decoded));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid JWT_PRIVATE_KEY: must be a PKCS#8 PEM-encoded RSA private key", e);
        }
    }

    public static RSAPublicKey parsePublicKey(String pem) {
        try {
            byte[] decoded = Base64.getDecoder().decode(stripPemHeaders(pem));
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            return (RSAPublicKey) keyFactory.generatePublic(new X509EncodedKeySpec(decoded));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid JWT_PUBLIC_KEY: must be an X.509 PEM-encoded RSA public key", e);
        }
    }

    private static String stripPemHeaders(String pem) {
        return pem
                .replaceAll("-----BEGIN [A-Z ]+-----", "")
                .replaceAll("-----END [A-Z ]+-----", "")
                .replaceAll("\\s", "");
    }

    public static JwtEncoder buildEncoder(RSAPublicKey publicKey, RSAPrivateKey privateKey) {
        RSAKey rsaKey = new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .keyID(UUID.randomUUID().toString())
                .build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new com.nimbusds.jose.jwk.JWKSet(rsaKey)));
    }

    public static JwtDecoder buildDecoder(RSAPublicKey publicKey, String issuer, String audience) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();

        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);
        OAuth2TokenValidator<Jwt> withAudience = token -> {
            if (token.getAudience() != null && token.getAudience().contains(audience)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "The required audience is missing", null));
        };

        decoder.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
                withIssuer, withAudience));
        return decoder;
    }
}
