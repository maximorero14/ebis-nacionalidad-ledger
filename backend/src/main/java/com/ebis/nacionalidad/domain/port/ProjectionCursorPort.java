package com.ebis.nacionalidad.domain.port;

import java.math.BigInteger;
import java.util.Optional;

/** Persists how far the M6.5 event projection has processed, for idempotent resumption. */
public interface ProjectionCursorPort {

    Optional<BigInteger> getLastProcessedBlock();

    void setLastProcessedBlock(BigInteger blockNumber);

    void reset();
}
