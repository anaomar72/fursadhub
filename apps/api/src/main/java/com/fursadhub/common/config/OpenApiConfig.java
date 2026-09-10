package com.fursadhub.common.config;

import com.fursadhub.common.api.PatchFieldModelConverter;
import io.swagger.v3.core.converter.ModelConverter;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI fursadhubOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("FursadHub API")
                        .description("Internship-management platform API for Somalia.")
                        .version("v1"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }

    /**
     * Makes the published contract describe a presence-aware request field as the value it carries —
     * a nullable string, integer or enum — rather than as the server-side wrapper that implements
     * omitted-versus-null. See {@link PatchFieldModelConverter}.
     */
    @Bean
    public ModelConverter patchFieldModelConverter() {
        return new PatchFieldModelConverter();
    }
}
