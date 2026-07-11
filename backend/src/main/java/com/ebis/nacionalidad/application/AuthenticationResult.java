package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import java.time.Instant;

public record AuthenticationResult(
        String token, Instant expiresAt, ApplicationRole role, String evmAddress) {}
