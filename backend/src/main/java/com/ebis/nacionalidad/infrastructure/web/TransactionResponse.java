package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import java.math.BigInteger;

public record TransactionResponse(String transactionHash, BigInteger blockNumber, boolean successful) {

    public static TransactionResponse from(TransactionOutcome outcome) {
        return new TransactionResponse(outcome.transactionHash(), outcome.blockNumber(), outcome.successful());
    }
}
