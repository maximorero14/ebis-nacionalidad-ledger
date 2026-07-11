package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.CaseEventProjectionService.Divergence;
import com.ebis.nacionalidad.domain.model.CaseStatus;

public record DivergenceResponse(long caseId, CaseStatus projectedStatus, CaseStatus onChainStatus) {

    public static DivergenceResponse from(Divergence divergence) {
        return new DivergenceResponse(divergence.caseId(), divergence.projectedStatus(), divergence.onChainStatus());
    }
}
