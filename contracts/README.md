# Contracts

Solidity sources for M4 live here. The conceptual ABI is frozen in `docs/CONTRATOS.md`.

The implementation must keep personal data out of storage, events and metadata. Only opaque
commitments and demo identifiers are allowed on-chain.

`DigitalEuroDemo` is a didactic ERC-20 used only to model fee payment in the demo. It is not
money, legal tender, a CBDC, or an official digital euro.

`NationalityCaseRegistry` stores only ownership, state, opaque commitments, role approvals and
credential ids. It must not receive names, identity numbers, birth dates, document contents or
private URLs.

`NationalityCredential` is a soulbound-compatible ERC-721 surface for the demo credential. Its
metadata is intentionally minimal and must never include PII.
