package com.fursadhub.common.api;

import jakarta.validation.valueextraction.ExtractedValue;
import jakarta.validation.valueextraction.UnwrapByDefault;
import jakarta.validation.valueextraction.ValueExtractor;

/**
 * Lets Bean Validation see THROUGH a {@link PatchField} to the value inside it.
 *
 * <p>Without this, wrapping a field would silently disable its constraints: {@code @Size(max = 120)}
 * declared on a {@code PatchField<String>} has no validator for the container type, and a
 * validation rule that quietly stops running is worse than no rule at all.
 *
 * <p>{@code @UnwrapByDefault} means every constraint on a {@code PatchField} field applies to the
 * wrapped value automatically, so the request records read exactly as they did before the wrapper
 * was introduced — same annotations, same messages, same {@code VALIDATION_FAILED} field errors.
 * This is the same mechanism Hibernate Validator uses for {@code Optional}.
 *
 * <p>An ABSENT field yields no value at all, so its constraints are not evaluated. That is correct:
 * the client said nothing about the field, so there is nothing to validate and the stored value —
 * already validated when it was written — is what will be kept.
 *
 * <p>Registered through {@code META-INF/services/jakarta.validation.valueextraction.ValueExtractor},
 * the discovery mechanism defined by the Jakarta Bean Validation specification, so it applies to
 * every validator the application builds rather than only to one hand-configured factory.
 */
@UnwrapByDefault
public class PatchFieldValueExtractor implements ValueExtractor<PatchField<@ExtractedValue ?>> {

    @Override
    public void extractValues(PatchField<?> originalValue, ValueReceiver receiver) {
        if (originalValue != null && originalValue.isPresent()) {
            // Null node name: this is a single wrapped value, not a keyed/indexed container.
            receiver.value(null, originalValue.value());
        }
    }
}
