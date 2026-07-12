package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.CaseEventProjectionService;
import com.ebis.nacionalidad.application.OnChainAuthorizationService;
import com.ebis.nacionalidad.application.WrongRoleException;
import com.ebis.nacionalidad.domain.model.ApplicationRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Institutional-only (not a citizen concern): operates on the whole {@code case_projection}
 * read-model across every case, not one citizen's own expediente (see M6.5 evidence).
 */
@RestController
@Tag(name = "Projection", description = "Estado interno de la proyeccion case_projection (M6.5)")
public class ProjectionController {

    private final CaseEventProjectionService projectionService;
    private final OnChainAuthorizationService authorizationService;

    public ProjectionController(
            CaseEventProjectionService projectionService, OnChainAuthorizationService authorizationService) {
        this.projectionService = projectionService;
        this.authorizationService = authorizationService;
    }

    @PostMapping("/projection/resync")
    @Operation(summary = "Reprocesa la proyeccion (desde el cursor, o desde cero con fromScratch=true)")
    public ResyncResponse resync(
            @RequestParam(defaultValue = "false") boolean fromScratch, @AuthenticationPrincipal Jwt jwt) {
        requireInstitutionalWallet(AuthenticatedWallet.from(jwt).address());
        if (fromScratch) {
            projectionService.reprocessFromScratch();
        } else {
            projectionService.catchUp();
        }
        return new ResyncResponse(fromScratch ? "REPROCESSED_FROM_SCRATCH" : "CAUGHT_UP");
    }

    @GetMapping("/projection/divergences")
    @Operation(summary = "Expedientes cuyo estado proyectado ya no coincide con la cadena")
    public List<DivergenceResponse> divergences(@AuthenticationPrincipal Jwt jwt) {
        requireInstitutionalWallet(AuthenticatedWallet.from(jwt).address());
        return projectionService.detectDivergences().stream().map(DivergenceResponse::from).toList();
    }

    private void requireInstitutionalWallet(String address) {
        if (!authorizationService.capabilitiesFor(address).canSeeInstitutionalCases()) {
            throw new WrongRoleException(
                    ApplicationRole.FOREIGN_AFFAIRS, ApplicationRole.POLICE, ApplicationRole.CREDENTIAL_ISSUER);
        }
    }

    @ExceptionHandler(WrongRoleException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorResponse handleWrongRole(WrongRoleException exception) {
        return new ErrorResponse(exception.getMessage());
    }
}
