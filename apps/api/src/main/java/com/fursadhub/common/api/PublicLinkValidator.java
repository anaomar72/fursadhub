package com.fursadhub.common.api;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Bean Validation adapter for {@link PublicLinkPolicy}. The decision lives in the policy so it can
 * be exercised directly by a unit test; this class only wires it into the constraint framework.
 */
public class PublicLinkValidator implements ConstraintValidator<PublicLink, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return PublicLinkPolicy.isValid(value);
    }
}
