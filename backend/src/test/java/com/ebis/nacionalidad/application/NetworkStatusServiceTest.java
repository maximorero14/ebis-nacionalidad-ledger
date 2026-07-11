package com.ebis.nacionalidad.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.ebis.nacionalidad.domain.model.NetworkStatus;
import com.ebis.nacionalidad.domain.port.BesuBlockchainClient;
import java.math.BigInteger;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NetworkStatusServiceTest {

    @Mock private BesuBlockchainClient blockchainClient;

    @Test
    void delegatesToTheBlockchainPortWithoutTouchingWeb3jDirectly() {
        NetworkStatus expected =
                new NetworkStatus(
                        20260711L,
                        BigInteger.valueOf(42),
                        BigInteger.valueOf(4),
                        List.of("0xabc", "0xdef"),
                        BigInteger.ZERO);
        when(blockchainClient.readNetworkStatus()).thenReturn(expected);

        NetworkStatusService service = new NetworkStatusService(blockchainClient);

        assertThat(service.currentStatus()).isEqualTo(expected);
    }
}
