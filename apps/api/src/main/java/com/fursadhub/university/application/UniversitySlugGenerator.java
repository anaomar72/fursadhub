package com.fursadhub.university.application;

import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Turns a university name into a URL-safe, unique slug.
 *
 * <p>The organization module has an equivalent. It stays duplicated rather than being pulled into
 * {@code common}: fifteen lines are cheaper than a shared utility that couples two bounded modules
 * together and turns any future per-tenant-kind change (a different fallback word, a different
 * length cap) into a change that touches both.
 */
final class UniversitySlugGenerator {

    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^a-z0-9]+");

    private UniversitySlugGenerator() {
    }

    static String base(String name) {
        String base = NON_ALPHANUMERIC.matcher(name.toLowerCase(Locale.ROOT)).replaceAll("-");
        base = base.replaceAll("^-+|-+$", "");
        if (base.isBlank()) {
            base = "university";
        }
        return base.length() > 90 ? base.substring(0, 90) : base;
    }

    static String withSuffix(String base) {
        return base + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
