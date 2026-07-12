package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.WalletAuthenticationService;
import org.springframework.security.oauth2.jwt.Jwt;

public record AuthenticatedWallet(String address, long chainId) {

    public static AuthenticatedWallet from(Jwt jwt) {
        Number chainId = jwt.getClaim(WalletAuthenticationService.CLAIM_CHAIN_ID);
        return new AuthenticatedWallet(
                jwt.getClaimAsString(WalletAuthenticationService.CLAIM_EVM_ADDRESS),
                chainId.longValue());
    }
}
