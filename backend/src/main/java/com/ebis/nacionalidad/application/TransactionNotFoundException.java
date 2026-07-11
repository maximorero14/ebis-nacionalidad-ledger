package com.ebis.nacionalidad.application;

public class TransactionNotFoundException extends RuntimeException {

    public TransactionNotFoundException(String transactionHash) {
        super("Transaction " + transactionHash + " not found");
    }
}
