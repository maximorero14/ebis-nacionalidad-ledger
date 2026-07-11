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
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import java.math.BigInteger;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CaseCommandServiceTest {

    @Mock private NationalityLedgerClient ledgerClient;

    @Test
    void createCaseRequiresCitizenRole() {
        CaseCommandService service = new CaseCommandService(ledgerClient);

        assertThatThrownBy(() -> service.createCase(ApplicationRole.POLICE))
                .isInstanceOf(WrongRoleException.class);
    }

    @Test
    void createCaseDelegatesToTheLedgerAsTheCitizen() {
        TransactionOutcome outcome = new TransactionOutcome("0xhash", BigInteger.ONE, true, 1L);
        when(ledgerClient.createCase(ApplicationRole.CITIZEN)).thenReturn(outcome);
        CaseCommandService service = new CaseCommandService(ledgerClient);

        assertThat(service.createCase(ApplicationRole.CITIZEN)).isEqualTo(outcome);
    }

    @Test
    void submitDocumentsHashesTheReferenceWithARandomSaltEachTime() {
        when(ledgerClient.submitDocuments(eq(ApplicationRole.CITIZEN), eq(1L), any()))
                .thenReturn(new TransactionOutcome("0xhash", BigInteger.ONE, true));
        CaseCommandService service = new CaseCommandService(ledgerClient);

        SubmitDocumentsResult first = service.submitDocuments(ApplicationRole.CITIZEN, 1L, "doc-ref");
        SubmitDocumentsResult second = service.submitDocuments(ApplicationRole.CITIZEN, 1L, "doc-ref");

        assertThat(first.saltHex()).isNotEqualTo(second.saltHex());
    }

    @Test
    void approveForeignAffairsReadsTheCurrentRoundFromTheChainFirst() {
        OnChainCase caseWithRound =
                new OnChainCase(1L, "0xowner", CaseStatus.IN_REVIEW, 3, "0x00", true, false, false, BigInteger.ZERO);
        when(ledgerClient.readCase(1L)).thenReturn(Optional.of(caseWithRound));
        when(ledgerClient.approveForeignAffairs(ApplicationRole.FOREIGN_AFFAIRS, 1L, 3L))
                .thenReturn(new TransactionOutcome("0xhash", BigInteger.ONE, true));
        CaseCommandService service = new CaseCommandService(ledgerClient);

        service.approveForeignAffairs(ApplicationRole.FOREIGN_AFFAIRS, 1L);

        verify(ledgerClient).approveForeignAffairs(ApplicationRole.FOREIGN_AFFAIRS, 1L, 3L);
    }

    @Test
    void approveForeignAffairsRejectsAnyOtherRole() {
        CaseCommandService service = new CaseCommandService(ledgerClient);

        assertThatThrownBy(() -> service.approveForeignAffairs(ApplicationRole.POLICE, 1L))
                .isInstanceOf(WrongRoleException.class);
    }

    @Test
    void requestRemediationAcceptsEitherInstitutionalRole() {
        when(ledgerClient.requestRemediation(any(), anyLong(), any()))
                .thenReturn(new TransactionOutcome("0xhash", BigInteger.ONE, true));
        CaseCommandService service = new CaseCommandService(ledgerClient);

        service.requestRemediation(ApplicationRole.FOREIGN_AFFAIRS, 1L, "MISSING_DOCUMENT");
        service.requestRemediation(ApplicationRole.POLICE, 1L, "MISSING_DOCUMENT");

        assertThatThrownBy(() -> service.requestRemediation(ApplicationRole.CITIZEN, 1L, "MISSING_DOCUMENT"))
                .isInstanceOf(WrongRoleException.class);
    }

    @Test
    void issueCredentialRequiresTheCredentialIssuerRole() {
        CaseCommandService service = new CaseCommandService(ledgerClient);

        assertThatThrownBy(() -> service.issueCredential(ApplicationRole.FOREIGN_AFFAIRS, 1L))
                .isInstanceOf(WrongRoleException.class);
    }
}
