package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.domain.model.CaseProjection;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import java.time.Instant;

public record CaseResponse(
        long caseId, String ownerAddress, CaseStatus status, long reviewRound, Instant updatedAt) {

    public static CaseResponse from(CaseProjection projection) {
        return new CaseResponse(
                projection.caseId(),
                projection.ownerAddress(),
                projection.status(),
                projection.reviewRound(),
                projection.updatedAt());
    }
}
