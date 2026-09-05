package com.fursadhub.common.api;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a request field as a public profile link: a syntactically valid {@code http://} or
 * {@code https://} URL with a host, decided by {@link PublicLinkPolicy}.
 *
 * <p>A Bean Validation constraint rather than a check inside each service, so a rejected link
 * arrives as the standard {@code VALIDATION_FAILED} response with the offending field named in
 * {@code fieldErrors} (CLAUDE.md section 11), exactly like every other request rule — and so no new
 * request field can quietly skip the check by forgetting to call a helper.
 *
 * <p>Pair it with {@code @Size(max = PublicLinkPolicy.URL_MAX_LENGTH)}: length is a separate concern
 * with its own message, and keeping it separate means an over-long URL says so rather than being
 * reported as malformed. Applies to a {@link PatchField}-wrapped field too — see
 * {@link PatchFieldValueExtractor}.
 *
 * <p>Targets mirror {@code @Size} so the annotation behaves identically on a record component.
 */
@Documented
@Constraint(validatedBy = PublicLinkValidator.class)
@Target({ElementType.METHOD, ElementType.FIELD, ElementType.ANNOTATION_TYPE, ElementType.CONSTRUCTOR,
        ElementType.PARAMETER, ElementType.TYPE_USE})
@Retention(RetentionPolicy.RUNTIME)
public @interface PublicLink {

    String message() default PublicLinkPolicy.URL_MESSAGE;

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
