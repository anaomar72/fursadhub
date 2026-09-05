package com.fursadhub.common.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fursadhub.organization.api.UpdateOrganizationRequest;
import com.fursadhub.organization.domain.CompanySizeRange;
import com.fursadhub.university.api.UpdateUniversityRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The presence-aware request binding that Backend Phase B2 depends on for backward compatibility.
 *
 * <p>Everything here is a JSON-level test on the REAL request records, not on a stand-in, because
 * the whole mechanism lives in how Jackson binds a missing property. A stand-in type would prove
 * only that the wrapper class works.
 *
 * <p>The stakes: if "omitted" ever bound the same way as "explicit null", the pre-B2 profile form —
 * which does not know the new fields exist — would erase every one of them on every save.
 */
class PatchFieldTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        // Built the same way Spring builds the application's validator, so the value extractor is
        // discovered here exactly as it is at runtime: through META-INF/services.
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    // ---------------------------------------------------------------- the three states

    @Test
    void anOmittedFieldBindsAsAbsent() throws Exception {
        UpdateOrganizationRequest request = MAPPER.readValue("{\"name\":\"Acme\"}", UpdateOrganizationRequest.class);

        assertThat(request.industry().isPresent()).isFalse();
        assertThat(request.industry().value()).isNull();
        assertThat(request.industry().resolve("Telecommunications")).isEqualTo("Telecommunications");
    }

    @Test
    void anExplicitJsonNullBindsAsPresentWithNull() throws Exception {
        UpdateOrganizationRequest request =
                MAPPER.readValue("{\"name\":\"Acme\",\"industry\":null}", UpdateOrganizationRequest.class);

        assertThat(request.industry().isPresent()).isTrue();
        assertThat(request.industry().value()).isNull();
        assertThat(request.industry().resolve("Telecommunications")).isNull();
    }

    @Test
    void aSuppliedValueBindsAsPresentWithThatValue() throws Exception {
        UpdateOrganizationRequest request =
                MAPPER.readValue("{\"name\":\"Acme\",\"industry\":\"Logistics\"}", UpdateOrganizationRequest.class);

        assertThat(request.industry().isPresent()).isTrue();
        assertThat(request.industry().value()).isEqualTo("Logistics");
        assertThat(request.industry().resolve("Telecommunications")).isEqualTo("Logistics");
    }

    /**
     * The precise distinction the whole correction rests on: two requests that a plain nullable
     * field would render identical must not be identical here.
     */
    @Test
    void omittedAndExplicitNullAreDistinguishable() throws Exception {
        UpdateOrganizationRequest omitted =
                MAPPER.readValue("{\"name\":\"Acme\"}", UpdateOrganizationRequest.class);
        UpdateOrganizationRequest cleared =
                MAPPER.readValue("{\"name\":\"Acme\",\"industry\":null}", UpdateOrganizationRequest.class);

        assertThat(omitted.industry()).isNotEqualTo(cleared.industry());
        assertThat(omitted.industry().value()).isEqualTo(cleared.industry().value()).isNull();
    }

    // ---------------------------------------------------------------- every wrapped type

    /** The exact body a pre-B2 client sends. Every B2 field must come back ABSENT, not null. */
    @Test
    void theEntirePreB2OrganizationBodyLeavesEveryNewFieldAbsent() throws Exception {
        String preB2Body = """
                {"name":"Acme","registrationNumber":"REG-1","website":"https://acme.test",
                 "description":"Body"}""";

        UpdateOrganizationRequest request = MAPPER.readValue(preB2Body, UpdateOrganizationRequest.class);

        assertThat(request.name()).isEqualTo("Acme");
        assertThat(request.registrationNumber()).isEqualTo("REG-1");
        assertThat(request.website()).isEqualTo("https://acme.test");
        assertThat(request.description()).isEqualTo("Body");
        assertThat(request.industry().isPresent()).isFalse();
        assertThat(request.city().isPresent()).isFalse();
        assertThat(request.countryCode().isPresent()).isFalse();
        assertThat(request.shortDescription().isPresent()).isFalse();
        assertThat(request.companySizeRange().isPresent()).isFalse();
        assertThat(request.foundedYear().isPresent()).isFalse();
        assertThat(request.linkedinUrl().isPresent()).isFalse();
        assertThat(request.xUrl().isPresent()).isFalse();
        assertThat(request.instagramUrl().isPresent()).isFalse();
        assertThat(request.youtubeUrl().isPresent()).isFalse();
    }

    @Test
    void theEntirePreB2UniversityBodyLeavesEveryNewFieldAbsent() throws Exception {
        String preB2Body = """
                {"name":"Jamhuriya","city":"Mogadishu","registrationNumber":"REG-2",
                 "website":"https://jamhuriya.test","description":"Body"}""";

        UpdateUniversityRequest request = MAPPER.readValue(preB2Body, UpdateUniversityRequest.class);

        assertThat(request.name()).isEqualTo("Jamhuriya");
        assertThat(request.city()).isEqualTo("Mogadishu");
        assertThat(request.countryCode().isPresent()).isFalse();
        assertThat(request.publicContactEmail().isPresent()).isFalse();
    }

    /** A wrapped non-String binds through its own deserializer — enum and Integer, not just text. */
    @Test
    void wrappedEnumAndNumberValuesBindThroughTheirOwnDeserializers() throws Exception {
        UpdateOrganizationRequest request = MAPPER.readValue(
                "{\"name\":\"Acme\",\"companySizeRange\":\"SIZE_51_200\",\"foundedYear\":1994}",
                UpdateOrganizationRequest.class);

        assertThat(request.companySizeRange().value()).isEqualTo(CompanySizeRange.SIZE_51_200);
        assertThat(request.foundedYear().value()).isEqualTo(1994);
    }

    @Test
    void anUnknownEnumValueStillFailsToBind() {
        assertThat(catchBinding("{\"name\":\"Acme\",\"companySizeRange\":\"ENORMOUS\"}")).isNotNull();
    }

    @Test
    void aNonNumericYearStillFailsToBind() {
        assertThat(catchBinding("{\"name\":\"Acme\",\"foundedYear\":\"nineteen\"}")).isNotNull();
    }

    // ---------------------------------------------------------------- validation still applies

    /**
     * Wrapping a field must not silently switch its constraints off — a validation rule that stops
     * running is worse than no rule, because nothing announces it.
     */
    @Test
    void constraintsStillApplyToTheValueInsideTheWrapper() throws Exception {
        UpdateOrganizationRequest tooLong = MAPPER.readValue(
                "{\"name\":\"Acme\",\"shortDescription\":\"" + "x".repeat(201) + "\"}",
                UpdateOrganizationRequest.class);

        assertThat(validator.validate(tooLong)).extracting(violation -> violation.getPropertyPath().toString())
                .contains("shortDescription");
    }

    @Test
    void constraintsStillApplyToAWrappedUrl() throws Exception {
        UpdateOrganizationRequest unsafe = MAPPER.readValue(
                "{\"name\":\"Acme\",\"linkedinUrl\":\"javascript:alert(1)\"}", UpdateOrganizationRequest.class);

        assertThat(validator.validate(unsafe)).extracting(violation -> violation.getPropertyPath().toString())
                .contains("linkedinUrl");
    }

    @Test
    void constraintsStillApplyToAWrappedNumber() throws Exception {
        UpdateOrganizationRequest tooEarly =
                MAPPER.readValue("{\"name\":\"Acme\",\"foundedYear\":1799}", UpdateOrganizationRequest.class);

        assertThat(validator.validate(tooEarly)).extracting(violation -> violation.getPropertyPath().toString())
                .contains("foundedYear");
    }

    /** An absent field has nothing to validate; it must not be reported as a null violation. */
    @Test
    void anAbsentFieldProducesNoViolations() throws Exception {
        UpdateOrganizationRequest request = MAPPER.readValue("{\"name\":\"Acme\"}", UpdateOrganizationRequest.class);

        assertThat(validator.validate(request)).isEmpty();
    }

    /** Clearing a field is legal: null passes every optional-field constraint, as it did before. */
    @Test
    void anExplicitlyClearedFieldProducesNoViolations() throws Exception {
        UpdateOrganizationRequest request = MAPPER.readValue(
                "{\"name\":\"Acme\",\"industry\":null,\"linkedinUrl\":null,\"foundedYear\":null}",
                UpdateOrganizationRequest.class);

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void aValidFullBodyProducesNoViolations() throws Exception {
        UpdateOrganizationRequest request = MAPPER.readValue("""
                {"name":"Acme","registrationNumber":"REG-1","website":"https://acme.test",
                 "description":"Body","industry":"Telecommunications","city":"Mogadishu",
                 "countryCode":"so","shortDescription":"Short","companySizeRange":"SIZE_201_500",
                 "foundedYear":1994,"linkedinUrl":"https://www.linkedin.com/company/acme",
                 "xUrl":"https://x.com/acme","instagramUrl":"https://instagram.com/acme",
                 "youtubeUrl":"https://youtube.com/@acme"}""", UpdateOrganizationRequest.class);

        assertThat(validator.validate(request)).isEmpty();
    }

    // ---------------------------------------------------------------- the wrapper itself

    @Test
    void aRawNullWrapperIsReadAsAbsentSoItCannotErase() {
        assertThat(PatchField.orAbsent(null).isPresent()).isFalse();
        assertThat(PatchField.<String>orAbsent(null).resolve("kept")).isEqualTo("kept");
    }

    @Test
    void resolveNormalisesOnlyASubmittedValue() {
        // Present: the submitted value goes through the normaliser.
        assertThat(PatchField.of("  Financial   Services  ").resolve("stored", ProfileText::normalize))
                .isEqualTo("Financial Services");
        // Absent: the stored value is returned untouched, never re-normalised.
        assertThat(PatchField.<String>absent().resolve("  already   stored  ", ProfileText::normalize))
                .isEqualTo("  already   stored  ");
        // Present-and-null: the normaliser turns it into a clear.
        assertThat(PatchField.<String>of(null).resolve("stored", ProfileText::normalize)).isNull();
    }

    @Test
    void absentInstancesAreEqualAndDistinctFromAPresentNull() {
        assertThat(PatchField.absent()).isEqualTo(PatchField.absent());
        assertThat(PatchField.absent()).isNotEqualTo(PatchField.of(null));
        assertThat(PatchField.of("a")).isEqualTo(PatchField.of("a"));
    }

    private Exception catchBinding(String json) {
        try {
            MAPPER.readValue(json, UpdateOrganizationRequest.class);
            return null;
        } catch (Exception expected) {
            return expected;
        }
    }
}
