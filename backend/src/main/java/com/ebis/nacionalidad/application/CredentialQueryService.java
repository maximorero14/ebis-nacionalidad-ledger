package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.CredentialView;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import org.springframework.stereotype.Service;

/**
 * Reads are intentionally public (no JWT required, see SecurityConfig): this mirrors the
 * "auditor/verificador" actor from docs/plan/PLAN_EJECUCION_TFM.md, who must be able to
 * check a credential's validity from just its id/QR without any account. No PII is ever
 * exposed by these reads.
 */
@Service
public class CredentialQueryService {

    private final NationalityLedgerClient ledgerClient;

    public CredentialQueryService(NationalityLedgerClient ledgerClient) {
        this.ledgerClient = ledgerClient;
    }

    public CredentialView getCredential(long credentialId) {
        return ledgerClient
                .readCredential(credentialId)
                .orElseThrow(() -> new CaseNotFoundException(credentialId));
    }

    public boolean isValid(long credentialId) {
        return ledgerClient.isCredentialValid(credentialId);
    }
}
