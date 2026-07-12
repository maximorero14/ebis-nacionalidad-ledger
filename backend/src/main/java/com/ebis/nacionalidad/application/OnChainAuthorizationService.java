package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.OnChainRole;
import com.ebis.nacionalidad.domain.model.WalletCapabilities;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import org.springframework.stereotype.Service;

@Service
public class OnChainAuthorizationService {

    private final NationalityLedgerClient ledgerClient;

    public OnChainAuthorizationService(NationalityLedgerClient ledgerClient) {
        this.ledgerClient = ledgerClient;
    }

    public WalletCapabilities capabilitiesFor(String address) {
        return new WalletCapabilities(
                has(OnChainRole.REGISTRY_ADMIN, address),
                has(OnChainRole.TOKEN_ADMIN, address),
                has(OnChainRole.CREDENTIAL_ADMIN, address),
                has(OnChainRole.FOREIGN_AFFAIRS, address),
                has(OnChainRole.POLICE, address),
                has(OnChainRole.REGISTRY_CREDENTIAL_ISSUER, address),
                has(OnChainRole.CREDENTIAL_REVOKER, address),
                has(OnChainRole.TOKEN_ADMIN, address),
                has(OnChainRole.TOKEN_FAUCET, address),
                has(OnChainRole.TOKEN_FEE_COLLECTOR, address));
    }

    public boolean has(OnChainRole role, String address) {
        return ledgerClient.hasRole(role, address);
    }
}
