package com.ebis.nacionalidad.infrastructure.security;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.DemoIdentity;
import com.ebis.nacionalidad.domain.port.DemoIdentityPort;
import java.util.Map;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Fixed demo accounts for the four actors already used for the on-chain roles since M5
 * (blockchain/besu/README.md documents the same EVM addresses). Passwords are demo-only,
 * intentionally visible here (not a real user store) so anyone reading the code can log
 * in locally; never model production credentials this way.
 */
@Component
public class DemoIdentityInMemoryAdapter implements DemoIdentityPort {

    private final Map<String, DemoIdentity> identitiesByUsername;

    public DemoIdentityInMemoryAdapter(PasswordEncoder passwordEncoder) {
        this.identitiesByUsername =
                Map.of(
                        "citizen1",
                        new DemoIdentity(
                                "citizen1",
                                passwordEncoder.encode("citizen-demo-pass"),
                                ApplicationRole.CITIZEN,
                                "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"),
                        "extranjeria",
                        new DemoIdentity(
                                "extranjeria",
                                passwordEncoder.encode("foreign-affairs-demo-pass"),
                                ApplicationRole.FOREIGN_AFFAIRS,
                                "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"),
                        "policia",
                        new DemoIdentity(
                                "policia",
                                passwordEncoder.encode("police-demo-pass"),
                                ApplicationRole.POLICE,
                                "0x90F79bf6EB2c4f870365E785982E1f101E93b906"),
                        "emisor",
                        new DemoIdentity(
                                "emisor",
                                passwordEncoder.encode("issuer-demo-pass"),
                                ApplicationRole.CREDENTIAL_ISSUER,
                                "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"));
    }

    @Override
    public Optional<DemoIdentity> findByUsername(String username) {
        return Optional.ofNullable(identitiesByUsername.get(username));
    }
}
