package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.NetworkStatus;
import com.ebis.nacionalidad.domain.port.BesuBlockchainClient;
import org.springframework.stereotype.Service;

@Service
public class NetworkStatusService {

    private final BesuBlockchainClient blockchainClient;

    public NetworkStatusService(BesuBlockchainClient blockchainClient) {
        this.blockchainClient = blockchainClient;
    }

    public NetworkStatus currentStatus() {
        return blockchainClient.readNetworkStatus();
    }
}
