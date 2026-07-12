package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.WalletCapabilities;
import java.time.Instant;

public record WalletAuthenticationResult(
        String accessToken,
        Instant expiresAt,
        String address,
        long chainId,
        WalletCapabilities capabilities) {}
