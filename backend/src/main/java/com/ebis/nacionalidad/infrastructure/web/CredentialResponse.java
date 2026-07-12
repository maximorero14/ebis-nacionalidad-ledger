package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.domain.model.CredentialView;

public record CredentialResponse(
        long tokenId,
        long caseId,
        String holderAddress,
        String status,
        long issuedAtEpochSeconds,
        long expiresAtEpochSeconds,
        long dataVersion,
        int schemaVersion,
        String dataCommitment,
        boolean revoked,
        String revocationReasonCode,
        String tokenUri) {

    public static CredentialResponse from(CredentialView view) {
        return new CredentialResponse(
                view.tokenId(),
                view.caseId(),
                view.holderAddress(),
                view.status(),
                view.issuedAtEpochSeconds(),
                view.expiresAtEpochSeconds(),
                view.dataVersion(),
                view.schemaVersion(),
                view.dataCommitment(),
                view.revoked(),
                view.revocationReasonCode(),
                view.tokenUri());
    }
}
