package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import com.ebis.nacionalidad.domain.model.TransactionStatus;
import java.math.BigInteger;

public record TransactionResponse(
        String transactionHash,
        BigInteger blockNumber,
        TransactionStatus status,
        String errorCode,
        String errorMessage) {

    public static TransactionResponse from(TransactionOutcome outcome) {
        return new TransactionResponse(
                outcome.transactionHash(),
                outcome.blockNumber(),
                outcome.status(),
                outcome.errorCode(),
                outcome.errorMessage());
    }
}
