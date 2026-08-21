package com.fursadhub.identity.application;

import com.fursadhub.common.api.ApiException;
import com.fursadhub.identity.domain.EmailNormalizer;
import com.fursadhub.identity.domain.User;
import com.fursadhub.identity.domain.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegisterUserService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final IssueEmailVerificationTokenService verificationTokenIssuer;

    public RegisterUserService(
            UserRepository users, PasswordEncoder passwordEncoder, IssueEmailVerificationTokenService verificationTokenIssuer) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.verificationTokenIssuer = verificationTokenIssuer;
    }

    @Transactional
    public User register(String rawEmail, String rawPassword, String preferredLocale) {
        String email = EmailNormalizer.normalize(rawEmail);
        if (users.existsByEmail(email)) {
            throw new ApiException("EMAIL_ALREADY_REGISTERED", HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        String locale = (preferredLocale == null || preferredLocale.isBlank()) ? "en" : preferredLocale;
        User user = User.register(email, passwordEncoder.encode(rawPassword), locale);
        users.save(user);

        verificationTokenIssuer.issueAndSend(user);

        return user;
    }
}
