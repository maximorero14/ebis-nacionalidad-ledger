package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.AuthenticationService;
import com.ebis.nacionalidad.application.InvalidCredentialsException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Auth", description = "Identidades demo y sesiones de corta duracion")
public class AuthController {

    private final AuthenticationService authenticationService;

    public AuthController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @PostMapping("/auth/login")
    @Operation(summary = "Inicia sesion con una identidad demo y devuelve un JWT de corta duracion")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return LoginResponse.from(authenticationService.login(request.username(), request.password()));
    }

    @GetMapping("/auth/me")
    @Operation(summary = "Identidad, rol y address EVM del usuario autenticado")
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return new MeResponse(
                jwt.getSubject(),
                jwt.getClaimAsString(AuthenticationService.CLAIM_ROLE),
                jwt.getClaimAsString(AuthenticationService.CLAIM_EVM_ADDRESS));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ErrorResponse handleInvalidCredentials(InvalidCredentialsException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    public record MeResponse(String username, String role, String evmAddress) {}
}
