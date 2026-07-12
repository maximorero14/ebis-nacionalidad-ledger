package com.ebis.nacionalidad.domain.model;

public enum OnChainRole {
    REGISTRY_ADMIN(Contract.REGISTRY, "DEFAULT_ADMIN_ROLE"),
    TOKEN_ADMIN(Contract.TOKEN, "DEFAULT_ADMIN_ROLE"),
    CREDENTIAL_ADMIN(Contract.CREDENTIAL, "DEFAULT_ADMIN_ROLE"),
    FOREIGN_AFFAIRS(Contract.REGISTRY, "FOREIGN_AFFAIRS_ROLE"),
    POLICE(Contract.REGISTRY, "POLICE_ROLE"),
    REGISTRY_CREDENTIAL_ISSUER(Contract.REGISTRY, "CREDENTIAL_ISSUER_ROLE"),
    CREDENTIAL_REVOKER(Contract.CREDENTIAL, "REVOKER_ROLE"),
    TOKEN_MINTER(Contract.TOKEN, "MINTER_ROLE"),
    TOKEN_FAUCET(Contract.TOKEN, "FAUCET_ROLE"),
    TOKEN_FEE_COLLECTOR(Contract.TOKEN, "FEE_COLLECTOR_ROLE");

    private final Contract contract;
    private final String roleFunction;

    OnChainRole(Contract contract, String roleFunction) {
        this.contract = contract;
        this.roleFunction = roleFunction;
    }

    public Contract contract() {
        return contract;
    }

    public String roleFunction() {
        return roleFunction;
    }

    public enum Contract {
        REGISTRY,
        CREDENTIAL,
        TOKEN
    }
}
