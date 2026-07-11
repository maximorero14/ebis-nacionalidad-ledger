package com.ebis.nacionalidad.domain.model;

import java.math.BigInteger;
import java.util.Map;

/**
 * A single on-chain event for a case's timeline, read live from the chain via eth_getLogs.
 * M6.5 will persist and reprocess these into a queryable projection; this is a direct,
 * real-time read that does not require that pipeline to exist yet.
 */
public record CaseEvent(
        String eventName, BigInteger blockNumber, String transactionHash, Map<String, String> data) {}
