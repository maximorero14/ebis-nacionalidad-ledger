package com.ebis.nacionalidad.domain.model;

/** Mirrors NationalityCredential.CredentialData plus its public tokenURI. No PII, ever. */
public record CredentialView(
        long tokenId,
        long caseId,
        String holderAddress,
        boolean revoked,
        String revocationReasonCode,
        String tokenUri) {}
