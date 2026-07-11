package com.ebis.nacionalidad.infrastructure.blockchain;

public class BlockchainUnavailableException extends RuntimeException {

    public BlockchainUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
