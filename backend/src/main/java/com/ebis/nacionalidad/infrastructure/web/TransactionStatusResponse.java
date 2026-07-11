package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.domain.model.TrackedTransaction;
import com.ebis.nacionalidad.domain.model.TransactionStatus;
import java.math.BigInteger;
import java.time.Instant;

public record TransactionStatusResponse(
        String transactionHash,
        TransactionStatus status,
        Long caseId,
        BigInteger blockNumber,
        String errorCode,
        String errorMessage,
        Instant submittedAt,
        Instant updatedAt) {

    public static TransactionStatusResponse from(TrackedTransaction tracked) {
        return new TransactionStatusResponse(
                tracked.transactionHash(),
                tracked.status(),
                tracked.caseId(),
                tracked.blockNumber(),
                tracked.errorCode(),
                tracked.errorMessage(),
                tracked.submittedAt(),
                tracked.updatedAt());
    }
}
