package com.ebis.nacionalidad.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ebis.nacionalidad.application.CaseCommandService.SubmitDocumentsResult;
import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import com.ebis.nacionalidad.domain.model.TransactionStatus;
import com.ebis.nacionalidad.domain.port.IdempotencyPort;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import com.ebis.nacionalidad.domain.port.TransactionTrackingPort;
import java.math.BigInteger;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * No idempotency key is passed in any of these cases, so {@link TransactionTrackingService}
 * always runs the action directly against the mocked ledger without touching the (also
 * mocked) tracking/idempotency ports — that behaviour has its own coverage elsewhere.
 */
@ExtendWith(MockitoExtension.class)
class CaseCommandServiceTest {

    @Mock private NationalityLedgerClient ledgerClient;
    @Mock private TransactionTrackingPort trackingPort;
    @Mock private IdempotencyPort idempotencyPort;

    private CaseCommandService newService() {
        return new CaseCommandService(
                ledgerClient, new TransactionTrackingService(ledgerClient, trackingPort, idempotencyPort));
    }

    private static TransactionOutcome confirmed(String hash, BigInteger blockNumber, Long caseId) {
        return new TransactionOutcome(hash, blockNumber, TransactionStatus.CONFIRMED, caseId, null, null);
    }

    @Test
    void createCaseRequiresCitizenRole() {
        CaseCommandService service = newService();

        assertThatThrownBy(() -> service.createCase(ApplicationRole.POLICE, null))
                .isInstanceOf(WrongRoleException.class);
    }

    @Test
    void createCaseDelegatesToTheLedgerAsTheCitizen() {
        TransactionOutcome outcome = confirmed("0xhash", BigInteger.ONE, 1L);
        when(ledgerClient.createCase(ApplicationRole.CITIZEN)).thenReturn(outcome);
        CaseCommandService service = newService();

        assertThat(service.createCase(ApplicationRole.CITIZEN, null)).isEqualTo(outcome);
    }

    @Test
    void submitDocumentsHashesTheReferenceWithARandomSaltEachTime() {
        when(ledgerClient.submitDocuments(eq(ApplicationRole.CITIZEN), eq(1L), any()))
                .thenReturn(confirmed("0xhash", BigInteger.ONE, null));
        CaseCommandService service = newService();

        SubmitDocumentsResult first = service.submitDocuments(ApplicationRole.CITIZEN, 1L, "doc-ref", null);
        SubmitDocumentsResult second = service.submitDocuments(ApplicationRole.CITIZEN, 1L, "doc-ref", null);

        assertThat(first.saltHex()).isNotEqualTo(second.saltHex());
    }

    @Test
    void approveForeignAffairsReadsTheCurrentRoundFromTheChainFirst() {
        OnChainCase caseWithRound =
                new OnChainCase(1L, "0xowner", CaseStatus.IN_REVIEW, 3, "0x00", true, false, false, BigInteger.ZERO);
        when(ledgerClient.readCase(1L)).thenReturn(Optional.of(caseWithRound));
        when(ledgerClient.approveForeignAffairs(ApplicationRole.FOREIGN_AFFAIRS, 1L, 3L))
                .thenReturn(confirmed("0xhash", BigInteger.ONE, null));
        CaseCommandService service = newService();

        service.approveForeignAffairs(ApplicationRole.FOREIGN_AFFAIRS, 1L, null);

        verify(ledgerClient).approveForeignAffairs(ApplicationRole.FOREIGN_AFFAIRS, 1L, 3L);
    }

    @Test
    void approveForeignAffairsRejectsAnyOtherRole() {
        CaseCommandService service = newService();

        assertThatThrownBy(() -> service.approveForeignAffairs(ApplicationRole.POLICE, 1L, null))
                .isInstanceOf(WrongRoleException.class);
    }

    @Test
    void requestRemediationAcceptsEitherInstitutionalRole() {
        when(ledgerClient.requestRemediation(any(), anyLong(), any()))
                .thenReturn(confirmed("0xhash", BigInteger.ONE, null));
        CaseCommandService service = newService();

        service.requestRemediation(ApplicationRole.FOREIGN_AFFAIRS, 1L, "MISSING_DOCUMENT", null);
        service.requestRemediation(ApplicationRole.POLICE, 1L, "MISSING_DOCUMENT", null);

        assertThatThrownBy(
                        () -> service.requestRemediation(ApplicationRole.CITIZEN, 1L, "MISSING_DOCUMENT", null))
                .isInstanceOf(WrongRoleException.class);
    }

    @Test
    void issueCredentialRequiresTheCredentialIssuerRole() {
        CaseCommandService service = newService();

        assertThatThrownBy(() -> service.issueCredential(ApplicationRole.FOREIGN_AFFAIRS, 1L, null))
                .isInstanceOf(WrongRoleException.class);
    }
}
