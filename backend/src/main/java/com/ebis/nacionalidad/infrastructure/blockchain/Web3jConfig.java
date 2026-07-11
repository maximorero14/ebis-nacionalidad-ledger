package com.ebis.nacionalidad.infrastructure.blockchain;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.Web3jService;
import org.web3j.protocol.http.HttpService;

/**
 * Single shared web3j client so every blockchain adapter talks to the same connection.
 * Building this client never itself connects (web3j is lazy), so it is safe to create in
 * the test profile even without a live Besu network — only actually calling it would fail.
 */
@Configuration
public class Web3jConfig {

    @Bean
    public Web3jService web3jService(@Value("${besu.rpc-url}") String rpcUrl) {
        return new HttpService(rpcUrl);
    }

    @Bean
    public Web3j web3j(Web3jService web3jService) {
        return Web3j.build(web3jService);
    }
}
