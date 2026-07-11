package com.ebis.nacionalidad.infrastructure.blockchain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigInteger;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;

class NonceManagerTest {

    @Test
    void firstCallQueriesTheNodeAndSubsequentCallsIncrementLocally() throws Exception {
        Web3j web3j = mock(Web3j.class, RETURNS_DEEP_STUBS);
        when(web3j.ethGetTransactionCount("0xactor", DefaultBlockParameterName.PENDING).send().getTransactionCount())
                .thenReturn(BigInteger.valueOf(5));
        NonceManager nonceManager = new NonceManager(web3j);

        BigInteger first = nonceManager.nextNonce("0xactor");
        BigInteger second = nonceManager.nextNonce("0xactor");
        BigInteger third = nonceManager.nextNonce("0xactor");

        assertThat(List.of(first, second, third))
                .containsExactly(BigInteger.valueOf(5), BigInteger.valueOf(6), BigInteger.valueOf(7));
    }

    @Test
    void concurrentCallsForTheSameAddressNeverCollide() throws Exception {
        Web3j web3j = mock(Web3j.class, RETURNS_DEEP_STUBS);
        when(web3j.ethGetTransactionCount("0xactor", DefaultBlockParameterName.PENDING).send().getTransactionCount())
                .thenReturn(BigInteger.ZERO);
        NonceManager nonceManager = new NonceManager(web3j);

        int concurrentRequests = 50;
        ExecutorService executor = Executors.newFixedThreadPool(10);
        CountDownLatch ready = new CountDownLatch(concurrentRequests);
        CountDownLatch start = new CountDownLatch(1);

        List<Future<BigInteger>> futures =
                IntStream.range(0, concurrentRequests)
                        .mapToObj(
                                i ->
                                        executor.submit(
                                                () -> {
                                                    ready.countDown();
                                                    start.await();
                                                    return nonceManager.nextNonce("0xactor");
                                                }))
                        .collect(Collectors.toList());
        ready.await(5, TimeUnit.SECONDS);
        start.countDown();

        Set<BigInteger> nonces =
                futures.stream()
                        .map(
                                future -> {
                                    try {
                                        return future.get();
                                    } catch (Exception e) {
                                        throw new RuntimeException(e);
                                    }
                                })
                        .collect(Collectors.toSet());
        executor.shutdown();

        assertThat(nonces).hasSize(concurrentRequests);
    }
}
