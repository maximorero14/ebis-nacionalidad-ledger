package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.AuthenticationResult;
import com.ebis.nacionalidad.domain.model.ApplicationRole;
import java.time.Instant;

public record LoginResponse(
        String accessToken, String tokenType, Instant expiresAt, ApplicationRole role, String evmAddress) {

    public static LoginResponse from(AuthenticationResult result) {
        return new LoginResponse(
                result.token(), "Bearer", result.expiresAt(), result.role(), result.evmAddress());
    }
}
