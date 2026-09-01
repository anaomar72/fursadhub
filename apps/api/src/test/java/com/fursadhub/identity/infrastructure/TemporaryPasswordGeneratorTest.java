package com.fursadhub.identity.infrastructure;

import com.fursadhub.identity.domain.PasswordPolicy;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A staff credential reset must never fail its own password policy — see the deterministic
 * (not probabilistic) guarantee documented on {@link TemporaryPasswordGenerator}.
 */
class TemporaryPasswordGeneratorTest {

    private static final Pattern POLICY = Pattern.compile(PasswordPolicy.REGEX);
    private final TemporaryPasswordGenerator generator = new TemporaryPasswordGenerator();

    @RepeatedTest(500)
    void everyGeneratedPasswordSatisfiesThePolicy() {
        assertThat(POLICY.matcher(generator.generate()).matches()).isTrue();
    }

    @Test
    void generatedPasswordsAreNotRepeated() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 500; i++) {
            assertThat(seen.add(generator.generate())).isTrue();
        }
    }
}
