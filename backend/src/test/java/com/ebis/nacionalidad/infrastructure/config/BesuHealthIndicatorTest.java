package com.ebis.nacionalidad.infrastructure.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.ebis.nacionalidad.domain.model.NetworkStatus;
import com.ebis.nacionalidad.domain.port.BesuBlockchainClient;
import com.ebis.nacionalidad.infrastructure.blockchain.BlockchainUnavailableException;
import java.math.BigInteger;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.Status;

@ExtendWith(MockitoExtension.class)
class BesuHealthIndicatorTest {

    @Mock private BesuBlockchainClient blockchainClient;

    @Test
    void upWhenBesuIsReachable() {
        when(blockchainClient.readNetworkStatus())
                .thenReturn(
                        new NetworkStatus(
                                20260711L, BigInteger.valueOf(100), BigInteger.valueOf(4), List.of(), BigInteger.ZERO));
        BesuHealthIndicator indicator = new BesuHealthIndicator(blockchainClient);

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsEntry("blockNumber", BigInteger.valueOf(100));
    }

    @Test
    void downWhenBesuIsUnreachable() {
        when(blockchainClient.readNetworkStatus())
                .thenThrow(new BlockchainUnavailableException("connection refused", null));
        BesuHealthIndicator indicator = new BesuHealthIndicator(blockchainClient);

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
    }
}
