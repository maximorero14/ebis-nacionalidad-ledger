package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.domain.model.CredentialView;

public record CredentialResponse(
        long tokenId,
        long caseId,
        String holderAddress,
        boolean revoked,
        String revocationReasonCode,
        String tokenUri) {

    public static CredentialResponse from(CredentialView view) {
        return new CredentialResponse(
                view.tokenId(),
                view.caseId(),
                view.holderAddress(),
                view.revoked(),
                view.revocationReasonCode(),
                view.tokenUri());
    }
}
