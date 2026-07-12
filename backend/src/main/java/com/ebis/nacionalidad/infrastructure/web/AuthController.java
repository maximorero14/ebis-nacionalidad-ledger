package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.InvalidWalletSignatureException;
import com.ebis.nacionalidad.application.OnChainAuthorizationService;
import com.ebis.nacionalidad.application.WalletAuthenticationService;
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
@Tag(name = "Auth", description = "Sesion SIWE vinculada a la wallet")
public class AuthController {

    private final WalletAuthenticationService authenticationService;
    private final OnChainAuthorizationService authorizationService;

    public AuthController(
            WalletAuthenticationService authenticationService, OnChainAuthorizationService authorizationService) {
        this.authenticationService = authenticationService;
        this.authorizationService = authorizationService;
    }

    @PostMapping("/auth/nonce")
    @Operation(summary = "Genera un nonce SIWE de un solo uso para la wallet")
    public WalletNonceResponse nonce(@Valid @RequestBody WalletNonceRequest request) {
        return WalletNonceResponse.from(authenticationService.createChallenge(request.address(), request.chainId()));
    }

    @PostMapping("/auth/verify")
    @Operation(summary = "Verifica el mensaje SIWE firmado y devuelve un JWT corto")
    public WalletLoginResponse verify(@Valid @RequestBody WalletVerifyRequest request) {
        return WalletLoginResponse.from(authenticationService.verify(request.message(), request.signature()));
    }

    @GetMapping("/auth/me")
    @Operation(summary = "Address autenticada y capacidades on-chain actuales")
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        AuthenticatedWallet wallet = AuthenticatedWallet.from(jwt);
        return new MeResponse(
                wallet.address(), wallet.chainId(), authorizationService.capabilitiesFor(wallet.address()));
    }

    @ExceptionHandler(InvalidWalletSignatureException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ErrorResponse handleInvalidWalletSignature(InvalidWalletSignatureException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    public record MeResponse(String address, long chainId, com.ebis.nacionalidad.domain.model.WalletCapabilities capabilities) {}
}
