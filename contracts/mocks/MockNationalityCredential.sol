// SPDX-License-Identifier: MIT
pragma solidity 0.8.31;

import {INationalityCredential} from "../interfaces/INationalityCredential.sol";

contract MockNationalityCredential is INationalityCredential {
    mapping(uint256 caseId => address holder) public holderByCase;
    mapping(uint256 tokenId => bool minted) public mintedToken;

    error CredentialAlreadyIssued(uint256 caseId, uint256 tokenId);

    event MockCredentialIssued(
        uint256 indexed caseId,
        uint256 indexed tokenId,
        address indexed holder
    );

    function mintForCase(
        uint256 caseId,
        address holder,
        uint64,
        bytes32,
        uint16
    ) external returns (uint256 tokenId) {
        tokenId = caseId;
        if (mintedToken[tokenId]) {
            revert CredentialAlreadyIssued(caseId, tokenId);
        }

        mintedToken[tokenId] = true;
        holderByCase[caseId] = holder;
        emit MockCredentialIssued(caseId, tokenId, holder);
    }

    function renew(uint256, uint64, bytes32, uint16) external {}
}
