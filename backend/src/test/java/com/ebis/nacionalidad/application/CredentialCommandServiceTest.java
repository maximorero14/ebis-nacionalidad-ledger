package com.ebis.nacionalidad.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import com.ebis.nacionalidad.domain.model.TransactionStatus;
import com.ebis.nacionalidad.domain.port.IdempotencyPort;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import com.ebis.nacionalidad.domain.port.TransactionTrackingPort;
import java.math.BigInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CredentialCommandServiceTest {

    @Mock private NationalityLedgerClient ledgerClient;
    @Mock private TransactionTrackingPort trackingPort;
    @Mock private IdempotencyPort idempotencyPort;

    private CredentialCommandService newService() {
        return new CredentialCommandService(
                ledgerClient, new TransactionTrackingService(ledgerClient, trackingPort, idempotencyPort));
    }

    @Test
    void revokeRequiresTheCredentialIssuerRole() {
        CredentialCommandService service = newService();

        assertThatThrownBy(() -> service.revoke(ApplicationRole.POLICE, 1L, "FRAUD", null))
                .isInstanceOf(WrongRoleException.class);
    }

    @Test
    void revokeDelegatesToTheLedgerAsTheIssuer() {
        TransactionOutcome outcome =
                new TransactionOutcome("0xhash", BigInteger.ONE, TransactionStatus.CONFIRMED, null, null, null);
        when(ledgerClient.revokeCredential(eq(ApplicationRole.CREDENTIAL_ISSUER), eq(1L), any()))
                .thenReturn(outcome);
        CredentialCommandService service = newService();

        TransactionOutcome result = service.revoke(ApplicationRole.CREDENTIAL_ISSUER, 1L, "FRAUD", null);

        assertThat(result).isEqualTo(outcome);
        verify(ledgerClient).revokeCredential(eq(ApplicationRole.CREDENTIAL_ISSUER), eq(1L), any());
    }
}
