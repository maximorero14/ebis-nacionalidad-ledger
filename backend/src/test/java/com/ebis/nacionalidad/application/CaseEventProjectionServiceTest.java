package com.ebis.nacionalidad.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ebis.nacionalidad.domain.model.CaseEvent;
import com.ebis.nacionalidad.domain.model.CaseProjection;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import com.ebis.nacionalidad.domain.port.CaseProjectionPort;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import com.ebis.nacionalidad.domain.port.ProjectionCursorPort;
import java.math.BigInteger;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CaseEventProjectionServiceTest {

    @Mock private NationalityLedgerClient ledgerClient;
    @Mock private CaseProjectionPort projectionPort;
    @Mock private ProjectionCursorPort cursorPort;

    private CaseEventProjectionService newService() {
        return new CaseEventProjectionService(ledgerClient, projectionPort, cursorPort);
    }

    @Test
    void catchUpStartsFromTheDeploymentBlockOnFirstRun() {
        when(cursorPort.getLastProcessedBlock()).thenReturn(Optional.empty());
        when(ledgerClient.registryDeploymentBlock()).thenReturn(BigInteger.TEN);
        when(ledgerClient.readAllEventsFrom(BigInteger.TEN)).thenReturn(List.of());

        newService().catchUp();

        verify(ledgerClient).readAllEventsFrom(BigInteger.TEN);
        verify(cursorPort, never()).setLastProcessedBlock(any());
    }

    @Test
    void catchUpResumesFromOnePastTheSavedCursor() {
        when(cursorPort.getLastProcessedBlock()).thenReturn(Optional.of(BigInteger.valueOf(50)));
        when(ledgerClient.readAllEventsFrom(BigInteger.valueOf(51))).thenReturn(List.of());

        newService().catchUp();

        verify(ledgerClient).readAllEventsFrom(BigInteger.valueOf(51));
        verify(ledgerClient, never()).registryDeploymentBlock();
    }

    @Test
    void appliesCaseCreatedThenAStatusEventAndAdvancesTheCursorToTheHighestBlockSeen() {
        CaseEvent created =
                new CaseEvent(
                        "CaseCreated", BigInteger.valueOf(10), "0xtx1", Map.of("caseId", "1", "owner", "0xowner"));
        CaseEvent documentsSubmitted =
                new CaseEvent(
                        "DocumentsSubmitted",
                        BigInteger.valueOf(11),
                        "0xtx2",
                        Map.of("caseId", "1", "owner", "0xowner", "round", "0", "documentCommitment", "0x00"));
        when(cursorPort.getLastProcessedBlock()).thenReturn(Optional.empty());
        when(ledgerClient.registryDeploymentBlock()).thenReturn(BigInteger.ZERO);
        when(ledgerClient.readAllEventsFrom(BigInteger.ZERO)).thenReturn(List.of(created, documentsSubmitted));
        when(projectionPort.findByCaseId(1L))
                .thenReturn(Optional.of(new CaseProjection(1L, "0xowner", CaseStatus.CREATED, 0, Instant.EPOCH)));

        newService().catchUp();

        ArgumentCaptor<CaseProjection> captor = ArgumentCaptor.forClass(CaseProjection.class);
        verify(projectionPort, times(2)).save(captor.capture());
        assertThat(captor.getAllValues().get(0).status()).isEqualTo(CaseStatus.CREATED);
        assertThat(captor.getAllValues().get(1).status()).isEqualTo(CaseStatus.DOCUMENTS_SUBMITTED);
        verify(cursorPort).setLastProcessedBlock(BigInteger.valueOf(11));
    }

    @Test
    void ignoresEventsOutsideTheProjectionsNarrowSchema() {
        CaseEvent feePaid =
                new CaseEvent(
                        "FeePaid",
                        BigInteger.ONE,
                        "0xtx",
                        Map.of("caseId", "1", "payer", "0xowner", "treasury", "0xtreasury", "amount", "10000"));
        when(cursorPort.getLastProcessedBlock()).thenReturn(Optional.empty());
        when(ledgerClient.registryDeploymentBlock()).thenReturn(BigInteger.ZERO);
        when(ledgerClient.readAllEventsFrom(BigInteger.ZERO)).thenReturn(List.of(feePaid));

        newService().catchUp();

        verify(projectionPort, never()).save(any());
        verify(cursorPort).setLastProcessedBlock(BigInteger.ONE);
    }

    @Test
    void aStatusEventBeforeItsCaseCreatedEventFailsLoudlyRatherThanSilentlyCorrupting() {
        CaseEvent documentsSubmitted =
                new CaseEvent(
                        "DocumentsSubmitted",
                        BigInteger.ONE,
                        "0xtx",
                        Map.of("caseId", "99", "owner", "0xowner", "round", "0", "documentCommitment", "0x00"));
        when(cursorPort.getLastProcessedBlock()).thenReturn(Optional.empty());
        when(ledgerClient.registryDeploymentBlock()).thenReturn(BigInteger.ZERO);
        when(ledgerClient.readAllEventsFrom(BigInteger.ZERO)).thenReturn(List.of(documentsSubmitted));
        when(projectionPort.findByCaseId(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> newService().catchUp()).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void reprocessFromScratchResetsTheCursorAndReplaysFromTheDeploymentBlock() {
        when(ledgerClient.registryDeploymentBlock()).thenReturn(BigInteger.valueOf(5));
        when(ledgerClient.readAllEventsFrom(BigInteger.valueOf(5))).thenReturn(List.of());

        newService().reprocessFromScratch();

        verify(cursorPort).reset();
        verify(ledgerClient).readAllEventsFrom(BigInteger.valueOf(5));
    }

    @Test
    void detectDivergencesFlagsAMismatchedStatus() {
        CaseProjection projected = new CaseProjection(1L, "0xowner", CaseStatus.IN_REVIEW, 0, Instant.EPOCH);
        when(projectionPort.findAll()).thenReturn(List.of(projected));
        when(ledgerClient.readCase(1L))
                .thenReturn(
                        Optional.of(
                                new OnChainCase(
                                        1L, "0xowner", CaseStatus.APPROVED, 0, "0x00", true, true, true,
                                        BigInteger.ZERO)));

        List<CaseEventProjectionService.Divergence> divergences = newService().detectDivergences();

        assertThat(divergences).hasSize(1);
        assertThat(divergences.get(0).onChainStatus()).isEqualTo(CaseStatus.APPROVED);
        assertThat(divergences.get(0).projectedStatus()).isEqualTo(CaseStatus.IN_REVIEW);
    }

    @Test
    void detectDivergencesReturnsNothingWhenInSync() {
        CaseProjection projected = new CaseProjection(1L, "0xowner", CaseStatus.APPROVED, 2, Instant.EPOCH);
        when(projectionPort.findAll()).thenReturn(List.of(projected));
        when(ledgerClient.readCase(1L))
                .thenReturn(
                        Optional.of(
                                new OnChainCase(
                                        1L, "0xowner", CaseStatus.APPROVED, 2, "0x00", true, true, true,
                                        BigInteger.ZERO)));

        assertThat(newService().detectDivergences()).isEmpty();
    }
}
