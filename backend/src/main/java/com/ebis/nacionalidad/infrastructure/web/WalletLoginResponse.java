package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.WalletAuthenticationResult;
import com.ebis.nacionalidad.domain.model.WalletCapabilities;
import java.time.Instant;

public record WalletLoginResponse(
        String accessToken, Instant expiresAt, String address, long chainId, WalletCapabilities capabilities) {

    public static WalletLoginResponse from(WalletAuthenticationResult result) {
        return new WalletLoginResponse(
                result.accessToken(), result.expiresAt(), result.address(), result.chainId(), result.capabilities());
    }
}
