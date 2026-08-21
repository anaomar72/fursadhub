package com.fursadhub.identity.infrastructure;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmailVerificationCodeGeneratorTest {

    private final EmailVerificationCodeGenerator generator = new EmailVerificationCodeGenerator();

    @Test
    void formatPreservesLeadingZeroes() {
        assertThat(EmailVerificationCodeGenerator.format(0)).isEqualTo("0000");
        assertThat(EmailVerificationCodeGenerator.format(7)).isEqualTo("0007");
        assertThat(EmailVerificationCodeGenerator.format(42)).isEqualTo("0042");
        assertThat(EmailVerificationCodeGenerator.format(999)).isEqualTo("0999");
        assertThat(EmailVerificationCodeGenerator.format(9999)).isEqualTo("9999");
    }

    @Test
    void generateAlwaysProducesFourDigits() {
        for (int i = 0; i < 500; i++) {
            assertThat(generator.generate()).matches("\\d{4}");
        }
    }
}
