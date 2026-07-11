package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.domain.model.NetworkStatus;
import java.math.BigInteger;
import java.util.List;

public record NetworkStatusResponse(
        long chainId,
        BigInteger blockNumber,
        BigInteger peerCount,
        List<String> validators,
        BigInteger gasPrice) {

    public static NetworkStatusResponse from(NetworkStatus status) {
        return new NetworkStatusResponse(
                status.chainId(),
                status.blockNumber(),
                status.peerCount(),
                status.validators(),
                status.gasPrice());
    }
}
