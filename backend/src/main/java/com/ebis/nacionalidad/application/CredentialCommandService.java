package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Hash;

@Service
public class CredentialCommandService {

    private final NationalityLedgerClient ledgerClient;

    public CredentialCommandService(NationalityLedgerClient ledgerClient) {
        this.ledgerClient = ledgerClient;
    }

    public TransactionOutcome revoke(ApplicationRole actor, long credentialId, String reasonCode) {
        if (actor != ApplicationRole.CREDENTIAL_ISSUER) {
            throw new WrongRoleException(ApplicationRole.CREDENTIAL_ISSUER);
        }
        return ledgerClient.revokeCredential(
                actor, credentialId, Hash.sha3(reasonCode.getBytes(StandardCharsets.UTF_8)));
    }
}
