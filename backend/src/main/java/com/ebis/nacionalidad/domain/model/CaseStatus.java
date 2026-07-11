package com.ebis.nacionalidad.domain.model;

/** Mirrors {@code NationalityCaseRegistry.CaseStatus} in contracts/NationalityCaseRegistry.sol. */
public enum CaseStatus {
    NONE,
    CREATED,
    DOCUMENTS_SUBMITTED,
    FEE_PAID,
    IN_REVIEW,
    REMEDIATION_REQUIRED,
    APPROVED,
    REJECTED
}
