package com.ebis.nacionalidad.infrastructure.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record WalletNonceRequest(@NotBlank String address, @Positive long chainId) {}
