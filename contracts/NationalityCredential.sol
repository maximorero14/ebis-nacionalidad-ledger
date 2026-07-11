// SPDX-License-Identifier: MIT
pragma solidity 0.8.31;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {INationalityCredential} from "./interfaces/INationalityCredential.sol";

contract NationalityCredential is AccessControl, INationalityCredential {
    struct CredentialData {
        uint256 caseId;
        address holder;
        bool revoked;
        bytes32 revocationReasonCode;
    }

    bytes32 public constant CREDENTIAL_ISSUER_ROLE = keccak256("CREDENTIAL_ISSUER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    string public constant name = "Demo Nationality Credential";
    string public constant symbol = "DNC";

    mapping(uint256 tokenId => CredentialData data) private credentials;
    mapping(uint256 caseId => uint256 tokenId) public tokenByCase;
    mapping(uint256 tokenId => address owner) private owners;
    mapping(address owner => uint256 balance) private balances;

    error Unauthorized(address actor, bytes32 role);
    error ZeroAddress();
    error InvalidCase(uint256 caseId);
    error InvalidReasonCode(bytes32 code);
    error CredentialAlreadyIssued(uint256 caseId, uint256 tokenId);
    error CredentialNotFound(uint256 tokenId);
    error CredentialAlreadyRevoked(uint256 tokenId);
    error SoulboundTransferBlocked();

    event CredentialIssued(uint256 indexed caseId, uint256 indexed tokenId, address indexed holder);
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

    function mintForCase(uint256 caseId, address holder) external returns (uint256 tokenId) {
        _requireRole(CREDENTIAL_ISSUER_ROLE);
        if (caseId == 0) {
            revert InvalidCase(caseId);
        }
        if (holder == address(0)) {
            revert ZeroAddress();
        }

        tokenId = caseId;
        if (owners[tokenId] != address(0) || tokenByCase[caseId] != 0) {
            revert CredentialAlreadyIssued(caseId, tokenId);
        }

        tokenByCase[caseId] = tokenId;
        credentials[tokenId] = CredentialData({
            caseId: caseId,
            holder: holder,
            revoked: false,
            revocationReasonCode: bytes32(0)
        });

        owners[tokenId] = holder;
        unchecked {
            balances[holder] += 1;
        }
        emit Transfer(address(0), holder, tokenId);
        emit CredentialIssued(caseId, tokenId, holder);
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
        CredentialData storage data = credentials[tokenId];
        return data.holder != address(0) && !data.revoked;
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

        string memory status = data.revoked ? "revoked" : "active";
        return
            string.concat(
                "demo-nationality-credential://",
                _toString(tokenId),
                "?caseId=",
                _toString(data.caseId),
                "&status=",
                status
            );
    }

    function demoMetadata(uint256 tokenId) external view returns (string memory) {
        CredentialData storage data = credentials[tokenId];
        if (data.holder == address(0)) {
            revert CredentialNotFound(tokenId);
        }

        string memory status = data.revoked ? "revoked" : "active";
        /* solhint-disable quotes */
        return
            string.concat(
                '{"name":"Demo Nationality Credential #',
                _toString(tokenId),
                '","description":"Demonstration credential for the ebis nationality ledger TFM.',
                ' It is not an official credential and contains no personal data.",',
                '"attributes":[{"trait_type":"case_id","value":"',
                _toString(data.caseId),
                '"},{"trait_type":"status","value":"',
                status,
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
