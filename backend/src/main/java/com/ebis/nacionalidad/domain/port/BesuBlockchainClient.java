package com.ebis.nacionalidad.domain.port;

import com.ebis.nacionalidad.domain.model.NetworkStatus;

/**
 * Outbound port isolating the rest of the application from web3j and JSON-RPC details.
 * The only adapter allowed to import web3j types is the one implementing this interface.
 */
public interface BesuBlockchainClient {

    NetworkStatus readNetworkStatus();
}
