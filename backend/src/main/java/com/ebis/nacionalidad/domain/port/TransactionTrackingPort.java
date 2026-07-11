package com.ebis.nacionalidad.domain.port;

import com.ebis.nacionalidad.domain.model.TrackedTransaction;
import java.util.Optional;

/** Persists the lifecycle of every submitted transaction, keyed by its hash. */
public interface TransactionTrackingPort {

    void save(TrackedTransaction transaction);

    Optional<TrackedTransaction> findByHash(String transactionHash);
}
