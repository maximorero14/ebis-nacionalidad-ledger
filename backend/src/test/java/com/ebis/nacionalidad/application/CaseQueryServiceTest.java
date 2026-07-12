package com.ebis.nacionalidad.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.ebis.nacionalidad.domain.model.CaseProjection;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.OnChainRole;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import com.ebis.nacionalidad.domain.port.CaseProjectionPort;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import java.math.BigInteger;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CaseQueryServiceTest {

    @Mock private NationalityLedgerClient ledgerClient;
    @Mock private CaseProjectionPort caseProjectionPort;

    private final OnChainCase ownedByCitizen =
            new OnChainCase(
                    1L, "0xCITIZEN", CaseStatus.IN_REVIEW, 0, "0x00", false, false, false, BigInteger.ZERO);

    private CaseQueryService service() {
        return new CaseQueryService(
                ledgerClient, caseProjectionPort, new OnChainAuthorizationService(ledgerClient));
    }

    @Test
    void ownerCanViewTheirOwnCase() {
        when(ledgerClient.readCase(1L)).thenReturn(Optional.of(ownedByCitizen));

        OnChainCase result = service().getCase(1L, "0xCITIZEN");

        assertThat(result).isEqualTo(ownedByCitizen);
    }

    @Test
    void citizenCannotViewSomeoneElsesCase() {
        when(ledgerClient.readCase(1L)).thenReturn(Optional.of(ownedByCitizen));

        assertThatThrownBy(() -> service().getCase(1L, "0xSOMEONE_ELSE"))
                .isInstanceOf(CaseAccessDeniedException.class);
    }

    @Test
    void institutionalActorsCanViewAnyCase() {
        when(ledgerClient.readCase(1L)).thenReturn(Optional.of(ownedByCitizen));
        when(ledgerClient.hasRole(any(), eq("0xFOREIGN_AFFAIRS"))).thenReturn(false);
        when(ledgerClient.hasRole(OnChainRole.FOREIGN_AFFAIRS, "0xFOREIGN_AFFAIRS")).thenReturn(true);

        OnChainCase result = service().getCase(1L, "0xFOREIGN_AFFAIRS");

        assertThat(result).isEqualTo(ownedByCitizen);
    }

    @Test
    void unknownCaseIsReportedAsNotFound() {
        when(ledgerClient.readCase(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getCase(999L, "0xPOLICE"))
                .isInstanceOf(CaseNotFoundException.class);
    }

    @Test
    void citizenCannotListCases() {
        assertThatThrownBy(() -> service().listCases("0xCITIZEN", null))
                .isInstanceOf(WrongRoleException.class);
    }

    @Test
    void institutionalRoleListsAllCasesWhenNoStatusFilterGiven() {
        List<CaseProjection> projections =
                List.of(
                        new CaseProjection(1L, "0xA", CaseStatus.IN_REVIEW, 0, Instant.EPOCH),
                        new CaseProjection(2L, "0xB", CaseStatus.APPROVED, 1, Instant.EPOCH));
        when(caseProjectionPort.findAll()).thenReturn(projections);
        when(ledgerClient.hasRole(any(), eq("0xFOREIGN_AFFAIRS"))).thenReturn(false);
        when(ledgerClient.hasRole(OnChainRole.FOREIGN_AFFAIRS, "0xFOREIGN_AFFAIRS")).thenReturn(true);

        List<CaseProjection> result = service().listCases("0xFOREIGN_AFFAIRS", null);

        assertThat(result).isEqualTo(projections);
    }

    @Test
    void institutionalRoleFiltersByStatusWhenGiven() {
        List<CaseProjection> projections =
                List.of(
                        new CaseProjection(1L, "0xA", CaseStatus.IN_REVIEW, 0, Instant.EPOCH),
                        new CaseProjection(2L, "0xB", CaseStatus.APPROVED, 1, Instant.EPOCH));
        when(caseProjectionPort.findAll()).thenReturn(projections);
        when(ledgerClient.hasRole(any(), eq("0xPOLICE"))).thenReturn(false);
        when(ledgerClient.hasRole(OnChainRole.POLICE, "0xPOLICE")).thenReturn(true);

        List<CaseProjection> result = service().listCases("0xPOLICE", CaseStatus.IN_REVIEW);

        assertThat(result).containsExactly(projections.get(0));
    }
}
