package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import java.math.BigInteger;

public record CreateCaseResponse(
        long caseId, String transactionHash, BigInteger blockNumber, boolean successful) {

    public static CreateCaseResponse from(TransactionOutcome outcome) {
        return new CreateCaseResponse(
                outcome.caseId(), outcome.transactionHash(), outcome.blockNumber(), outcome.successful());
    }
}
