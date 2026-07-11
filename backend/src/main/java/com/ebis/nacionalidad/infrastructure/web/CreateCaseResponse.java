package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import com.ebis.nacionalidad.domain.model.TransactionStatus;
import java.math.BigInteger;

/** {@code caseId} is only non-null once {@code status == CONFIRMED} (decoded from the CaseCreated event). */
public record CreateCaseResponse(
        Long caseId,
        String transactionHash,
        BigInteger blockNumber,
        TransactionStatus status,
        String errorCode,
        String errorMessage) {

    public static CreateCaseResponse from(TransactionOutcome outcome) {
        return new CreateCaseResponse(
                outcome.caseId(),
                outcome.transactionHash(),
                outcome.blockNumber(),
                outcome.status(),
                outcome.errorCode(),
                outcome.errorMessage());
    }
}
