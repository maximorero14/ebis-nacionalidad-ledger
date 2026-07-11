package com.ebis.nacionalidad.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ebis.nacionalidad.domain.model.TrackedTransaction;
import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import com.ebis.nacionalidad.domain.model.TransactionStatus;
import com.ebis.nacionalidad.domain.port.IdempotencyPort;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import com.ebis.nacionalidad.domain.port.TransactionTrackingPort;
import java.math.BigInteger;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TransactionTrackingServiceTest {

    @Mock private NationalityLedgerClient ledgerClient;
    @Mock private TransactionTrackingPort trackingPort;
    @Mock private IdempotencyPort idempotencyPort;

    private TransactionTrackingService newService() {
        return new TransactionTrackingService(ledgerClient, trackingPort, idempotencyPort);
    }

    @Test
    void runIdempotentExecutesTheActionWhenNoKeyIsGiven() {
        AtomicInteger calls = new AtomicInteger();
        TransactionTrackingService service = newService();

        TransactionOutcome outcome =
                service.runIdempotent(
                        null,
                        () -> {
                            calls.incrementAndGet();
                            return new TransactionOutcome(
                                    "0xhash", BigInteger.ONE, TransactionStatus.CONFIRMED, null, null, null);
                        });

        assertThat(calls.get()).isEqualTo(1);
        assertThat(outcome.transactionHash()).isEqualTo("0xhash");
        verify(idempotencyPort, never()).save(any(), any());
    }

    @Test
    void runIdempotentSkipsTheActionOnARepeatedKey() {
        when(idempotencyPort.findTransactionHash("key-1")).thenReturn(Optional.of("0xhash"));
        when(trackingPort.findByHash("0xhash"))
                .thenReturn(
                        Optional.of(
                                new TrackedTransaction(
                                        "0xhash",
                                        TransactionStatus.CONFIRMED,
                                        5L,
                                        BigInteger.TEN,
                                        null,
                                        null,
                                        Instant.EPOCH,
                                        Instant.EPOCH)));
        AtomicInteger calls = new AtomicInteger();
        TransactionTrackingService service = newService();

        TransactionOutcome outcome =
                service.runIdempotent(
                        "key-1",
                        () -> {
                            calls.incrementAndGet();
                            return new TransactionOutcome(
                                    "0xnew", BigInteger.ONE, TransactionStatus.CONFIRMED, null, null, null);
                        });

        assertThat(calls.get()).isZero();
        assertThat(outcome.transactionHash()).isEqualTo("0xhash");
        assertThat(outcome.caseId()).isEqualTo(5L);
    }

    @Test
    void runIdempotentPersistsTheKeyAfterAFreshCall() {
        when(idempotencyPort.findTransactionHash("key-1")).thenReturn(Optional.empty());
        TransactionTrackingService service = newService();

        service.runIdempotent(
                "key-1",
                () -> new TransactionOutcome("0xhash", BigInteger.ONE, TransactionStatus.CONFIRMED, null, null, null));

        verify(idempotencyPort).save("key-1", "0xhash");
    }

    @Test
    void getStatusReturnsTerminalStatesWithoutReconciling() {
        TrackedTransaction confirmed =
                new TrackedTransaction(
                        "0xhash",
                        TransactionStatus.CONFIRMED,
                        1L,
                        BigInteger.TEN,
                        null,
                        null,
                        Instant.EPOCH,
                        Instant.EPOCH);
        when(trackingPort.findByHash("0xhash")).thenReturn(Optional.of(confirmed));
        TransactionTrackingService service = newService();

        TrackedTransaction result = service.getStatus("0xhash");

        assertThat(result).isEqualTo(confirmed);
        verify(ledgerClient, never()).checkReceipt(any());
    }

    @Test
    void getStatusReconcilesAPendingTransactionThatHasSinceConfirmed() {
        TrackedTransaction pending = TrackedTransaction.pending("0xhash", Instant.EPOCH);
        when(trackingPort.findByHash("0xhash")).thenReturn(Optional.of(pending));
        when(ledgerClient.checkReceipt("0xhash"))
                .thenReturn(
                        Optional.of(
                                new TransactionOutcome(
                                        "0xhash", BigInteger.TEN, TransactionStatus.CONFIRMED, 7L, null, null)));
        TransactionTrackingService service = newService();

        TrackedTransaction result = service.getStatus("0xhash");

        assertThat(result.status()).isEqualTo(TransactionStatus.CONFIRMED);
        assertThat(result.caseId()).isEqualTo(7L);
        verify(trackingPort).save(result);
    }

    @Test
    void getStatusLeavesAStillUnminedTransactionUnchanged() {
        TrackedTransaction timedOut = TrackedTransaction.pending("0xhash", Instant.EPOCH).timedOut(Instant.EPOCH);
        when(trackingPort.findByHash("0xhash")).thenReturn(Optional.of(timedOut));
        when(ledgerClient.checkReceipt("0xhash")).thenReturn(Optional.empty());
        TransactionTrackingService service = newService();

        TrackedTransaction result = service.getStatus("0xhash");

        assertThat(result.status()).isEqualTo(TransactionStatus.TIMEOUT);
        verify(trackingPort, never()).save(any());
    }

    @Test
    void getStatusThrowsForAnUnknownHash() {
        when(trackingPort.findByHash("0xunknown")).thenReturn(Optional.empty());
        TransactionTrackingService service = newService();

        assertThatThrownBy(() -> service.getStatus("0xunknown"))
                .isInstanceOf(TransactionNotFoundException.class);
    }
}
