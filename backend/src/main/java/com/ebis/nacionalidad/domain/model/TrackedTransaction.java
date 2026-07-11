package com.ebis.nacionalidad.domain.model;

import java.math.BigInteger;
import java.time.Instant;

/**
 * Persisted lifecycle record for one submitted transaction, keyed by {@code transactionHash}.
 * {@code caseId} is only ever populated for {@code createCase} (decoded from the emitted
 * CaseCreated event); {@code errorCode}/{@code errorMessage} are only populated when
 * {@code status == REVERTED} (see CustomErrorDecoder).
 */
public record TrackedTransaction(
        String transactionHash,
        TransactionStatus status,
        Long caseId,
        BigInteger blockNumber,
        String errorCode,
        String errorMessage,
        Instant submittedAt,
        Instant updatedAt) {

    public static TrackedTransaction pending(String transactionHash, Instant now) {
        return new TrackedTransaction(transactionHash, TransactionStatus.PENDING, null, null, null, null, now, now);
    }

    public TrackedTransaction confirmed(BigInteger blockNumber, Long caseId, Instant now) {
        return new TrackedTransaction(
                transactionHash, TransactionStatus.CONFIRMED, caseId, blockNumber, null, null, submittedAt, now);
    }

    public TrackedTransaction reverted(BigInteger blockNumber, String errorCode, String errorMessage, Instant now) {
        return new TrackedTransaction(
                transactionHash,
                TransactionStatus.REVERTED,
                null,
                blockNumber,
                errorCode,
                errorMessage,
                submittedAt,
                now);
    }

    public TrackedTransaction timedOut(Instant now) {
        return new TrackedTransaction(
                transactionHash, TransactionStatus.TIMEOUT, null, null, null, null, submittedAt, now);
    }
}
