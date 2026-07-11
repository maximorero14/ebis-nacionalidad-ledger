package com.ebis.nacionalidad.infrastructure.web;

import jakarta.validation.constraints.NotBlank;

public record ReasonCodeRequest(@NotBlank String reasonCode) {}
