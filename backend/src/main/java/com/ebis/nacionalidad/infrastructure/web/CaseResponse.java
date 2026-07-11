package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import java.math.BigInteger;

public record CaseResponse(
        long caseId,
        String ownerAddress,
        CaseStatus status,
        long reviewRound,
        String documentCommitment,
        boolean feePaid,
        boolean foreignAffairsApproved,
        boolean policeApproved,
        BigInteger credentialTokenId) {

    public static CaseResponse from(OnChainCase onChainCase) {
        return new CaseResponse(
                onChainCase.caseId(),
                onChainCase.ownerAddress(),
                onChainCase.status(),
                onChainCase.reviewRound(),
                onChainCase.documentCommitment(),
                onChainCase.feePaid(),
                onChainCase.foreignAffairsApproved(),
                onChainCase.policeApproved(),
                onChainCase.credentialTokenId());
    }
}
