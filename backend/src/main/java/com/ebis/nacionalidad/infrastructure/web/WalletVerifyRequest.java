package com.ebis.nacionalidad.infrastructure.web;

import jakarta.validation.constraints.NotBlank;

public record WalletVerifyRequest(@NotBlank String message, @NotBlank String signature) {}
