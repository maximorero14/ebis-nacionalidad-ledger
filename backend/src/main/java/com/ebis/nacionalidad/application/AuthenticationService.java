package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.DemoIdentity;
import com.ebis.nacionalidad.domain.port.DemoIdentityPort;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {

    public static final String CLAIM_ROLE = "role";
    public static final String CLAIM_EVM_ADDRESS = "evmAddress";

    private final DemoIdentityPort identityPort;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final Duration tokenTtl;

    public AuthenticationService(
            DemoIdentityPort identityPort,
            PasswordEncoder passwordEncoder,
            JwtEncoder jwtEncoder,
            @Value("${app.security.jwt.ttl-minutes:15}") long tokenTtlMinutes) {
        this.identityPort = identityPort;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.tokenTtl = Duration.ofMinutes(tokenTtlMinutes);
    }

    public AuthenticationResult login(String username, String rawPassword) {
        DemoIdentity identity =
                identityPort.findByUsername(username).orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(rawPassword, identity.passwordHash())) {
            throw new InvalidCredentialsException();
        }

        Instant now = Instant.now();
        Instant expiresAt = now.plus(tokenTtl);
        JwtClaimsSet claims =
                JwtClaimsSet.builder()
                        .issuer("ebis-demo")
                        .issuedAt(now)
                        .expiresAt(expiresAt)
                        .subject(identity.username())
                        .claim(CLAIM_ROLE, identity.role().name())
                        .claim(CLAIM_EVM_ADDRESS, identity.evmAddress())
                        .build();
        String token =
                jwtEncoder
                        .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                        .getTokenValue();

        return new AuthenticationResult(token, expiresAt, identity.role(), identity.evmAddress());
    }
}
