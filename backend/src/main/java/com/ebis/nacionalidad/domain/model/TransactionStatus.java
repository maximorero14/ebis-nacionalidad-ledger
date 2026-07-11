package com.ebis.nacionalidad.domain.model;

/**
 * Lifecycle of a submitted transaction. {@code PENDING} is recorded the moment it is
 * broadcast (before waiting for a receipt), so a concurrent reader can observe it via
 * {@code GET /transactions/{hash}} even while another request is still waiting on the
 * same or a different transaction. {@code TIMEOUT} means the receipt did not arrive
 * within the configured polling window — not a failure, just an unknown outcome that
 * must be reconciled later by receipt, never resolved by blindly resubmitting.
 */
public enum TransactionStatus {
    PENDING,
    CONFIRMED,
    REVERTED,
    TIMEOUT
}
