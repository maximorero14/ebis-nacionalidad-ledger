package com.ebis.nacionalidad.domain.model;

import java.math.BigInteger;

/**
 * Result of a mined transaction. {@code caseId} is only populated by {@code createCase}
 * (decoded from the emitted CaseCreated event); every other call leaves it null. M6.4
 * will wrap this with an async PENDING/CONFIRMED/REVERTED lifecycle; for now every call
 * in M6.3 waits synchronously for the receipt.
 */
public record TransactionOutcome(
        String transactionHash, BigInteger blockNumber, boolean successful, Long caseId) {

    public TransactionOutcome(String transactionHash, BigInteger blockNumber, boolean successful) {
        this(transactionHash, blockNumber, successful, null);
    }
}
