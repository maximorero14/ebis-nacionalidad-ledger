-- M6.5: single-row cursor for the registry event projection (case_projection, created in
-- V1). Storing it as a row rather than an application-memory field means the projection
-- resumes correctly across restarts without reprocessing the whole event history.
CREATE TABLE projection_cursor (
    cursor_name        VARCHAR(64) PRIMARY KEY,
    last_processed_block NUMERIC(78, 0) NOT NULL,
    updated_at         TIMESTAMPTZ NOT NULL
);
