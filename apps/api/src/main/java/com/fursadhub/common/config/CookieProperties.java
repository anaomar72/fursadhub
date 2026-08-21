package com.fursadhub.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "fursadhub.cookie")
public record CookieProperties(boolean secure, String domain) {
}
