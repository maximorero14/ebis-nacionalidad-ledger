package com.ebis.nacionalidad.infrastructure.persistence;

import com.ebis.nacionalidad.domain.model.CaseProjection;
import com.ebis.nacionalidad.domain.port.CaseProjectionPort;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class CaseProjectionAdapter implements CaseProjectionPort {

    private final CaseProjectionJpaRepository repository;

    public CaseProjectionAdapter(CaseProjectionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<CaseProjection> findByCaseId(long caseId) {
        return repository.findById(caseId).map(this::toDomain);
    }

    @Override
    public List<CaseProjection> findAll() {
        return repository.findAll().stream().map(this::toDomain).toList();
    }

    @Override
    public void save(CaseProjection projection) {
        repository.save(
                new CaseProjectionEntity(
                        projection.caseId(),
                        projection.ownerAddress(),
                        projection.status(),
                        projection.reviewRound(),
                        projection.updatedAt()));
    }

    private CaseProjection toDomain(CaseProjectionEntity entity) {
        return new CaseProjection(
                entity.getCaseId(),
                entity.getOwnerAddress(),
                entity.getStatus(),
                entity.getReviewRound(),
                entity.getUpdatedAt());
    }
}
