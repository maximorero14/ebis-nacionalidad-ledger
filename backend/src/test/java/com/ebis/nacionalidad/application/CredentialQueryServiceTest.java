package com.ebis.nacionalidad.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.ebis.nacionalidad.domain.model.CredentialView;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CredentialQueryServiceTest {

    @Mock private NationalityLedgerClient ledgerClient;

    @Test
    void getCredentialReturnsTheDecodedView() {
        CredentialView view = new CredentialView(1L, 1L, "0xholder", false, "0x00", "demo://1");
        when(ledgerClient.readCredential(1L)).thenReturn(Optional.of(view));
        CredentialQueryService service = new CredentialQueryService(ledgerClient);

        assertThat(service.getCredential(1L)).isEqualTo(view);
    }

    @Test
    void getCredentialThrowsWhenNoCredentialWasEverIssued() {
        when(ledgerClient.readCredential(99L)).thenReturn(Optional.empty());
        CredentialQueryService service = new CredentialQueryService(ledgerClient);

        assertThatThrownBy(() -> service.getCredential(99L)).isInstanceOf(CaseNotFoundException.class);
    }

    @Test
    void isValidDelegatesToTheLedger() {
        when(ledgerClient.isCredentialValid(1L)).thenReturn(true);
        CredentialQueryService service = new CredentialQueryService(ledgerClient);

        assertThat(service.isValid(1L)).isTrue();
    }
}
