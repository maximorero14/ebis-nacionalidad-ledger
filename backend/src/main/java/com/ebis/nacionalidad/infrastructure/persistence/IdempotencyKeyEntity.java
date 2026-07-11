package com.ebis.nacionalidad.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "idempotency_keys")
public class IdempotencyKeyEntity {

    @Id
    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @Column(name = "transaction_hash", nullable = false)
    private String transactionHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected IdempotencyKeyEntity() {
        // JPA
    }

    public IdempotencyKeyEntity(String idempotencyKey, String transactionHash, Instant createdAt) {
        this.idempotencyKey = idempotencyKey;
        this.transactionHash = transactionHash;
        this.createdAt = createdAt;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public String getTransactionHash() {
        return transactionHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
