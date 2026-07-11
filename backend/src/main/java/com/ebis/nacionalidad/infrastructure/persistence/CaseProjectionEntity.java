package com.ebis.nacionalidad.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "case_projection")
public class CaseProjectionEntity {

    @Id
    @Column(name = "case_id")
    private Long caseId;

    @Column(name = "owner_address", nullable = false)
    private String ownerAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private com.ebis.nacionalidad.domain.model.CaseStatus status;

    @Column(name = "review_round", nullable = false)
    private long reviewRound;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CaseProjectionEntity() {
        // JPA
    }

    public Long getCaseId() {
        return caseId;
    }

    public String getOwnerAddress() {
        return ownerAddress;
    }

    public com.ebis.nacionalidad.domain.model.CaseStatus getStatus() {
        return status;
    }

    public long getReviewRound() {
        return reviewRound;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
