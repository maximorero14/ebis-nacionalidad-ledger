package com.ebis.nacionalidad.infrastructure.persistence;

import com.ebis.nacionalidad.domain.port.IdempotencyPort;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class IdempotencyKeyPersistenceAdapter implements IdempotencyPort {

    private final IdempotencyKeyJpaRepository repository;

    public IdempotencyKeyPersistenceAdapter(IdempotencyKeyJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<String> findTransactionHash(String idempotencyKey) {
        return repository.findById(idempotencyKey).map(IdempotencyKeyEntity::getTransactionHash);
    }

    @Override
    public void save(String idempotencyKey, String transactionHash) {
        repository.save(new IdempotencyKeyEntity(idempotencyKey, transactionHash, Instant.now()));
    }
}
