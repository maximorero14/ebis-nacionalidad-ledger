package com.ebis.nacionalidad.application;

public class InvalidWalletSignatureException extends RuntimeException {

    public InvalidWalletSignatureException(String message) {
        super(message);
    }
}
