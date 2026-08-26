package com.fursadhub.compliance.api;

import com.fursadhub.compliance.application.LegalDocumentService;
import com.fursadhub.compliance.domain.LegalDocumentType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public, unauthenticated access to the legal documents currently in force.
 *
 * <p>Deliberately under {@code /public/}, which {@code SecurityConfig} permits without a token:
 * someone deciding whether to register must be able to read the terms first, and requiring a login
 * to read the terms you are agreeing to would be backwards.
 */
@RestController
@RequestMapping("/api/v1/public/legal-documents")
public class PublicLegalDocumentController {

    private final LegalDocumentService legalDocumentService;

    public PublicLegalDocumentController(LegalDocumentService legalDocumentService) {
        this.legalDocumentService = legalDocumentService;
    }

    @GetMapping
    public List<LegalDocumentResponse> current(@RequestParam(required = false) String locale) {
        return legalDocumentService.allCurrent(locale).stream()
                .map(LegalDocumentResponse::summary)
                .toList();
    }

    @GetMapping("/{documentType}")
    public LegalDocumentResponse current(
            @PathVariable LegalDocumentType documentType, @RequestParam(required = false) String locale) {
        return LegalDocumentResponse.from(legalDocumentService.current(documentType, locale));
    }
}
