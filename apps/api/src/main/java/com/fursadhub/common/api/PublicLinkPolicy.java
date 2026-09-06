package com.fursadhub.common.api;

import java.net.URI;
import java.net.URISyntaxException;

/**
 * The one rule for any URL an institution publishes on its public profile — website and social
 * links (Backend Phase B2).
 *
 * <p>Shared policy rather than a repeated inline rule, following {@code PasswordPolicy}, which is
 * the repository's established way to express a validation rule used by more than one request DTO.
 * Apply it with {@link PublicLink}; this class holds the decision itself so it can be unit-tested
 * without a validator factory.
 *
 * <p><strong>Why parsing and not a regex.</strong> These values are rendered as links on a page
 * other people visit, and a regex that is loose enough to accept every legitimate URL is also loose
 * enough to accept malformed ones. {@link URI} is a real RFC 3986 parser: it rejects illegal
 * characters, stray whitespace and broken authorities on its own, which leaves this class deciding
 * only the two things a parser cannot know — which schemes are acceptable, and that a host is
 * actually there.
 *
 * <p><strong>The scheme allowlist is the security-relevant part.</strong> {@code javascript:}
 * executes in the viewer's page, {@code data:} can carry an inline HTML or SVG payload, and
 * {@code file:} points at the viewer's own disk. Requiring {@code http} or {@code https}
 * specifically rejects all three by construction rather than trying to enumerate dangerous schemes.
 *
 * <p>Beyond scheme and host this stays permissive on purpose: no provider-domain check, because a
 * university's LinkedIn page can legitimately live on a country subdomain or a vanity host, and no
 * path or query rules, because the path is not what makes a link dangerous. Permissive about the
 * path is not the same as permissive about the authority — see {@code hasHost}, which requires a
 * host the URI parser actually recognises.
 */
public final class PublicLinkPolicy {

    /** Shown when a URL is rejected. Frontends branch on the error CODE, never this text. */
    public static final String URL_MESSAGE = "Links must be a valid http:// or https:// web address.";

    /** Matches the existing {@code website} column, and the new social-link columns, at 255. */
    public static final int URL_MAX_LENGTH = 255;

    private PublicLinkPolicy() {
    }

    /**
     * True when {@code value} may be stored as a public profile link.
     *
     * <p>Null and blank are both accepted and mean "no link": null is an unset field, and blank is
     * what an emptied form input sends. {@link ProfileText#normalize} turns either into a stored
     * null, so neither can become an empty string masquerading as a link.
     *
     * <p>Surrounding whitespace is tolerated because {@code ProfileText.normalize} trims it before
     * storage — so what is validated here is exactly what will be written. Whitespace INSIDE the
     * value is rejected: it never survives trimming and is a sign of a malformed value, not a
     * pasting artefact.
     */
    public static boolean isValid(String value) {
        if (value == null) {
            return true;
        }
        String candidate = value.strip();
        if (candidate.isEmpty()) {
            return true;
        }
        if (containsWhitespaceOrControl(candidate)) {
            return false;
        }

        URI uri;
        try {
            uri = new URI(candidate);
        } catch (URISyntaxException malformed) {
            return false;
        }

        // Rejects a bare hostname ("example.com") and a scheme-less "://example.com", both of which
        // parse as relative references rather than absolute URLs.
        if (!uri.isAbsolute()) {
            return false;
        }
        // Opaque means there is no "//" authority component: "javascript:alert(1)", "mailto:x".
        if (uri.isOpaque()) {
            return false;
        }
        String scheme = uri.getScheme();
        if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
            return false;
        }
        return hasHost(uri);
    }

    /**
     * A parseable, server-based host must actually be present.
     *
     * <p>{@link URI#getHost()} is the whole check on purpose. It returns non-null only for an
     * authority the RFC 3986 parser recognises as a real host — a domain name, an IPv4 literal, a
     * bracketed IPv6 literal, optionally with userinfo and port — and null for anything it can only
     * treat as an opaque registry-based authority.
     *
     * <p>An earlier version fell back to the raw authority when {@code getHost()} was null, on the
     * theory that a registry-based authority might still be a host browsers resolve. That was wrong
     * in the unsafe direction: it accepted {@code https://exa_mple.com}, and equally
     * {@code https://-example.com} and {@code https://example..com}, none of which are valid public
     * hostnames — a null host is the parser reporting a malformed authority, not a gap to paper
     * over. Nothing legitimate is lost by dropping it: punycode IDNs ({@code xn--80ak6aa92e.com}),
     * IPv6 ({@code [::1]}), IPv4 and {@code localhost:8080} all resolve through {@code getHost()}.
     *
     * <p>This also rejects the empty-authority shapes {@code https://}, {@code https:///path},
     * {@code http://:8080} and {@code https://user@}, none of which name a host at all.
     */
    private static boolean hasHost(URI uri) {
        String host = uri.getHost();
        return host != null && !host.isBlank();
    }

    private static boolean containsWhitespaceOrControl(String value) {
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (Character.isWhitespace(character) || character < 0x20 || character == 0x7F) {
                return true;
            }
        }
        return false;
    }
}
