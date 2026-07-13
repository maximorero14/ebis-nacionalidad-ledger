package com.ebis.nacionalidad.domain.model;

public record CaseCreationEligibility(boolean canCreate, long activeCaseId, long approvedCaseId) {

    public static CaseCreationEligibility of(long activeCaseId, long approvedCaseId) {
        return new CaseCreationEligibility(activeCaseId == 0 && approvedCaseId == 0, activeCaseId, approvedCaseId);
    }
}
