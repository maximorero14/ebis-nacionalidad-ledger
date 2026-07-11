package com.ebis.nacionalidad.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigInteger;
import java.time.Instant;

@Entity
@Table(name = "projection_cursor")
public class ProjectionCursorEntity {

    @Id
    @Column(name = "cursor_name")
    private String cursorName;

    @Column(name = "last_processed_block", nullable = false)
    private BigInteger lastProcessedBlock;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ProjectionCursorEntity() {
        // JPA
    }

    public ProjectionCursorEntity(String cursorName, BigInteger lastProcessedBlock, Instant updatedAt) {
        this.cursorName = cursorName;
        this.lastProcessedBlock = lastProcessedBlock;
        this.updatedAt = updatedAt;
    }

    public String getCursorName() {
        return cursorName;
    }

    public BigInteger getLastProcessedBlock() {
        return lastProcessedBlock;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
