package com.ebis.nacionalidad.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.DemoIdentity;
import com.ebis.nacionalidad.domain.port.DemoIdentityPort;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock private DemoIdentityPort identityPort;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtEncoder jwtEncoder;

    private final DemoIdentity identity =
            new DemoIdentity("citizen1", "hashed", ApplicationRole.CITIZEN, "0xabc");

    @Test
    void issuesATokenForValidCredentials() {
        when(identityPort.findByUsername("citizen1")).thenReturn(Optional.of(identity));
        when(passwordEncoder.matches("secret", "hashed")).thenReturn(true);
        Jwt fakeJwt =
                Jwt.withTokenValue("fake-token")
                        .header("alg", "HS256")
                        .claim("sub", "citizen1")
                        .build();
        when(jwtEncoder.encode(org.mockito.ArgumentMatchers.any())).thenReturn(fakeJwt);

        AuthenticationService service = new AuthenticationService(identityPort, passwordEncoder, jwtEncoder, 15);
        AuthenticationResult result = service.login("citizen1", "secret");

        assertThat(result.token()).isEqualTo("fake-token");
        assertThat(result.role()).isEqualTo(ApplicationRole.CITIZEN);
        assertThat(result.evmAddress()).isEqualTo("0xabc");
        assertThat(result.expiresAt()).isAfter(Instant.now());
    }

    @Test
    void rejectsAnUnknownUsername() {
        when(identityPort.findByUsername("ghost")).thenReturn(Optional.empty());

        AuthenticationService service = new AuthenticationService(identityPort, passwordEncoder, jwtEncoder, 15);

        assertThatThrownBy(() -> service.login("ghost", "whatever"))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void rejectsAWrongPassword() {
        when(identityPort.findByUsername("citizen1")).thenReturn(Optional.of(identity));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        AuthenticationService service = new AuthenticationService(identityPort, passwordEncoder, jwtEncoder, 15);

        assertThatThrownBy(() -> service.login("citizen1", "wrong"))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
