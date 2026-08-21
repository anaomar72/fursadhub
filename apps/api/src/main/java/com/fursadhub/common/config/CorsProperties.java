package com.fursadhub.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "fursadhub.cors")
public record CorsProperties(String allowedOrigins) {

    public List<String> originList() {
        return List.of(allowedOrigins.split(","));
    }
}
