package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.CaseCommandService.SubmitDocumentsResult;
import com.ebis.nacionalidad.domain.model.TransactionStatus;
import java.math.BigInteger;

/** {@code salt} is {@code null} on an idempotent replay — see {@link SubmitDocumentsResult}. */
public record SubmitDocumentsResponse(
        String transactionHash,
        BigInteger blockNumber,
        TransactionStatus status,
        String errorCode,
        String errorMessage,
        String salt) {

    public static SubmitDocumentsResponse from(SubmitDocumentsResult result) {
        return new SubmitDocumentsResponse(
                result.outcome().transactionHash(),
                result.outcome().blockNumber(),
                result.outcome().status(),
                result.outcome().errorCode(),
                result.outcome().errorMessage(),
                result.saltHex());
    }
}
