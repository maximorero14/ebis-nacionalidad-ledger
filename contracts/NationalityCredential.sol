// SPDX-License-Identifier: MIT
pragma solidity 0.8.31;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {INationalityCredential} from "./interfaces/INationalityCredential.sol";

contract NationalityCredential is AccessControl, INationalityCredential {
    enum CredentialStatus {
        NONE,
        ACTIVE,
        EXPIRED,
        REVOKED
    }

    struct CredentialData {
        uint256 caseId;
        address holder;
        uint64 issuedAt;
        uint64 expiresAt;
        uint32 dataVersion;
        uint16 schemaVersion;
        bool revoked;
        bytes32 revocationReasonCode;
        bytes32 dataCommitment;
    }

    bytes32 public constant CREDENTIAL_ISSUER_ROLE = keccak256("CREDENTIAL_ISSUER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    string public constant name = "Demo Nationality Credential";
    string public constant symbol = "DNC";
    uint64 public constant MAX_VALIDITY_SECONDS = 10 * 365 days;

    mapping(uint256 tokenId => CredentialData data) private credentials;
    mapping(uint256 caseId => uint256 tokenId) public tokenByCase;
    mapping(uint256 tokenId => address owner) private owners;
    mapping(address owner => uint256 balance) private balances;

    error Unauthorized(address actor, bytes32 role);
    error ZeroAddress();
    error InvalidCase(uint256 caseId);
    error InvalidExpiry(uint64 expiresAt);
    error InvalidDataCommitment();
    error InvalidSchemaVersion(uint16 schemaVersion);
    error InvalidReasonCode(bytes32 code);
    error CredentialAlreadyIssued(uint256 caseId, uint256 tokenId);
    error CredentialNotFound(uint256 tokenId);
    error CredentialAlreadyRevoked(uint256 tokenId);
    error SoulboundTransferBlocked();

    event CredentialIssued(
        uint256 indexed caseId,
        uint256 indexed tokenId,
        address indexed holder,
        uint64 issuedAt,
        uint64 expiresAt,
        uint32 dataVersion,
        uint16 schemaVersion,
        bytes32 dataCommitment
    );
    event CredentialRenewed(
        uint256 indexed tokenId,
        address indexed actor,
        uint64 expiresAt,
        uint32 dataVersion,
        uint16 schemaVersion,
        bytes32 dataCommitment
    );
    event CredentialRevoked(uint256 indexed tokenId, address indexed actor, bytes32 reasonCode);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor(address admin) {
        if (admin == address(0)) {
            revert ZeroAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CREDENTIAL_ISSUER_ROLE, admin);
        _grantRole(REVOKER_ROLE, admin);
    }

    function mintForCase(
        uint256 caseId,
        address holder,
        uint64 expiresAt,
        bytes32 dataCommitment,
        uint16 schemaVersion
    ) external returns (uint256 tokenId) {
        _requireRole(CREDENTIAL_ISSUER_ROLE);
        if (caseId == 0) {
            revert InvalidCase(caseId);
        }
        if (holder == address(0)) {
            revert ZeroAddress();
        }
        _requireValidExpiry(expiresAt);
        _requireDataCommitment(dataCommitment);
        _requireSchemaVersion(schemaVersion);

        tokenId = caseId;
        if (owners[tokenId] != address(0) || tokenByCase[caseId] != 0) {
            revert CredentialAlreadyIssued(caseId, tokenId);
        }

        uint64 issuedAt = uint64(block.timestamp);
        uint32 dataVersion = 1;
        tokenByCase[caseId] = tokenId;
        credentials[tokenId] = CredentialData({
            caseId: caseId,
            holder: holder,
            issuedAt: issuedAt,
            expiresAt: expiresAt,
            dataVersion: dataVersion,
            schemaVersion: schemaVersion,
            revoked: false,
            revocationReasonCode: bytes32(0),
            dataCommitment: dataCommitment
        });

        owners[tokenId] = holder;
        unchecked {
            balances[holder] += 1;
        }
        emit Transfer(address(0), holder, tokenId);
        emit CredentialIssued(
            caseId,
            tokenId,
            holder,
            issuedAt,
            expiresAt,
            dataVersion,
            schemaVersion,
            dataCommitment
        );
    }

    function renew(
        uint256 tokenId,
        uint64 newExpiresAt,
        bytes32 newDataCommitment,
        uint16 newSchemaVersion
    ) external {
        _requireRole(CREDENTIAL_ISSUER_ROLE);
        _requireValidExpiry(newExpiresAt);
        _requireDataCommitment(newDataCommitment);
        _requireSchemaVersion(newSchemaVersion);

        CredentialData storage data = credentials[tokenId];
        if (data.holder == address(0)) {
            revert CredentialNotFound(tokenId);
        }
        if (data.revoked) {
            revert CredentialAlreadyRevoked(tokenId);
        }

        unchecked {
            data.dataVersion += 1;
        }
        data.expiresAt = newExpiresAt;
        data.schemaVersion = newSchemaVersion;
        data.dataCommitment = newDataCommitment;

        emit CredentialRenewed(
            tokenId,
            msg.sender,
            newExpiresAt,
            data.dataVersion,
            newSchemaVersion,
            newDataCommitment
        );
    }

    function revoke(uint256 tokenId, bytes32 reasonCode) external {
        _requireRole(REVOKER_ROLE);
        if (reasonCode == bytes32(0)) {
            revert InvalidReasonCode(reasonCode);
        }

        CredentialData storage data = credentials[tokenId];
        if (data.holder == address(0)) {
            revert CredentialNotFound(tokenId);
        }
        if (data.revoked) {
            revert CredentialAlreadyRevoked(tokenId);
        }

        data.revoked = true;
        data.revocationReasonCode = reasonCode;
        emit CredentialRevoked(tokenId, msg.sender, reasonCode);
    }

    function isValid(uint256 tokenId) external view returns (bool) {
        return statusOf(tokenId) == CredentialStatus.ACTIVE;
    }

    function statusOf(uint256 tokenId) public view returns (CredentialStatus) {
        CredentialData storage data = credentials[tokenId];
        if (data.holder == address(0)) {
            return CredentialStatus.NONE;
        }
        if (data.revoked) {
            return CredentialStatus.REVOKED;
        }
        if (block.timestamp >= data.expiresAt) {
            return CredentialStatus.EXPIRED;
        }
        return CredentialStatus.ACTIVE;
    }

    function credentialData(uint256 tokenId) external view returns (CredentialData memory) {
        CredentialData memory data = credentials[tokenId];
        if (data.holder == address(0)) {
            revert CredentialNotFound(tokenId);
        }
        return data;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = owners[tokenId];
        if (owner == address(0)) {
            revert CredentialNotFound(tokenId);
        }
        return owner;
    }

    function balanceOf(address holder) external view returns (uint256) {
        if (holder == address(0)) {
            revert ZeroAddress();
        }
        return balances[holder];
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        if (owners[tokenId] == address(0)) {
            revert CredentialNotFound(tokenId);
        }
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        CredentialData storage data = credentials[tokenId];
        if (data.holder == address(0)) {
            revert CredentialNotFound(tokenId);
        }

        string memory status = _statusLabel(statusOf(tokenId));
        return
            string.concat(
                "demo-nationality-credential://",
                _toString(tokenId),
                "?status=",
                status,
                "&issuedAt=",
                _toString(data.issuedAt),
                "&expiresAt=",
                _toString(data.expiresAt),
                "&schemaVersion=",
                _toString(data.schemaVersion)
            );
    }

    function demoMetadata(uint256 tokenId) external view returns (string memory) {
        CredentialData storage data = credentials[tokenId];
        if (data.holder == address(0)) {
            revert CredentialNotFound(tokenId);
        }

        string memory status = _statusLabel(statusOf(tokenId));
        /* solhint-disable quotes */
        return
            string.concat(
                '{"name":"Demo Nationality Credential #',
                _toString(tokenId),
                '","description":"Demonstration credential for the ebis nationality ledger TFM.',
                ' It is not an official credential and contains no personal data.",',
                '"attributes":[{"trait_type":"status","value":"',
                status,
                '"},{"trait_type":"issued_at","value":"',
                _toString(data.issuedAt),
                '"},{"trait_type":"expires_at","value":"',
                _toString(data.expiresAt),
                '"},{"trait_type":"schema_version","value":"',
                _toString(data.schemaVersion),
                '"}]}'
            );
        /* solhint-enable quotes */
    }

    function approve(address, uint256) public pure {
        revert SoulboundTransferBlocked();
    }

    function setApprovalForAll(address, bool) public pure {
        revert SoulboundTransferBlocked();
    }

    function transferFrom(address, address, uint256) public pure {
        revert SoulboundTransferBlocked();
    }

    function safeTransferFrom(address, address, uint256) public pure {
        revert SoulboundTransferBlocked();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure {
        revert SoulboundTransferBlocked();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl) returns (bool) {
        return
            interfaceId == 0x80ac58cd ||
            interfaceId == 0x5b5e139f ||
            super.supportsInterface(interfaceId);
    }

    function _requireRole(bytes32 role) private view {
        if (!hasRole(role, msg.sender)) {
            revert Unauthorized(msg.sender, role);
        }
    }

    function _requireValidExpiry(uint64 expiresAt) private view {
        if (expiresAt <= block.timestamp || expiresAt > block.timestamp + MAX_VALIDITY_SECONDS) {
            revert InvalidExpiry(expiresAt);
        }
    }

    function _requireDataCommitment(bytes32 dataCommitment) private pure {
        if (dataCommitment == bytes32(0)) {
            revert InvalidDataCommitment();
        }
    }

    function _requireSchemaVersion(uint16 schemaVersion) private pure {
        if (schemaVersion == 0) {
            revert InvalidSchemaVersion(schemaVersion);
        }
    }

    function _statusLabel(CredentialStatus status) private pure returns (string memory) {
        if (status == CredentialStatus.ACTIVE) {
            return "active";
        }
        if (status == CredentialStatus.EXPIRED) {
            return "expired";
        }
        if (status == CredentialStatus.REVOKED) {
            return "revoked";
        }
        return "none";
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }

        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            unchecked {
                ++digits;
                temp /= 10;
            }
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            unchecked {
                --digits;
                buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
                value /= 10;
            }
        }

        return string(buffer);
    }
}
