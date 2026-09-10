package com.fursadhub.common.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * What may be published as a link on an institution's public profile.
 *
 * <p>These values are rendered as clickable links on a page other people visit, so this is a
 * security boundary as much as a formatting rule: {@code javascript:} executes in the viewer's page,
 * {@code data:} carries an inline payload, {@code file:} points at the viewer's own disk.
 */
class PublicLinkPolicyTest {

    // ---------------------------------------------------------------- accepted

    @ParameterizedTest
    @ValueSource(strings = {
            "https://example.com",
            "http://example.org/path?q=1",
            "https://www.linkedin.com/company/example",
            "https://x.com/example",
            "https://youtube.com/@example",
            "https://instagram.com/example",
            // Scheme case is irrelevant to a browser and must be irrelevant here.
            "HTTPS://example.com",
            "HtTp://example.com",
            // Real shapes that must not be rejected by over-eager syntax rules.
            "https://example.com/",
            "https://example.com:8443/careers",
            "https://sub.domain.example.co.uk/a/b/c?x=1&y=2#section",
            "https://example.com/path%20with%20encoded%20spaces",
            "https://jaamacadda.example.so/xafiiska-shaqaalaha",
            "http://localhost:8080/dev-only",
            // Host forms that must keep working now that a parseable host is required: punycode
            // IDN, IPv6 literal, IPv4 literal.
            "https://xn--80ak6aa92e.com/careers",
            "https://[::1]:8443/health",
            "http://127.0.0.1:8080/dev-only"})
    void validPublicLinksAreAccepted(String url) {
        assertThat(PublicLinkPolicy.isValid(url)).as("%s must be accepted", url).isTrue();
    }

    /** Unset and emptied-form-input both mean "no link"; ProfileText.normalize stores either as null. */
    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    void blankMeansNoLinkRatherThanAMalformedOne(String blank) {
        assertThat(PublicLinkPolicy.isValid(blank)).isTrue();
    }

    @Test
    void nullIsAcceptedBecauseTheFieldIsOptional() {
        assertThat(PublicLinkPolicy.isValid(null)).isTrue();
    }

    // ---------------------------------------------------------------- rejected

    @ParameterizedTest
    @ValueSource(strings = {
            // Dangerous schemes.
            "javascript:alert(1)",
            "JavaScript:alert(1)",
            "data:text/html,test",
            "data:text/html;base64,PHN2Zy8+",
            "file:///tmp/test",
            "file:///etc/passwd",
            "ftp://example.com",
            "mailto:someone@example.com",
            "vbscript:msgbox(1)",
            // Scheme present, host missing.
            "https://",
            "http://",
            "https:///path",
            "http://:8080",
            "https://user@",
            // No scheme at all — a bare hostname is not a link.
            "example.com",
            "www.example.com",
            "//example.com",
            "/careers",
            "://example.com",
            // Malformed / whitespace / control characters.
            "https://exa mple.com",
            "https://example.com/pa th",
            "http s://example.com",
            "https://exam\tple.com",
            "https://exam\nple.com",
            "https://example.com/\u0000",
            "https://exa\u0007mple.com",
            "https://[not-an-ipv6/",
            "https://exam|ple.com",
            "ht!tp://example.com"})
    void malformedOrUnsafeLinksAreRejected(String url) {
        assertThat(PublicLinkPolicy.isValid(url)).as("%s must be rejected", url).isFalse();
    }

    /**
     * Authorities that {@link java.net.URI} parses without complaint but cannot read as a host: it
     * reports {@code getHost() == null} and keeps them only as an opaque registry-based authority.
     *
     * <p>These are the cases an earlier raw-authority fallback wrongly let through. A null host is
     * the parser saying the authority is malformed — not a gap to work around — so each of these
     * must be rejected even though the string looks superficially like a URL.
     */
    @ParameterizedTest
    @ValueSource(strings = {
            // Underscore is not legal in a hostname.
            "https://exa_mple.com",
            "https://my_host.example.com/page",
            "http://exa_mple.com:8080/path",
            // A label may not start or end with a hyphen.
            "https://-example.com",
            "https://example-.com",
            // Empty label.
            "https://example..com",
            "https://.example.com"})
    void authoritiesWithNoParseableHostAreRejected(String url) {
        assertThat(PublicLinkPolicy.isValid(url)).as("%s must be rejected", url).isFalse();
    }

    /**
     * A newline inside an otherwise plausible link is exactly the shape used to smuggle a second
     * value into a header or an attribute, so it must not survive because the rest of the string
     * looks fine.
     */
    @Test
    void anEmbeddedNewlineIsRejectedEvenWhenTheRestParses() {
        assertThat(PublicLinkPolicy.isValid("https://example.com\nX-Injected: 1")).isFalse();
    }

    // ---------------------------------------------------------------- normalisation agreement

    /**
     * Validation runs on the RAW submitted value and storage runs on the NORMALISED one, so the two
     * must agree: whatever is accepted here has to survive normalisation unchanged, or a link could
     * be validated in one shape and stored in another.
     */
    @ParameterizedTest
    @ValueSource(strings = {
            "https://example.com",
            "http://example.org/path?q=1",
            "https://www.linkedin.com/company/example",
            "https://example.com/path%20with%20encoded%20spaces",
            "https://sub.domain.example.co.uk/a/b/c?x=1&y=2#section",
            "HTTPS://example.com"})
    void normalisationDoesNotMutateAnAcceptedLink(String url) {
        assertThat(ProfileText.normalize(url)).isEqualTo(url);
    }

    /**
     * Surrounding whitespace is the one difference normalisation makes, so it is tolerated by
     * validation: what gets stored is the trimmed value, which is itself valid.
     */
    @Test
    void surroundingWhitespaceIsTrimmedAndTheTrimmedValueIsStillValid() {
        String padded = "  https://example.com  ";

        assertThat(PublicLinkPolicy.isValid(padded)).isTrue();
        assertThat(ProfileText.normalize(padded)).isEqualTo("https://example.com");
        assertThat(PublicLinkPolicy.isValid(ProfileText.normalize(padded))).isTrue();
    }

    /**
     * Internal whitespace must be rejected rather than collapsed. {@code ProfileText.normalize}
     * would turn {@code "https://exa mple.com"} into {@code "https://exa mple.com"} with a single
     * space — still broken — so accepting it would store a link that never resolves.
     */
    @Test
    void internalWhitespaceIsRejectedRatherThanCollapsedIntoABrokenLink() {
        assertThat(PublicLinkPolicy.isValid("https://exa   mple.com")).isFalse();
        assertThat(ProfileText.normalize("https://exa   mple.com")).isEqualTo("https://exa mple.com");
    }

    // ---------------------------------------------------------------- length is a separate rule

    /**
     * Length is enforced by {@code @Size} so an over-long URL reports as too long rather than as
     * malformed. This pins that the policy itself does not double up on it.
     */
    @Test
    void lengthIsLeftToTheSizeConstraint() {
        String longButWellFormed = "https://example.com/" + "a".repeat(PublicLinkPolicy.URL_MAX_LENGTH);

        assertThat(PublicLinkPolicy.isValid(longButWellFormed)).isTrue();
        assertThat(longButWellFormed.length()).isGreaterThan(PublicLinkPolicy.URL_MAX_LENGTH);
    }
}
