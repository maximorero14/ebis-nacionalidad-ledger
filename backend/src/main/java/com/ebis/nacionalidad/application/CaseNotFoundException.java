package com.ebis.nacionalidad.application;

public class CaseNotFoundException extends RuntimeException {

    public CaseNotFoundException(long caseId) {
        super("Case " + caseId + " not found");
    }
}
