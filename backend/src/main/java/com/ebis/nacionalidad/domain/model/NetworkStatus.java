package com.ebis.nacionalidad.domain.model;

import java.math.BigInteger;
import java.util.List;

/** Snapshot of the Besu network's health as observed from the API. */
public record NetworkStatus(
        long chainId,
        BigInteger blockNumber,
        BigInteger peerCount,
        List<String> validators,
        BigInteger gasPrice) {}
