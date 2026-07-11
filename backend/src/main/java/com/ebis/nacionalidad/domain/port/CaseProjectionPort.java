package com.ebis.nacionalidad.domain.port;

import com.ebis.nacionalidad.domain.model.CaseProjection;
import java.util.List;
import java.util.Optional;

/** Outbound port for the case read-model; the only adapter allowed to use JPA directly. */
public interface CaseProjectionPort {

    Optional<CaseProjection> findByCaseId(long caseId);

    List<CaseProjection> findAll();

    void save(CaseProjection projection);
}
