package com.fursadhub.common.config;

import com.fursadhub.common.security.JwtSupport;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;

import java.security.KeyPair;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

/**
 * Wires the RS256 signing/validation key pair (CLAUDE.md section 15-16). Real deployments MUST
 * configure {@code JWT_PRIVATE_KEY}/{@code JWT_PUBLIC_KEY}; when absent (local/test only) an
 * ephemeral in-memory keypair is generated so the app still boots. {@link JwtSupport} does the
 * actual PEM parsing/key generation so the logic is reusable and unit-testable without Spring.
 */
@Configuration
public class JwtKeyConfig {

    @Bean
    public RSAPrivateKey jwtPrivateKey(JwtProperties properties) {
        return (RSAPrivateKey) sharedKeyPair(properties).getPrivate();
    }

    @Bean
    public RSAPublicKey jwtPublicKey(JwtProperties properties) {
        return (RSAPublicKey) sharedKeyPair(properties).getPublic();
    }

    @Bean
    public JwtEncoder jwtEncoder(RSAPublicKey jwtPublicKey, RSAPrivateKey jwtPrivateKey) {
        return JwtSupport.buildEncoder(jwtPublicKey, jwtPrivateKey);
    }

    @Bean
    public JwtDecoder jwtDecoder(RSAPublicKey jwtPublicKey, JwtProperties properties) {
        return JwtSupport.buildDecoder(jwtPublicKey, properties.issuer(), properties.audience());
    }

    private KeyPair keyPair;

    /**
     * Both the private and public key beans must resolve to the same underlying keypair; this
     * caches it for the lifetime of context refresh so ephemeral generation only happens once.
     */
    private synchronized KeyPair sharedKeyPair(JwtProperties properties) {
        if (keyPair != null) {
            return keyPair;
        }
        boolean hasPrivate = properties.privateKeyLocation() != null && !properties.privateKeyLocation().isBlank();
        boolean hasPublic = properties.publicKeyLocation() != null && !properties.publicKeyLocation().isBlank();

        if (hasPrivate && hasPublic) {
            RSAPrivateKey privateKey = JwtSupport.parsePrivateKey(properties.privateKeyLocation());
            RSAPublicKey publicKey = JwtSupport.parsePublicKey(properties.publicKeyLocation());
            keyPair = new KeyPair(publicKey, privateKey);
        } else {
            keyPair = JwtSupport.generateEphemeralKeyPair();
        }
        return keyPair;
    }
}
