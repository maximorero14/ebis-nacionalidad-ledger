package com.ebis.nacionalidad.infrastructure.persistence;

import com.ebis.nacionalidad.domain.model.TransactionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigInteger;
import java.time.Instant;

@Entity
@Table(name = "tracked_transactions")
public class TrackedTransactionEntity {

    @Id
    @Column(name = "transaction_hash")
    private String transactionHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TransactionStatus status;

    @Column(name = "case_id")
    private Long caseId;

    @Column(name = "block_number")
    private BigInteger blockNumber;

    @Column(name = "error_code")
    private String errorCode;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TrackedTransactionEntity() {
        // JPA
    }

    public TrackedTransactionEntity(
            String transactionHash,
            TransactionStatus status,
            Long caseId,
            BigInteger blockNumber,
            String errorCode,
            String errorMessage,
            Instant submittedAt,
            Instant updatedAt) {
        this.transactionHash = transactionHash;
        this.status = status;
        this.caseId = caseId;
        this.blockNumber = blockNumber;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.submittedAt = submittedAt;
        this.updatedAt = updatedAt;
    }

    public String getTransactionHash() {
        return transactionHash;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public Long getCaseId() {
        return caseId;
    }

    public BigInteger getBlockNumber() {
        return blockNumber;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
