package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.AuthenticationService;
import com.ebis.nacionalidad.domain.model.ApplicationRole;
import org.springframework.security.oauth2.jwt.Jwt;

/** Extracts the authenticated caller's role and EVM address from their JWT claims. */
public record AuthenticatedActor(ApplicationRole role, String evmAddress) {

    public static AuthenticatedActor from(Jwt jwt) {
        return new AuthenticatedActor(
                ApplicationRole.valueOf(jwt.getClaimAsString(AuthenticationService.CLAIM_ROLE)),
                jwt.getClaimAsString(AuthenticationService.CLAIM_EVM_ADDRESS));
    }
}
