// SPDX-License-Identifier: MIT
pragma solidity 0.8.31;

interface INationalityCredential {
    function mintForCase(uint256 caseId, address holder) external returns (uint256 tokenId);
}
