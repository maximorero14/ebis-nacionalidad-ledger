package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.CaseNotFoundException;
import com.ebis.nacionalidad.application.CredentialCommandService;
import com.ebis.nacionalidad.application.CredentialQueryService;
import com.ebis.nacionalidad.application.WrongRoleException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reads are public (no JWT) by design: this is the "verificador" actor's surface — anyone
 * with a credential id/QR must be able to check validity without an account, and none of
 * this data is PII. See SecurityConfig.
 */
@RestController
@Tag(name = "Credentials", description = "Consulta y revocacion de credenciales")
public class CredentialController {

    private static final String IDEMPOTENCY_HEADER = "Idempotency-Key";

    private final CredentialQueryService credentialQueryService;
    private final CredentialCommandService credentialCommandService;

    public CredentialController(
            CredentialQueryService credentialQueryService, CredentialCommandService credentialCommandService) {
        this.credentialQueryService = credentialQueryService;
        this.credentialCommandService = credentialCommandService;
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

    @PostMapping("/credentials/{credentialId}/revoke")
    @Operation(summary = "Revoca la credencial con un codigo de causa (emisor)")
    public TransactionResponse revoke(
            @PathVariable long credentialId,
            @Valid @RequestBody ReasonCodeRequest request,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(
                credentialCommandService.revoke(actor.role(), credentialId, request.reasonCode(), idempotencyKey));
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
