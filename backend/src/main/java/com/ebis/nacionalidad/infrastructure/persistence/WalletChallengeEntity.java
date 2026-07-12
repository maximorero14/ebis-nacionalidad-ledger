package com.ebis.nacionalidad.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "wallet_challenge")
public class WalletChallengeEntity {

    @Id
    @Column(nullable = false, length = 96)
    private String nonce;

    @Column(nullable = false, length = 42)
    private String address;

    @Column(name = "chain_id", nullable = false)
    private long chainId;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    protected WalletChallengeEntity() {}

    public WalletChallengeEntity(String nonce, String address, long chainId, Instant issuedAt, Instant expiresAt) {
        this.nonce = nonce;
        this.address = address;
        this.chainId = chainId;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
    }

    public String nonce() {
        return nonce;
    }

    public String address() {
        return address;
    }

    public long chainId() {
        return chainId;
    }

    public Instant issuedAt() {
        return issuedAt;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public Instant consumedAt() {
        return consumedAt;
    }
}
