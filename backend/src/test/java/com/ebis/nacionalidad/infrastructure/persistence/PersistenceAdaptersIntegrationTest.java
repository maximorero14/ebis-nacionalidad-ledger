package com.ebis.nacionalidad.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.ebis.nacionalidad.domain.model.CaseProjection;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.TrackedTransaction;
import com.ebis.nacionalidad.domain.model.TransactionStatus;
import com.ebis.nacionalidad.domain.port.CaseProjectionPort;
import com.ebis.nacionalidad.domain.port.IdempotencyPort;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import com.ebis.nacionalidad.domain.port.ProjectionCursorPort;
import com.ebis.nacionalidad.domain.port.TransactionTrackingPort;
import com.ebis.nacionalidad.infrastructure.blockchain.ContractsManifest;
import java.math.BigInteger;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Exercises the actual JPA round trip against a real Postgres (Testcontainers) for every
 * adapter M6.4/M6.5 added — {@code BackendApplicationTests} only proves the context loads
 * and Flyway migrates cleanly, not that these adapters read back what they wrote.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class PersistenceAdaptersIntegrationTest {

    @Container @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.10-alpine");

    @Autowired private TransactionTrackingPort transactionTrackingPort;
    @Autowired private IdempotencyPort idempotencyPort;
    @Autowired private CaseProjectionPort caseProjectionPort;
    @Autowired private ProjectionCursorPort projectionCursorPort;

    // Every adapter under test here only needs a real Postgres; the ledger port is
    // mocked exactly like BackendApplicationTests/SecurityIntegrationTest.
    @MockitoBean private NationalityLedgerClient nationalityLedgerClient;
    @MockitoBean private ContractsManifest contractsManifest;

    @Test
    void trackedTransactionRoundTripsThroughRealPostgres() {
        Instant now = Instant.now();
        TrackedTransaction pending = TrackedTransaction.pending("0xintegration1", now);

        transactionTrackingPort.save(pending);
        Optional<TrackedTransaction> found = transactionTrackingPort.findByHash("0xintegration1");

        assertThat(found).isPresent();
        assertThat(found.get().status()).isEqualTo(TransactionStatus.PENDING);

        TrackedTransaction confirmed = found.get().confirmed(BigInteger.TEN, 42L, Instant.now());
        transactionTrackingPort.save(confirmed);

        Optional<TrackedTransaction> updated = transactionTrackingPort.findByHash("0xintegration1");
        assertThat(updated).isPresent();
        assertThat(updated.get().status()).isEqualTo(TransactionStatus.CONFIRMED);
        assertThat(updated.get().caseId()).isEqualTo(42L);
        assertThat(updated.get().blockNumber()).isEqualTo(BigInteger.TEN);
    }

    @Test
    void unknownTransactionHashIsReportedAsAbsent() {
        assertThat(transactionTrackingPort.findByHash("0xdoesnotexist")).isEmpty();
    }

    @Test
    void idempotencyKeyRoundTripsThroughRealPostgres() {
        transactionTrackingPort.save(TrackedTransaction.pending("0xintegration2", Instant.now()));

        assertThat(idempotencyPort.findTransactionHash("integration-key-1")).isEmpty();

        idempotencyPort.save("integration-key-1", "0xintegration2");

        assertThat(idempotencyPort.findTransactionHash("integration-key-1")).contains("0xintegration2");
    }

    @Test
    void caseProjectionRoundTripsAndFindAllIncludesItThroughRealPostgres() {
        CaseProjection projection =
                new CaseProjection(777L, "0xowner", CaseStatus.CREATED, 0, Instant.now());

        caseProjectionPort.save(projection);

        assertThat(caseProjectionPort.findByCaseId(777L)).contains(projection);
        assertThat(caseProjectionPort.findAll()).contains(projection);
    }

    @Test
    void projectionCursorRoundTripsAndResetsThroughRealPostgres() {
        assertThat(projectionCursorPort.getLastProcessedBlock()).isEmpty();

        projectionCursorPort.setLastProcessedBlock(BigInteger.valueOf(123));
        assertThat(projectionCursorPort.getLastProcessedBlock()).contains(BigInteger.valueOf(123));

        projectionCursorPort.reset();
        assertThat(projectionCursorPort.getLastProcessedBlock()).isEmpty();
    }
}
