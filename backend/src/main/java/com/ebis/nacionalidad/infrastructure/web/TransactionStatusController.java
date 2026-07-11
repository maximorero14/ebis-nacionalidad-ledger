package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.TransactionNotFoundException;
import com.ebis.nacionalidad.application.TransactionTrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lets a client re-check a transaction it already knows the hash of, independent of the
 * request that originally submitted it — the only supported way to resolve a
 * {@code PENDING}/{@code TIMEOUT} status (see TransactionTrackingService; M6.4 never
 * resubmits automatically).
 */
@RestController
@Tag(name = "Transactions", description = "Estado de una transaccion ya conocida por hash")
public class TransactionStatusController {

    private final TransactionTrackingService transactionTrackingService;

    public TransactionStatusController(TransactionTrackingService transactionTrackingService) {
        this.transactionTrackingService = transactionTrackingService;
    }

    @GetMapping("/transactions/{transactionHash}")
    @Operation(summary = "Estado actual de una transaccion (PENDING/CONFIRMED/REVERTED/TIMEOUT)")
    public TransactionStatusResponse getStatus(@PathVariable String transactionHash) {
        return TransactionStatusResponse.from(transactionTrackingService.getStatus(transactionHash));
    }

    @ExceptionHandler(TransactionNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(TransactionNotFoundException exception) {
        return new ErrorResponse(exception.getMessage());
    }
}
