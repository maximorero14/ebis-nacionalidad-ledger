package com.ebis.nacionalidad.infrastructure.web;

import jakarta.validation.constraints.NotBlank;

public record SubmitDocumentsRequest(@NotBlank String documentReference) {}
