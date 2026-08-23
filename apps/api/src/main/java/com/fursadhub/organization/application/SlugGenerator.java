package com.fursadhub.organization.application;

import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

/** Turns an organization name into a URL-safe, unique slug. */
final class SlugGenerator {

    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^a-z0-9]+");

    private SlugGenerator() {
    }

    static String base(String name) {
        String base = NON_ALPHANUMERIC.matcher(name.toLowerCase(Locale.ROOT)).replaceAll("-");
        base = base.replaceAll("^-+|-+$", "");
        if (base.isBlank()) {
            base = "organization";
        }
        return base.length() > 90 ? base.substring(0, 90) : base;
    }

    static String withSuffix(String base) {
        return base + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
