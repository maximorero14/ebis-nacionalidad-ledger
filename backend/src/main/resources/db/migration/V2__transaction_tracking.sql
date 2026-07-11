-- M6.4: transaction lifecycle tracking (PENDING/CONFIRMED/REVERTED/TIMEOUT) and
-- idempotency keys for critical write operations. The chain remains the source of
-- truth for case/credential state; these tables only ever cache a transaction's own
-- outcome so it can be queried by hash (GET /transactions/{hash}) and so a retried
-- request with the same idempotency key never resubmits.
CREATE TABLE tracked_transactions (
    transaction_hash VARCHAR(66) PRIMARY KEY,
    status           VARCHAR(16) NOT NULL,
    case_id          BIGINT,
    block_number     NUMERIC(78, 0),
    error_code       VARCHAR(64),
    error_message    VARCHAR(512),
    submitted_at     TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL
);

CREATE TABLE idempotency_keys (
    idempotency_key  VARCHAR(255) PRIMARY KEY,
    transaction_hash VARCHAR(66) NOT NULL REFERENCES tracked_transactions (transaction_hash),
    created_at       TIMESTAMPTZ NOT NULL
);
