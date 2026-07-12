package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.infrastructure.persistence.WalletChallengeEntity;
import java.time.Instant;

public record WalletNonceResponse(String nonce, String address, long chainId, Instant issuedAt, Instant expiresAt) {

    public static WalletNonceResponse from(WalletChallengeEntity challenge) {
        return new WalletNonceResponse(
                challenge.nonce(),
                challenge.address(),
                challenge.chainId(),
                challenge.issuedAt(),
                challenge.expiresAt());
    }
}
