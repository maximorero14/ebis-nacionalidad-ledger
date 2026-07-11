package com.ebis.nacionalidad.infrastructure.blockchain;

public record ContractsManifest(
        long chainId, String tokenAddress, String credentialAddress, String registryAddress) {}
