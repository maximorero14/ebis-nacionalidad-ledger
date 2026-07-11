package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.AuthenticationService;
import com.ebis.nacionalidad.application.CaseAccessDeniedException;
import com.ebis.nacionalidad.application.CaseNotFoundException;
import com.ebis.nacionalidad.application.CaseQueryService;
import com.ebis.nacionalidad.domain.model.ApplicationRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
        ApplicationRole role =
                ApplicationRole.valueOf(jwt.getClaimAsString(AuthenticationService.CLAIM_ROLE));
        String evmAddress = jwt.getClaimAsString(AuthenticationService.CLAIM_EVM_ADDRESS);
        return CaseResponse.from(caseQueryService.getCase(caseId, role, evmAddress));
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
