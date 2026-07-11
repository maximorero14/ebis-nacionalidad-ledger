package com.ebis.nacionalidad.application;

public class CaseAccessDeniedException extends RuntimeException {

    public CaseAccessDeniedException(long caseId) {
        super("Not authorized to view case " + caseId);
    }
}
