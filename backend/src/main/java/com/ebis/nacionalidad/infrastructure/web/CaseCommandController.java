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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Cases", description = "Ciclo de vida del expediente")
public class CaseCommandController {

    private final CaseCommandService caseCommandService;

    public CaseCommandController(CaseCommandService caseCommandService) {
        this.caseCommandService = caseCommandService;
    }

    @PostMapping("/cases")
    @Operation(summary = "Crea un expediente propio (ciudadano)")
    public CreateCaseResponse createCase(@AuthenticationPrincipal Jwt jwt) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return CreateCaseResponse.from(caseCommandService.createCase(actor.role()));
    }

    @PostMapping("/cases/{caseId}/documents")
    @Operation(summary = "Presenta un compromiso documental salado (ciudadano titular)")
    public SubmitDocumentsResponse submitDocuments(
            @PathVariable long caseId,
            @Valid @RequestBody SubmitDocumentsRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return SubmitDocumentsResponse.from(
                caseCommandService.submitDocuments(actor.role(), caseId, request.documentReference()));
    }

    @PostMapping("/cases/{caseId}/resubmit")
    @Operation(summary = "Vuelve a presentar documentos tras una subsanacion (mismo efecto que /documents)")
    public SubmitDocumentsResponse resubmit(
            @PathVariable long caseId,
            @Valid @RequestBody SubmitDocumentsRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return submitDocuments(caseId, request, jwt);
    }

    @PostMapping("/cases/{caseId}/faucet")
    @Operation(summary = "Reclama Euro Digital demo para pagar la tasa (ciudadano titular)")
    public TransactionResponse claimFaucet(@PathVariable long caseId, @AuthenticationPrincipal Jwt jwt) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(caseCommandService.claimFaucet(actor.role()));
    }

    @PostMapping("/cases/{caseId}/fee")
    @Operation(summary = "Aprueba y paga la tasa administrativa (ciudadano titular)")
    public TransactionResponse payFee(@PathVariable long caseId, @AuthenticationPrincipal Jwt jwt) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(caseCommandService.payFee(actor.role(), caseId));
    }

    @PostMapping("/cases/{caseId}/remediation")
    @Operation(summary = "Solicita subsanacion (extranjeria o policia)")
    public TransactionResponse requestRemediation(
            @PathVariable long caseId,
            @Valid @RequestBody ReasonCodeRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(
                caseCommandService.requestRemediation(actor.role(), caseId, request.reasonCode()));
    }

    @PostMapping("/cases/{caseId}/foreign-affairs-approval")
    @Operation(summary = "Aprobacion de extranjeria")
    public TransactionResponse approveForeignAffairs(
            @PathVariable long caseId, @AuthenticationPrincipal Jwt jwt) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(caseCommandService.approveForeignAffairs(actor.role(), caseId));
    }

    @PostMapping("/cases/{caseId}/police-approval")
    @Operation(summary = "Aprobacion de policia")
    public TransactionResponse approvePolice(@PathVariable long caseId, @AuthenticationPrincipal Jwt jwt) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(caseCommandService.approvePolice(actor.role(), caseId));
    }

    @PostMapping("/cases/{caseId}/reject")
    @Operation(summary = "Rechaza el expediente (extranjeria o policia)")
    public TransactionResponse rejectCase(
            @PathVariable long caseId,
            @Valid @RequestBody ReasonCodeRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(
                caseCommandService.rejectCase(actor.role(), caseId, request.reasonCode()));
    }

    @PostMapping("/cases/{caseId}/credential")
    @Operation(summary = "Emite la credencial tras la doble aprobacion (emisor)")
    public TransactionResponse issueCredential(@PathVariable long caseId, @AuthenticationPrincipal Jwt jwt) {
        AuthenticatedActor actor = AuthenticatedActor.from(jwt);
        return TransactionResponse.from(caseCommandService.issueCredential(actor.role(), caseId));
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

    // Coarse for now: M6.4 owns mapping each Solidity custom error to a specific HTTP
    // status/domain error. Surfacing the raw revert reason keeps this endpoint honest and
    // usable in the meantime instead of a generic, uninformative 500.
    @ExceptionHandler(ContractCallRevertedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleContractReverted(ContractCallRevertedException exception) {
        return new ErrorResponse(exception.getMessage());
    }
}
