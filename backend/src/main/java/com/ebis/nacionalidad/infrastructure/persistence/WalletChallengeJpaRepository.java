package com.ebis.nacionalidad.infrastructure.persistence;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface WalletChallengeJpaRepository extends JpaRepository<WalletChallengeEntity, String> {

    Optional<WalletChallengeEntity> findByNonce(String nonce);

    @Modifying
    @Query(
            "update WalletChallengeEntity challenge set challenge.consumedAt = :consumedAt "
                    + "where challenge.nonce = :nonce and challenge.consumedAt is null")
    int consume(String nonce, Instant consumedAt);
}
