package com.fursadhub.identity.infrastructure;

import com.fursadhub.common.config.JwtProperties;
import com.fursadhub.identity.domain.User;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

/** Issues short-lived RS256 access tokens with the minimal claim set (CLAUDE.md section 15). */
@Component
public class AccessTokenIssuer {

    private final JwtEncoder jwtEncoder;
    private final JwtProperties properties;

    public AccessTokenIssuer(JwtEncoder jwtEncoder, JwtProperties properties) {
        this.jwtEncoder = jwtEncoder;
        this.properties = properties;
    }

    public IssuedAccessToken issueFor(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(properties.accessTokenTtl());

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(user.getId().toString())
                .issuer(properties.issuer())
                .audience(java.util.List.of(properties.audience()))
                .issuedAt(now)
                .expiresAt(expiresAt)
                .id(UUID.randomUUID().toString())
                .build();

        String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.RS256).build(), claims))
                .getTokenValue();

        return new IssuedAccessToken(token, properties.accessTokenTtl().toSeconds());
    }

    public record IssuedAccessToken(String token, long expiresInSeconds) {
    }
}
