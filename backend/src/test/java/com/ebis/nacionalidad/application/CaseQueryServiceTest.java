package com.ebis.nacionalidad.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseProjection;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.port.CaseProjectionPort;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CaseQueryServiceTest {

    @Mock private CaseProjectionPort caseProjectionPort;

    private final CaseProjection ownedByCitizen =
            new CaseProjection(1L, "0xCITIZEN", CaseStatus.IN_REVIEW, 0, Instant.now());

    @Test
    void ownerCanViewTheirOwnCase() {
        when(caseProjectionPort.findByCaseId(1L)).thenReturn(Optional.of(ownedByCitizen));
        CaseQueryService service = new CaseQueryService(caseProjectionPort);

        CaseProjection result = service.getCase(1L, ApplicationRole.CITIZEN, "0xCITIZEN");

        assertThat(result).isEqualTo(ownedByCitizen);
    }

    @Test
    void citizenCannotViewSomeoneElsesCase() {
        when(caseProjectionPort.findByCaseId(1L)).thenReturn(Optional.of(ownedByCitizen));
        CaseQueryService service = new CaseQueryService(caseProjectionPort);

        assertThatThrownBy(() -> service.getCase(1L, ApplicationRole.CITIZEN, "0xSOMEONE_ELSE"))
                .isInstanceOf(CaseAccessDeniedException.class);
    }

    @Test
    void institutionalActorsCanViewAnyCase() {
        when(caseProjectionPort.findByCaseId(1L)).thenReturn(Optional.of(ownedByCitizen));
        CaseQueryService service = new CaseQueryService(caseProjectionPort);

        CaseProjection result =
                service.getCase(1L, ApplicationRole.FOREIGN_AFFAIRS, "0xFOREIGN_AFFAIRS");

        assertThat(result).isEqualTo(ownedByCitizen);
    }

    @Test
    void unknownCaseIsReportedAsNotFound() {
        when(caseProjectionPort.findByCaseId(999L)).thenReturn(Optional.empty());
        CaseQueryService service = new CaseQueryService(caseProjectionPort);

        assertThatThrownBy(() -> service.getCase(999L, ApplicationRole.POLICE, "0xPOLICE"))
                .isInstanceOf(CaseNotFoundException.class);
    }
}
