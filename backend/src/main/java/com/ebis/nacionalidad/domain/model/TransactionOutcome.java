package com.ebis.nacionalidad.domain.model;

import java.math.BigInteger;

/**
 * Result of submitting a transaction, exposing the real lifecycle state instead of a
 * collapsed success/failure boolean (see {@link TransactionStatus}). {@code caseId} is
 * only populated by {@code createCase} (decoded from the emitted CaseCreated event) once
 * {@code status == CONFIRMED}. {@code errorCode}/{@code errorMessage} are only populated
 * when {@code status == REVERTED} (see CustomErrorDecoder); {@code blockNumber} is only
 * populated once the transaction is actually mined (CONFIRMED or REVERTED, never PENDING
 * or TIMEOUT).
 */
public record TransactionOutcome(
        String transactionHash,
        BigInteger blockNumber,
        TransactionStatus status,
        Long caseId,
        String errorCode,
        String errorMessage) {

    public static TransactionOutcome from(TrackedTransaction tracked) {
        return new TransactionOutcome(
                tracked.transactionHash(),
                tracked.blockNumber(),
                tracked.status(),
                tracked.caseId(),
                tracked.errorCode(),
                tracked.errorMessage());
    }
}
