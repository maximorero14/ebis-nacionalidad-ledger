package com.ebis.nacionalidad;

import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import com.ebis.nacionalidad.infrastructure.blockchain.ContractsManifest;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class BackendApplicationTests {

    @Container @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.10-alpine");

    // No real deployment manifest/Besu network exists in this test's sandbox; every
    // controller that needs the ledger port gets a mock instead (see SecurityIntegrationTest
    // for one that actually stubs behaviour).
    @MockitoBean private NationalityLedgerClient nationalityLedgerClient;
    @MockitoBean private ContractsManifest contractsManifest;

    @Test
    void contextLoadsAndFlywayMigrationsApply() {
        // If the context fails to start, Flyway didn't apply V1__init_case_projection.sql
        // cleanly against a real Postgres, or a bean is misconfigured.
    }
}
