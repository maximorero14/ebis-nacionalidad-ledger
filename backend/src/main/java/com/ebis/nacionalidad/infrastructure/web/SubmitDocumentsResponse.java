package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.CaseCommandService.SubmitDocumentsResult;
import java.math.BigInteger;

public record SubmitDocumentsResponse(
        String transactionHash, BigInteger blockNumber, boolean successful, String salt) {

    public static SubmitDocumentsResponse from(SubmitDocumentsResult result) {
        return new SubmitDocumentsResponse(
                result.outcome().transactionHash(),
                result.outcome().blockNumber(),
                result.outcome().successful(),
                result.saltHex());
    }
}
