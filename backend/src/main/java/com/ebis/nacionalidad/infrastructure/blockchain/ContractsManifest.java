package com.ebis.nacionalidad.infrastructure.blockchain;

import java.math.BigInteger;

public record ContractsManifest(
        long chainId,
        String tokenAddress,
        String credentialAddress,
        String registryAddress,
        BigInteger registryDeploymentBlock) {}
