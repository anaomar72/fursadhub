package com.fursadhub.common.notification;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "fursadhub.notification")
public record NotificationProperties(String fromAddress, String appBaseUrl) {
}
