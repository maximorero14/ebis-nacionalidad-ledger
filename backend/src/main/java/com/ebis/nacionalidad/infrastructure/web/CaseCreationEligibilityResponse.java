package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.domain.model.CaseCreationEligibility;

public record CaseCreationEligibilityResponse(boolean canCreate, long activeCaseId, long approvedCaseId) {

    public static CaseCreationEligibilityResponse from(CaseCreationEligibility eligibility) {
        return new CaseCreationEligibilityResponse(
                eligibility.canCreate(), eligibility.activeCaseId(), eligibility.approvedCaseId());
    }
}
