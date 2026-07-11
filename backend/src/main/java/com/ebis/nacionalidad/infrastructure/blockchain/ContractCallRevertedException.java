package com.ebis.nacionalidad.infrastructure.blockchain;

public class ContractCallRevertedException extends RuntimeException {

    public ContractCallRevertedException(String message) {
        super(message);
    }
}
