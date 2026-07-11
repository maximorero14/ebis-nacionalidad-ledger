package com.ebis.nacionalidad.infrastructure.config;

import com.ebis.nacionalidad.domain.model.NetworkStatus;
import com.ebis.nacionalidad.domain.port.BesuBlockchainClient;
import com.ebis.nacionalidad.infrastructure.blockchain.BlockchainUnavailableException;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Reports {@code /actuator/health} as DOWN when Besu itself is unreachable, instead of
 * only ever reflecting the backend's own process/JVM state. Reuses the same
 * {@link BesuBlockchainClient#readNetworkStatus()} call {@code GET /network/status}
 * already exercises (M6.1); no separate RPC call is introduced.
 */
@Component("besu")
public class BesuHealthIndicator implements HealthIndicator {

    private final BesuBlockchainClient blockchainClient;

    public BesuHealthIndicator(BesuBlockchainClient blockchainClient) {
        this.blockchainClient = blockchainClient;
    }

    @Override
    public Health health() {
        try {
            NetworkStatus status = blockchainClient.readNetworkStatus();
            return Health.up()
                    .withDetail("blockNumber", status.blockNumber())
                    .withDetail("peerCount", status.peerCount())
                    .build();
        } catch (BlockchainUnavailableException e) {
            return Health.down(e).build();
        }
    }
}
