package com.ebis.nacionalidad.infrastructure.persistence;

import com.ebis.nacionalidad.domain.port.ProjectionCursorPort;
import java.math.BigInteger;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class ProjectionCursorPersistenceAdapter implements ProjectionCursorPort {

    private static final String CURSOR_NAME = "registry_events";

    private final ProjectionCursorJpaRepository repository;

    public ProjectionCursorPersistenceAdapter(ProjectionCursorJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<BigInteger> getLastProcessedBlock() {
        return repository.findById(CURSOR_NAME).map(ProjectionCursorEntity::getLastProcessedBlock);
    }

    @Override
    public void setLastProcessedBlock(BigInteger blockNumber) {
        repository.save(new ProjectionCursorEntity(CURSOR_NAME, blockNumber, Instant.now()));
    }

    @Override
    public void reset() {
        repository.deleteById(CURSOR_NAME);
    }
}
