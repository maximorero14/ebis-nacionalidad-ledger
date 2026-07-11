package com.ebis.nacionalidad.infrastructure.web;

import com.ebis.nacionalidad.application.NetworkStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Network", description = "Estado de la red Besu")
public class NetworkStatusController {

    private final NetworkStatusService networkStatusService;

    public NetworkStatusController(NetworkStatusService networkStatusService) {
        this.networkStatusService = networkStatusService;
    }

    @GetMapping("/network/status")
    @Operation(summary = "Altura, peers, validadores y gas price de la red Besu")
    public NetworkStatusResponse networkStatus() {
        return NetworkStatusResponse.from(networkStatusService.currentStatus());
    }
}
