package com.ebis.nacionalidad.domain.port;

import java.util.Optional;

/**
 * Maps a client-supplied idempotency key to the transaction hash it originally produced,
 * so a retried request for the same key never resubmits — it looks up the original
 * result instead (see {@link TransactionTrackingPort}).
 */
public interface IdempotencyPort {

    Optional<String> findTransactionHash(String idempotencyKey);

    void save(String idempotencyKey, String transactionHash);
}
