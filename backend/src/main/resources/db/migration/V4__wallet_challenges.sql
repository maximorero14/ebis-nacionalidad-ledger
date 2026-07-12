CREATE TABLE wallet_challenge (
    nonce VARCHAR(96) PRIMARY KEY,
    address VARCHAR(42) NOT NULL,
    chain_id BIGINT NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_wallet_challenge_address ON wallet_challenge(address);
CREATE INDEX idx_wallet_challenge_expires_at ON wallet_challenge(expires_at);
