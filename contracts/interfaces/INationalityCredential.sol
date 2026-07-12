// SPDX-License-Identifier: MIT
pragma solidity 0.8.31;

interface INationalityCredential {
    function mintForCase(
        uint256 caseId,
        address holder,
        uint64 expiresAt,
        bytes32 dataCommitment,
        uint16 schemaVersion
    ) external returns (uint256 tokenId);

    function renew(
        uint256 tokenId,
        uint64 newExpiresAt,
        bytes32 newDataCommitment,
        uint16 newSchemaVersion
    ) external;
}
