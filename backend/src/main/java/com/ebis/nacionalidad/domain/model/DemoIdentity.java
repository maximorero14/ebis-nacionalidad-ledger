package com.ebis.nacionalidad.domain.model;

/**
 * A fixed demo user account. {@code passwordHash} is a BCrypt hash, never the raw
 * password. {@code evmAddress} is the EVM account this identity is authorized to act as
 * (see blockchain/besu/README.md for how these demo addresses are derived).
 */
public record DemoIdentity(
        String username, String passwordHash, ApplicationRole role, String evmAddress) {}
