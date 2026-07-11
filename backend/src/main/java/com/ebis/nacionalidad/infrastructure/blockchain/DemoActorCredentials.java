package com.ebis.nacionalidad.infrastructure.blockchain;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.web3j.crypto.Bip32ECKeyPair;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.MnemonicUtils;

/**
 * Derives the backend-custodied signing key for each demo actor from the same public
 * devnet mnemonic used everywhere else in this project (blockchain/besu/README.md,
 * scripts/deploy-contracts.ts). This is the "keystore" M6.2/M6.3 refer to: for this local
 * academic demo it is a deterministic derivation from a published, zero-value mnemonic,
 * not a real secret — a real deployment would replace this adapter with one reading
 * actual keystores mounted outside the image (never committed).
 */
@Component
public class DemoActorCredentials {

    private static final String DEV_MNEMONIC =
            "test test test test test test test test test test test junk";

    private static final Map<ApplicationRole, Integer> DERIVATION_INDEX_BY_ROLE =
            Map.of(
                    ApplicationRole.FOREIGN_AFFAIRS, 2,
                    ApplicationRole.POLICE, 3,
                    ApplicationRole.CREDENTIAL_ISSUER, 4,
                    ApplicationRole.CITIZEN, 5);

    private final Map<ApplicationRole, Credentials> credentialsByRole;

    public DemoActorCredentials() {
        byte[] seed = MnemonicUtils.generateSeed(DEV_MNEMONIC, "");
        Bip32ECKeyPair master = Bip32ECKeyPair.generateKeyPair(seed);
        this.credentialsByRole =
                DERIVATION_INDEX_BY_ROLE.entrySet().stream()
                        .collect(
                                java.util.stream.Collectors.toUnmodifiableMap(
                                        Map.Entry::getKey, entry -> deriveCredentials(master, entry.getValue())));
    }

    private Credentials deriveCredentials(Bip32ECKeyPair master, int addressIndex) {
        int[] path = {
            44 | Bip32ECKeyPair.HARDENED_BIT,
            60 | Bip32ECKeyPair.HARDENED_BIT,
            0 | Bip32ECKeyPair.HARDENED_BIT,
            0,
            addressIndex
        };
        Bip32ECKeyPair derived = Bip32ECKeyPair.deriveKeyPair(master, path);
        return Credentials.create(derived);
    }

    public Credentials forRole(ApplicationRole role) {
        Credentials credentials = credentialsByRole.get(role);
        if (credentials == null) {
            throw new IllegalArgumentException("No signing credentials configured for role " + role);
        }
        return credentials;
    }
}
