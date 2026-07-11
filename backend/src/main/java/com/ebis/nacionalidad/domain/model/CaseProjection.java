package com.ebis.nacionalidad.domain.model;

import java.time.Instant;

/** Read-model reconstructed from on-chain events; the chain remains the source of truth. */
public record CaseProjection(
        long caseId,
        String ownerAddress,
        CaseStatus status,
        long reviewRound,
        Instant updatedAt) {}
