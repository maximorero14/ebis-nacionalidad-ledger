package com.ebis.nacionalidad.infrastructure.blockchain;

import java.io.IOException;
import java.math.BigInteger;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;

/**
 * Serializes nonce assignment per signing address so two concurrent requests for the
 * same demo actor (e.g. two browser tabs both acting as "policia") never race to read
 * the same {@code eth_getTransactionCount(..., PENDING)} value and collide. The next
 * nonce is cached locally after the first use and incremented monotonically instead of
 * being re-queried from the node on every call; a backend restart clears the cache, which
 * self-heals on the next call since the node's own PENDING count already reflects every
 * previously confirmed transaction.
 */
@Component
@Profile("!test")
public class NonceManager {

    private final Web3j web3j;
    private final Map<String, Object> locksByAddress = new ConcurrentHashMap<>();
    private final Map<String, BigInteger> nextNonceByAddress = new ConcurrentHashMap<>();

    public NonceManager(Web3j web3j) {
        this.web3j = web3j;
    }

    public BigInteger nextNonce(String address) throws IOException {
        Object lock = locksByAddress.computeIfAbsent(address, ignored -> new Object());
        synchronized (lock) {
            BigInteger nonce = nextNonceByAddress.get(address);
            if (nonce == null) {
                nonce =
                        web3j
                                .ethGetTransactionCount(address, DefaultBlockParameterName.PENDING)
                                .send()
                                .getTransactionCount();
            }
            nextNonceByAddress.put(address, nonce.add(BigInteger.ONE));
            return nonce;
        }
    }

    /** Reclaims a nonce that was never actually broadcast (the node rejected the raw tx). */
    public void release(String address, BigInteger nonce) {
        Object lock = locksByAddress.computeIfAbsent(address, ignored -> new Object());
        synchronized (lock) {
            BigInteger expectedNext = nonce.add(BigInteger.ONE);
            if (expectedNext.equals(nextNonceByAddress.get(address))) {
                nextNonceByAddress.put(address, nonce);
            }
        }
    }
}
