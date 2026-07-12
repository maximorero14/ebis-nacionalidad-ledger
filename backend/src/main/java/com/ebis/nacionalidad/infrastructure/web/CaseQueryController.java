package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.CaseAccessDeniedException;
import com.ebis.nacionalidad.application.CaseNotFoundException;
import com.ebis.nacionalidad.application.CaseQueryService;
import com.ebis.nacionalidad.application.WrongRoleException;
import com.ebis.nacionalidad.domain.model.CaseEvent;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Cases", description = "Consulta de expedientes")
public class CaseQueryController {

    private final CaseQueryService caseQueryService;

    public CaseQueryController(CaseQueryService caseQueryService) {
        this.caseQueryService = caseQueryService;
    }

    @GetMapping("/cases/{caseId}")
    @Operation(
            summary = "Consulta un expediente",
            description =
                    "Un ciudadano solo puede ver su propio expediente; extranjeria, policia y el "
                            + "emisor pueden ver cualquiera.")
    public CaseResponse getCase(@PathVariable long caseId, @AuthenticationPrincipal Jwt jwt) {
        AuthenticatedWallet wallet = AuthenticatedWallet.from(jwt);
        return CaseResponse.from(caseQueryService.getCase(caseId, wallet.address()));
    }

    @GetMapping("/cases/{caseId}/timeline")
    @Operation(
            summary = "Historial de eventos del expediente",
            description = "Reconstruido leyendo los eventos on-chain directamente (ver M6.5).")
    public List<CaseEvent> getTimeline(@PathVariable long caseId, @AuthenticationPrincipal Jwt jwt) {
        AuthenticatedWallet wallet = AuthenticatedWallet.from(jwt);
        return caseQueryService.getTimeline(caseId, wallet.address());
    }

    @GetMapping("/cases")
    @Operation(
            summary = "Bandeja de expedientes (solo roles institucionales)",
            description =
                    "Lee case_projection (M6.5), no la cadena directamente: puede quedar hasta 10s "
                            + "detras del estado on-chain real entre ciclos del scheduler. Filtro "
                            + "opcional por status.")
    public List<CaseSummaryResponse> listCases(
            @RequestParam(required = false) CaseStatus status, @AuthenticationPrincipal Jwt jwt) {
        AuthenticatedWallet wallet = AuthenticatedWallet.from(jwt);
        return caseQueryService.listCases(wallet.address(), status).stream()
                .map(CaseSummaryResponse::from)
                .toList();
    }

    @GetMapping("/cases/mine")
    @Operation(summary = "Expedientes propios de la wallet autenticada")
    public List<CaseSummaryResponse> listMine(@AuthenticationPrincipal Jwt jwt) {
        AuthenticatedWallet wallet = AuthenticatedWallet.from(jwt);
        return caseQueryService.listMine(wallet.address()).stream().map(CaseSummaryResponse::from).toList();
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

    @ExceptionHandler(CaseAccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorResponse handleAccessDenied(CaseAccessDeniedException exception) {
        return new ErrorResponse(exception.getMessage());
    }
}
