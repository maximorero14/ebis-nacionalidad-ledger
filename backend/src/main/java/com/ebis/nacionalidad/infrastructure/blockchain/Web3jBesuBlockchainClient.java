package com.ebis.nacionalidad.infrastructure.blockchain;

import com.ebis.nacionalidad.domain.model.NetworkStatus;
import com.ebis.nacionalidad.domain.port.BesuBlockchainClient;
import java.io.IOException;
import java.math.BigInteger;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.Web3jService;
import org.web3j.protocol.core.Request;
import org.web3j.protocol.core.Response;
import org.web3j.protocol.http.HttpService;

/**
 * Only class in the application allowed to import web3j types (domain.port.BesuBlockchainClient
 * is the seam every other layer depends on instead).
 */
@Component
public class Web3jBesuBlockchainClient implements BesuBlockchainClient {

    private final Web3j web3j;
    private final Web3jService web3jService;

    public Web3jBesuBlockchainClient(@Value("${besu.rpc-url}") String rpcUrl) {
        this.web3jService = new HttpService(rpcUrl);
        this.web3j = Web3j.build(web3jService);
    }

    @Override
    public NetworkStatus readNetworkStatus() {
        try {
            long chainId = web3j.ethChainId().send().getChainId().longValue();
            BigInteger blockNumber = web3j.ethBlockNumber().send().getBlockNumber();
            BigInteger peerCount = web3j.netPeerCount().send().getQuantity();
            BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice();
            List<String> validators = qbftValidators();
            return new NetworkStatus(chainId, blockNumber, peerCount, validators, gasPrice);
        } catch (IOException e) {
            throw new BlockchainUnavailableException("Unable to read Besu network status", e);
        }
    }

    // web3j-core has no built-in method for this Besu-specific QBFT RPC namespace.
    private List<String> qbftValidators() throws IOException {
        return new Request<>(
                        "qbft_getValidatorsByBlockNumber",
                        List.of("latest"),
                        web3jService,
                        QbftValidatorsResponse.class)
                .send()
                .getResult();
    }

    static class QbftValidatorsResponse extends Response<List<String>> {}
}
