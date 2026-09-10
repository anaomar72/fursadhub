package com.fursadhub.common.api;

import com.fasterxml.jackson.databind.JavaType;
import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverter;
import io.swagger.v3.core.converter.ModelConverterContext;
import io.swagger.v3.core.util.Json;
import io.swagger.v3.oas.models.media.Schema;

import java.util.Iterator;

/**
 * Documents a {@link PatchField}-wrapped request field as the value it wraps.
 *
 * <p>Without this, the generated OpenAPI schema would describe the WRAPPER — {@code industry} as an
 * object with a {@code present} boolean — and tell every API consumer to send
 * {@code {"industry": {"present": true, "value": "Logistics"}}}, which the server would reject. The
 * wrapper is a server-side binding detail; over the wire the field is, and must be documented as, a
 * plain nullable string, integer or enum (CLAUDE.md sections 10 and 74).
 *
 * <p>Registered as a {@code ModelConverter} bean in {@code OpenApiConfig} — springdoc's own
 * extension point for exactly this, so no request DTO has to carry a hand-written
 * {@code @Schema(implementation = ...)} that could drift from the field's real type.
 */
public class PatchFieldModelConverter implements ModelConverter {

    @Override
    public Schema<?> resolve(AnnotatedType type, ModelConverterContext context, Iterator<ModelConverter> chain) {
        JavaType javaType = Json.mapper().constructType(type.getType());

        if (javaType != null
                && PatchField.class.isAssignableFrom(javaType.getRawClass())
                && javaType.containedTypeCount() == 1) {
            // Resolve the wrapped type instead, carrying the field's own annotations across so
            // @Size, @Pattern and friends still shape the documented schema.
            return context.resolve(new AnnotatedType(javaType.containedType(0))
                    .ctxAnnotations(type.getCtxAnnotations())
                    .parent(type.getParent())
                    .schemaProperty(type.isSchemaProperty())
                    .resolveAsRef(type.isResolveAsRef()));
        }

        return chain.hasNext() ? chain.next().resolve(type, context, chain) : null;
    }
}
