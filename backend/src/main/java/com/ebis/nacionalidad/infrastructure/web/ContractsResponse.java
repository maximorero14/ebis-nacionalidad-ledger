package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.infrastructure.blockchain.ContractsManifest;
import java.math.BigInteger;

public record ContractsResponse(
        long chainId,
        String tokenAddress,
        String credentialAddress,
        String registryAddress,
        BigInteger registryDeploymentBlock) {

    public static ContractsResponse from(ContractsManifest manifest) {
        return new ContractsResponse(
                manifest.chainId(),
                manifest.tokenAddress(),
                manifest.credentialAddress(),
                manifest.registryAddress(),
                manifest.registryDeploymentBlock());
    }
}
