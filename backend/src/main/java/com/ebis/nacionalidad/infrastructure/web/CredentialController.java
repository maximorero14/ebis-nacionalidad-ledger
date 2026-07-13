package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.CaseNotFoundException;
import com.ebis.nacionalidad.application.CredentialQueryService;
import com.ebis.nacionalidad.application.WrongRoleException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reads are public (no JWT) by design: this is the "verificador" actor's surface — anyone
 * with a credential id must be able to check validity without an account, and none of
 * this data is PII. See SecurityConfig.
 */
@RestController
@Tag(name = "Credentials", description = "Consulta publica de credenciales")
public class CredentialController {

    private final CredentialQueryService credentialQueryService;

    public CredentialController(CredentialQueryService credentialQueryService) {
        this.credentialQueryService = credentialQueryService;
    }

    @GetMapping("/credentials/{credentialId}")
    @Operation(summary = "Datos publicos de la credencial (sin PII)")
    public CredentialResponse getCredential(@PathVariable long credentialId) {
        return CredentialResponse.from(credentialQueryService.getCredential(credentialId));
    }

    @GetMapping("/credentials/{credentialId}/validity")
    @Operation(summary = "Vigencia de la credencial: activa o revocada")
    public ValidityResponse getValidity(@PathVariable long credentialId) {
        return new ValidityResponse(credentialQueryService.isValid(credentialId));
    }

    @ExceptionHandler(CaseNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(CaseNotFoundException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    @ExceptionHandler(WrongRoleException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorResponse handleWrongRole(WrongRoleException exception) {
        return new ErrorResponse(exception.getMessage());
    }
}
