package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.TrackedTransaction;
import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import com.ebis.nacionalidad.domain.model.TransactionStatus;
import com.ebis.nacionalidad.domain.port.IdempotencyPort;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import com.ebis.nacionalidad.domain.port.TransactionTrackingPort;
import java.time.Instant;
import java.util.Optional;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;

/**
 * Owns the two cross-cutting concerns M6.4 adds on top of every write in
 * {@link NationalityLedgerClient}: idempotent replay of a client-supplied key, and
 * on-demand reconciliation of a transaction left {@code PENDING}/{@code TIMEOUT} by the
 * request that originally submitted it (never by blindly resubmitting).
 */
@Service
public class TransactionTrackingService {

    private final NationalityLedgerClient ledgerClient;
    private final TransactionTrackingPort trackingPort;
    private final IdempotencyPort idempotencyPort;

    public TransactionTrackingService(
            NationalityLedgerClient ledgerClient,
            TransactionTrackingPort trackingPort,
            IdempotencyPort idempotencyPort) {
        this.ledgerClient = ledgerClient;
        this.trackingPort = trackingPort;
        this.idempotencyPort = idempotencyPort;
    }

    /**
     * The outcome a previous call already recorded for {@code idempotencyKey}, if any.
     * {@code idempotencyKey} may be {@code null} (no idempotency requested), in which case
     * this always returns empty.
     */
    public Optional<TransactionOutcome> findExisting(String idempotencyKey) {
        if (idempotencyKey == null) {
            return Optional.empty();
        }
        return idempotencyPort
                .findTransactionHash(idempotencyKey)
                .map(
                        hash ->
                                trackingPort
                                        .findByHash(hash)
                                        .orElseThrow(
                                                () ->
                                                        new IllegalStateException(
                                                                "Idempotency key "
                                                                        + idempotencyKey
                                                                        + " points to an untracked transaction "
                                                                        + hash)))
                .map(TransactionOutcome::from);
    }

    /** Remembers {@code outcome} under {@code idempotencyKey}; a no-op if the key is {@code null}. */
    public void record(String idempotencyKey, TransactionOutcome outcome) {
        if (idempotencyKey != null) {
            idempotencyPort.save(idempotencyKey, outcome.transactionHash());
        }
    }

    /**
     * Runs {@code action} unless {@code idempotencyKey} already produced a transaction
     * previously — in that case the original outcome is returned and {@code action} never
     * runs, so a client retry never resubmits.
     */
    public TransactionOutcome runIdempotent(String idempotencyKey, Supplier<TransactionOutcome> action) {
        Optional<TransactionOutcome> existing = findExisting(idempotencyKey);
        if (existing.isPresent()) {
            return existing.get();
        }
        TransactionOutcome outcome = action.get();
        record(idempotencyKey, outcome);
        return outcome;
    }

    /**
     * Current status of a known transaction. Terminal states ({@code CONFIRMED}/
     * {@code REVERTED}) are returned as persisted. A {@code PENDING} or {@code TIMEOUT}
     * record is re-checked against the chain once; if still not mined, it is returned
     * unchanged — this is the only "retry" M6.4 performs, and it is a read, never a
     * resubmission.
     */
    public TrackedTransaction getStatus(String transactionHash) {
        TrackedTransaction tracked =
                trackingPort
                        .findByHash(transactionHash)
                        .orElseThrow(() -> new TransactionNotFoundException(transactionHash));
        if (tracked.status() == TransactionStatus.CONFIRMED || tracked.status() == TransactionStatus.REVERTED) {
            return tracked;
        }

        Optional<TransactionOutcome> reconciled = ledgerClient.checkReceipt(transactionHash);
        if (reconciled.isEmpty()) {
            return tracked;
        }

        TransactionOutcome outcome = reconciled.get();
        TrackedTransaction updated =
                outcome.status() == TransactionStatus.REVERTED
                        ? tracked.reverted(
                                outcome.blockNumber(), outcome.errorCode(), outcome.errorMessage(), Instant.now())
                        : tracked.confirmed(outcome.blockNumber(), outcome.caseId(), Instant.now());
        trackingPort.save(updated);
        return updated;
    }
}
