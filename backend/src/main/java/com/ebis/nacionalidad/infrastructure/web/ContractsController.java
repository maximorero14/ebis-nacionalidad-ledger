package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.infrastructure.blockchain.ContractsManifest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Contracts", description = "Direcciones publicas de los contratos desplegados")
public class ContractsController {

    private final ContractsManifest contractsManifest;

    public ContractsController(ContractsManifest contractsManifest) {
        this.contractsManifest = contractsManifest;
    }

    @GetMapping("/contracts")
    @Operation(summary = "Direcciones de contratos y chainId para lecturas on-chain desde el frontend")
    public ContractsResponse contracts() {
        return ContractsResponse.from(contractsManifest);
    }
}
