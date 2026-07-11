package com.ebis.nacionalidad.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TrackedTransactionJpaRepository extends JpaRepository<TrackedTransactionEntity, String> {}
