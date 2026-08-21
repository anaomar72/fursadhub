package com.fursadhub.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fursadhub.common.api.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** Renders unauthenticated (401) rejections from the security filter chain as the stable {@link ApiError} contract. */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiError body = ApiError.of(
                "UNAUTHORIZED",
                "Authentication is required to access this resource.",
                HttpStatus.UNAUTHORIZED.value(),
                request.getRequestURI());
        objectMapper.writeValue(response.getWriter(), body);
    }
}
