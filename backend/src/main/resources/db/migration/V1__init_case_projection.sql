-- Read-model reconstructed from on-chain events (see M6.5). The chain remains the
-- source of truth; this table only ever caches state for fast queries and search.
CREATE TABLE case_projection (
    case_id       BIGINT PRIMARY KEY,
    owner_address VARCHAR(42) NOT NULL,
    status        VARCHAR(32) NOT NULL,
    review_round  BIGINT NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_case_projection_owner_address ON case_projection (owner_address);
