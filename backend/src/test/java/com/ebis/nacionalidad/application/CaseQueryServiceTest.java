package com.ebis.nacionalidad.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseProjection;
import com.ebis.nacionalidad.domain.model.CaseStatus;
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
        return new CaseQueryService(ledgerClient, caseProjectionPort);
    }

    @Test
    void ownerCanViewTheirOwnCase() {
        when(ledgerClient.readCase(1L)).thenReturn(Optional.of(ownedByCitizen));

        OnChainCase result = service().getCase(1L, ApplicationRole.CITIZEN, "0xCITIZEN");

        assertThat(result).isEqualTo(ownedByCitizen);
    }

    @Test
    void citizenCannotViewSomeoneElsesCase() {
        when(ledgerClient.readCase(1L)).thenReturn(Optional.of(ownedByCitizen));

        assertThatThrownBy(() -> service().getCase(1L, ApplicationRole.CITIZEN, "0xSOMEONE_ELSE"))
                .isInstanceOf(CaseAccessDeniedException.class);
    }

    @Test
    void institutionalActorsCanViewAnyCase() {
        when(ledgerClient.readCase(1L)).thenReturn(Optional.of(ownedByCitizen));

        OnChainCase result = service().getCase(1L, ApplicationRole.FOREIGN_AFFAIRS, "0xFOREIGN_AFFAIRS");

        assertThat(result).isEqualTo(ownedByCitizen);
    }

    @Test
    void unknownCaseIsReportedAsNotFound() {
        when(ledgerClient.readCase(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().getCase(999L, ApplicationRole.POLICE, "0xPOLICE"))
                .isInstanceOf(CaseNotFoundException.class);
    }

    @Test
    void citizenCannotListCases() {
        assertThatThrownBy(() -> service().listCases(ApplicationRole.CITIZEN, null))
                .isInstanceOf(WrongRoleException.class);
    }

    @Test
    void institutionalRoleListsAllCasesWhenNoStatusFilterGiven() {
        List<CaseProjection> projections =
                List.of(
                        new CaseProjection(1L, "0xA", CaseStatus.IN_REVIEW, 0, Instant.EPOCH),
                        new CaseProjection(2L, "0xB", CaseStatus.APPROVED, 1, Instant.EPOCH));
        when(caseProjectionPort.findAll()).thenReturn(projections);

        List<CaseProjection> result = service().listCases(ApplicationRole.FOREIGN_AFFAIRS, null);

        assertThat(result).isEqualTo(projections);
    }

    @Test
    void institutionalRoleFiltersByStatusWhenGiven() {
        List<CaseProjection> projections =
                List.of(
                        new CaseProjection(1L, "0xA", CaseStatus.IN_REVIEW, 0, Instant.EPOCH),
                        new CaseProjection(2L, "0xB", CaseStatus.APPROVED, 1, Instant.EPOCH));
        when(caseProjectionPort.findAll()).thenReturn(projections);

        List<CaseProjection> result = service().listCases(ApplicationRole.POLICE, CaseStatus.IN_REVIEW);

        assertThat(result).containsExactly(projections.get(0));
    }
}
