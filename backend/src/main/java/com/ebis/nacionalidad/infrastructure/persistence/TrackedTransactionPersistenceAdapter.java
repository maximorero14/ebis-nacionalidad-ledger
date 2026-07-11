package com.ebis.nacionalidad.infrastructure.persistence;

import com.ebis.nacionalidad.domain.model.TrackedTransaction;
import com.ebis.nacionalidad.domain.port.TransactionTrackingPort;
import java.util.Optional;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class TrackedTransactionPersistenceAdapter implements TransactionTrackingPort {

    private final TrackedTransactionJpaRepository repository;

    public TrackedTransactionPersistenceAdapter(TrackedTransactionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public void save(TrackedTransaction transaction) {
        repository.save(
                new TrackedTransactionEntity(
                        transaction.transactionHash(),
                        transaction.status(),
                        transaction.caseId(),
                        transaction.blockNumber(),
                        transaction.errorCode(),
                        transaction.errorMessage(),
                        transaction.submittedAt(),
                        transaction.updatedAt()));
    }

    @Override
    public Optional<TrackedTransaction> findByHash(String transactionHash) {
        return repository.findById(transactionHash).map(this::toDomain);
    }

    private TrackedTransaction toDomain(TrackedTransactionEntity entity) {
        return new TrackedTransaction(
                entity.getTransactionHash(),
                entity.getStatus(),
                entity.getCaseId(),
                entity.getBlockNumber(),
                entity.getErrorCode(),
                entity.getErrorMessage(),
                entity.getSubmittedAt(),
                entity.getUpdatedAt());
    }
}
