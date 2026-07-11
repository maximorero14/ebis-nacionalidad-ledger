package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.CaseCommandService;
import com.ebis.nacionalidad.application.CaseNotFoundException;
import com.ebis.nacionalidad.application.WrongRoleException;
import com.ebis.nacionalidad.infrastructure.blockchain.ContractCallRevertedException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Cases", description = "Ciclo de vida del expediente")
public class CaseCommandController {

    private static final String IDEMPOTENCY_HEADER = "Idempotency-Key";

    private final CaseCommandService caseCommandService;

    public CaseCommandController(CaseCommandService caseCommandService) {
        this.caseCommandService = caseCommandService;
    }

    @PostMapping("/cases")
    @Operation(summary = "Crea un expediente propio (ciudadano)")
    public CreateCaseResponse createCase(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return CreateCaseResponse.from(caseCommandService.createCase(actor.role(), idempotencyKey));
    }

    @PostMapping("/cases/{caseId}/documents")
    @Operation(summary = "Presenta un compromiso documental salado (ciudadano titular)")
    public SubmitDocumentsResponse submitDocuments(
            @PathVariable long caseId,
            @Valid @RequestBody SubmitDocumentsRequest request,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return SubmitDocumentsResponse.from(
                caseCommandService.submitDocuments(
                        actor.role(), caseId, request.documentReference(), idempotencyKey));
    }

    @PostMapping("/cases/{caseId}/resubmit")
    @Operation(summary = "Vuelve a presentar documentos tras una subsanacion (mismo efecto que /documents)")
    public SubmitDocumentsResponse resubmit(
            @PathVariable long caseId,
            @Valid @RequestBody SubmitDocumentsRequest request,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        return submitDocuments(caseId, request, jwt, idempotencyKey);
    }

    @PostMapping("/cases/{caseId}/faucet")
    @Operation(summary = "Reclama Euro Digital demo para pagar la tasa (ciudadano titular)")
    public TransactionResponse claimFaucet(
            @PathVariable long caseId,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(caseCommandService.claimFaucet(actor.role(), idempotencyKey));
    }

    @PostMapping("/cases/{caseId}/fee")
    @Operation(summary = "Aprueba y paga la tasa administrativa (ciudadano titular)")
    public TransactionResponse payFee(
            @PathVariable long caseId,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(caseCommandService.payFee(actor.role(), caseId, idempotencyKey));
    }

    @PostMapping("/cases/{caseId}/remediation")
    @Operation(summary = "Solicita subsanacion (extranjeria o policia)")
    public TransactionResponse requestRemediation(
            @PathVariable long caseId,
            @Valid @RequestBody ReasonCodeRequest request,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(
                caseCommandService.requestRemediation(actor.role(), caseId, request.reasonCode(), idempotencyKey));
    }

    @PostMapping("/cases/{caseId}/foreign-affairs-approval")
    @Operation(summary = "Aprobacion de extranjeria")
    public TransactionResponse approveForeignAffairs(
            @PathVariable long caseId,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(
                caseCommandService.approveForeignAffairs(actor.role(), caseId, idempotencyKey));
    }

    @PostMapping("/cases/{caseId}/police-approval")
    @Operation(summary = "Aprobacion de policia")
    public TransactionResponse approvePolice(
            @PathVariable long caseId,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(caseCommandService.approvePolice(actor.role(), caseId, idempotencyKey));
    }

    @PostMapping("/cases/{caseId}/reject")
    @Operation(summary = "Rechaza el expediente (extranjeria o policia)")
    public TransactionResponse rejectCase(
            @PathVariable long caseId,
            @Valid @RequestBody ReasonCodeRequest request,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(
                caseCommandService.rejectCase(actor.role(), caseId, request.reasonCode(), idempotencyKey));
    }

    @PostMapping("/cases/{caseId}/credential")
    @Operation(summary = "Emite la credencial tras la doble aprobacion (emisor)")
    public TransactionResponse issueCredential(
            @PathVariable long caseId,
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = IDEMPOTENCY_HEADER, required = false) String idempotencyKey) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(caseCommandService.issueCredential(actor.role(), caseId, idempotencyKey));
    }

    @ExceptionHandler(WrongRoleException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorResponse handleWrongRole(WrongRoleException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    @ExceptionHandler(CaseNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(CaseNotFoundException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    // A mined-but-reverted transaction is now surfaced as TransactionResponse{status:
    // REVERTED, errorCode, errorMessage} instead of an exception (see M6.4 evidence).
    // This handler only remains for a genuine RPC-level rejection before the node ever
    // accepts the transaction (e.g. malformed payload) — distinct from "mined but reverted".
    @ExceptionHandler(ContractCallRevertedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleContractReverted(ContractCallRevertedException exception) {
        return new ErrorResponse(exception.getMessage());
    }
}
