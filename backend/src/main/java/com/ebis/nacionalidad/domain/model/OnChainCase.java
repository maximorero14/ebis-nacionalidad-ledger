package com.ebis.nacionalidad.domain.model;

import java.math.BigInteger;

/** Mirrors NationalityCaseRegistry.CaseData, read live from the chain (source of truth). */
public record OnChainCase(
        long caseId,
        String ownerAddress,
        CaseStatus status,
        long reviewRound,
        String documentCommitment,
        boolean feePaid,
        boolean foreignAffairsApproved,
        boolean policeApproved,
        BigInteger credentialTokenId) {}
