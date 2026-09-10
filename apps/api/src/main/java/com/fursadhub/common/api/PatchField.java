package com.fursadhub.common.api;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.BeanProperty;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.deser.ContextualDeserializer;

import java.io.IOException;
import java.util.Objects;
import java.util.function.Function;

/**
 * One JSON request field that knows whether the client actually sent it.
 *
 * <p><strong>Why this exists.</strong> A plain nullable field cannot tell these two requests apart:
 *
 * <pre>{@code
 * {"name": "Acme"}                    // industry omitted   -> "leave industry alone"
 * {"name": "Acme", "industry": null}  // industry sent null -> "clear industry"
 * }</pre>
 *
 * <p>Both arrive in Java as {@code industry == null}. On a full-replacement endpoint that means an
 * older client — one written before a field existed, and therefore unable to send it — silently
 * ERASES that field on every save. Backend Phase B2 added ten such fields to
 * {@code PATCH /api/v1/organizations/{id}} and two to {@code PATCH /api/v1/universities/{id}}, so
 * the existing profile form, which knows nothing about them, would wipe them out.
 *
 * <p>Wrapping a field in {@code PatchField} restores the missing third state:
 *
 * <pre>
 * absent()   omitted by the client   -&gt; keep whatever is stored
 * of(null)   present as JSON null    -&gt; clear the stored value
 * of(value)  present with a value    -&gt; replace the stored value
 * </pre>
 *
 * <p><strong>Deliberately narrow.</strong> Only the fields B2 introduced use this. The pre-existing
 * fields on those two requests ({@code name}, {@code registrationNumber}, {@code website},
 * {@code description}, and the university's {@code city}) keep their plain types and their
 * historical full-replacement behaviour, because callers written against that contract may be
 * relying on it. This is not a conversion of the endpoint to JSON Merge Patch.
 *
 * <p><strong>Why not a library.</strong> {@code JsonNullable} from {@code jackson-databind-nullable}
 * does exactly this, but it is a new dependency for one behaviour that is a few dozen lines here,
 * and CLAUDE.md section 75 asks for dependencies to be justified rather than reached for. The two
 * Jackson hooks below ({@code getNullValue}, {@code getAbsentValue}) are the whole mechanism.
 *
 * <p>Validation annotations work unchanged on a wrapped field — {@code @Size}, {@code @Pattern},
 * {@code @Min} and {@code @PublicLink} all still apply to the value inside — because
 * {@link PatchFieldValueExtractor} unwraps it for Bean Validation.
 *
 * @param <T> the wrapped value type
 */
@JsonDeserialize(using = PatchField.Deserializer.class)
public final class PatchField<T> {

    private static final PatchField<?> ABSENT = new PatchField<>(false, null);

    private final boolean present;
    private final T value;

    private PatchField(boolean present, T value) {
        this.present = present;
        this.value = value;
    }

    /** The client did not send this field at all. */
    @SuppressWarnings("unchecked")
    public static <T> PatchField<T> absent() {
        return (PatchField<T>) ABSENT;
    }

    /** The client sent this field; {@code value} may be null, which means "clear it". */
    public static <T> PatchField<T> of(T value) {
        return new PatchField<>(true, value);
    }

    /**
     * Null-safe adapter for a request record component.
     *
     * <p>Jackson is asked to produce {@link #absent()} for an omitted field, but a record can still
     * hold a raw {@code null} there — a request object built directly in a test, for instance.
     * Treating that as ABSENT is the safe reading, because the alternative erases data. An explicit
     * JSON null always arrives as a real {@code of(null)} instance and is never confused with it.
     */
    public static <T> PatchField<T> orAbsent(PatchField<T> field) {
        return field == null ? absent() : field;
    }

    /** True when the client sent the field, whether its value was null or not. */
    public boolean isPresent() {
        return present;
    }

    /** The submitted value; null either because it was absent or because null was sent explicitly. */
    public T value() {
        return value;
    }

    /**
     * Resolves the field against what is currently stored: the submitted value when the client sent
     * one, the current value when it did not.
     *
     * @param currentValue what is stored today
     */
    public T resolve(T currentValue) {
        return present ? value : currentValue;
    }

    /**
     * Resolves and normalises in one step, normalising ONLY a value the client actually sent.
     *
     * <p>A preserved value is passed through untouched rather than re-normalised, so a field the
     * caller never mentioned cannot be rewritten as a side effect of an unrelated save.
     */
    public <R> R resolve(R currentValue, Function<T, R> normalizer) {
        return present ? normalizer.apply(value) : currentValue;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        return other instanceof PatchField<?> that
                && this.present == that.present
                && Objects.equals(this.value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(present, value);
    }

    @Override
    public String toString() {
        return present ? "PatchField[" + value + "]" : "PatchField.absent";
    }

    /**
     * Turns the three JSON states into the three {@code PatchField} states.
     *
     * <p>Contextual because {@code PatchField} is generic: {@code createContextual} is where Jackson
     * reports whether this particular field is a {@code PatchField<String>}, a
     * {@code PatchField<Integer>} or a {@code PatchField<CompanySizeRange>}, so the inner value is
     * deserialised — and enum-validated — exactly as an unwrapped field would have been.
     */
    static final class Deserializer extends JsonDeserializer<PatchField<?>> implements ContextualDeserializer {

        private final JavaType valueType;

        Deserializer() {
            this(null);
        }

        private Deserializer(JavaType valueType) {
            this.valueType = valueType;
        }

        @Override
        public JsonDeserializer<?> createContextual(DeserializationContext ctxt, BeanProperty property) {
            JavaType wrapperType = property != null ? property.getType() : ctxt.getContextualType();
            JavaType contained = wrapperType != null && wrapperType.containedTypeCount() == 1
                    ? wrapperType.containedType(0)
                    : ctxt.constructType(Object.class);
            return new Deserializer(contained);
        }

        /** Field present with a JSON value. */
        @Override
        public PatchField<?> deserialize(JsonParser parser, DeserializationContext ctxt) throws IOException {
            return PatchField.of(ctxt.readValue(parser, valueType));
        }

        /** Field present as JSON {@code null} — an explicit clear. */
        @Override
        public PatchField<?> getNullValue(DeserializationContext ctxt) {
            return PatchField.of(null);
        }

        /** Field missing from the JSON object entirely — leave the stored value alone. */
        @Override
        public PatchField<?> getAbsentValue(DeserializationContext ctxt) {
            return PatchField.absent();
        }
    }
}
