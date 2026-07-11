package com.ebis.nacionalidad.domain.model;

/**
 * Application-level role of an authenticated demo user. Distinct from the on-chain
 * AccessControl roles in NationalityCaseRegistry/NationalityCredential, though each demo
 * identity's EVM address is expected to hold the matching on-chain role (see M5.1).
 */
public enum ApplicationRole {
    CITIZEN,
    FOREIGN_AFFAIRS,
    POLICE,
    CREDENTIAL_ISSUER
}
