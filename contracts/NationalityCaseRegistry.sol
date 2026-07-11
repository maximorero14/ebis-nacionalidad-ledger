// SPDX-License-Identifier: MIT
pragma solidity 0.8.31;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {INationalityCredential} from "./interfaces/INationalityCredential.sol";

contract NationalityCaseRegistry is AccessControl {
    using SafeERC20 for IERC20;

    enum CaseStatus {
        NONE,
        CREATED,
        DOCUMENTS_SUBMITTED,
        FEE_PAID,
        IN_REVIEW,
        REMEDIATION_REQUIRED,
        APPROVED,
        REJECTED
    }

    enum ReviewRole {
        FOREIGN_AFFAIRS,
        POLICE
    }

    struct CaseData {
        address owner;
        CaseStatus status;
        uint64 reviewRound;
        bytes32 documentCommitment;
        bool feePaid;
        bool foreignAffairsApproved;
        bool policeApproved;
        uint256 credentialTokenId;
    }

    bytes32 public constant FOREIGN_AFFAIRS_ROLE = keccak256("FOREIGN_AFFAIRS_ROLE");
    bytes32 public constant POLICE_ROLE = keccak256("POLICE_ROLE");
    bytes32 public constant CREDENTIAL_ISSUER_ROLE = keccak256("CREDENTIAL_ISSUER_ROLE");

    IERC20 public immutable feeToken;
    address public immutable treasury;
    uint256 public immutable feeAmount;
    INationalityCredential public immutable credential;

    uint256 private nextCaseId = 1;
    mapping(uint256 caseId => CaseData data) private cases;

    error Unauthorized(address actor, bytes32 role);
    error InvalidCase(uint256 caseId);
    error InvalidStatus(uint256 caseId, CaseStatus current, CaseStatus expected);
    error NotCaseOwner(uint256 caseId, address actor);
    error EmptyCommitment();
    error FeeAlreadyPaid(uint256 caseId);
    error DocumentsMissing(uint256 caseId);
    error ApprovalAlreadyRecorded(uint256 caseId, ReviewRole role, uint64 round);
    error StaleReviewRound(uint256 caseId, uint64 provided, uint64 current);
    error InvalidReasonCode(bytes32 code);
    error TerminalCase(uint256 caseId, CaseStatus status);
    error CaseNotApproved(uint256 caseId);
    error CredentialAlreadyIssued(uint256 caseId, uint256 tokenId);
    error UnexpectedCredentialToken(uint256 caseId, uint256 tokenId);
    error ZeroAddress();
    error ZeroAmount();

    event CaseCreated(uint256 indexed caseId, address indexed owner);
    event DocumentsSubmitted(
        uint256 indexed caseId,
        address indexed owner,
        uint64 round,
        bytes32 documentCommitment
    );
    event FeePaid(
        uint256 indexed caseId,
        address indexed payer,
        uint256 amount,
        address indexed treasury
    );
    event CaseEnteredReview(uint256 indexed caseId, uint64 round);
    event RemediationRequested(
        uint256 indexed caseId,
        address indexed actor,
        uint64 nextRound,
        bytes32 reasonCode
    );
    event ForeignAffairsApproved(uint256 indexed caseId, address indexed actor, uint64 round);
    event PoliceApproved(uint256 indexed caseId, address indexed actor, uint64 round);
    event CaseApproved(uint256 indexed caseId, uint64 round);
    event CaseRejected(
        uint256 indexed caseId,
        address indexed actor,
        uint64 round,
        bytes32 reasonCode
    );
    event CredentialIssued(uint256 indexed caseId, uint256 indexed tokenId, address indexed holder);

    constructor(
        IERC20 feeToken_,
        address treasury_,
        uint256 feeAmount_,
        INationalityCredential credential_,
        address admin
    ) {
        if (
            address(feeToken_) == address(0) ||
            treasury_ == address(0) ||
            address(credential_) == address(0) ||
            admin == address(0)
        ) {
            revert ZeroAddress();
        }
        if (feeAmount_ == 0) {
            revert ZeroAmount();
        }

        feeToken = feeToken_;
        treasury = treasury_;
        feeAmount = feeAmount_;
        credential = credential_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FOREIGN_AFFAIRS_ROLE, admin);
        _grantRole(POLICE_ROLE, admin);
        _grantRole(CREDENTIAL_ISSUER_ROLE, admin);
    }

    function createCase() external returns (uint256 caseId) {
        caseId = nextCaseId++;
        cases[caseId].owner = msg.sender;
        cases[caseId].status = CaseStatus.CREATED;

        emit CaseCreated(caseId, msg.sender);
    }

    function submitDocuments(uint256 caseId, bytes32 documentCommitment) external {
        CaseData storage caseData = _existingCase(caseId);
        _requireCaseOwner(caseId, caseData);
        _requireNonTerminal(caseId, caseData.status);
        if (
            caseData.status != CaseStatus.CREATED &&
            caseData.status != CaseStatus.REMEDIATION_REQUIRED
        ) {
            revert InvalidStatus(caseId, caseData.status, CaseStatus.CREATED);
        }
        if (documentCommitment == bytes32(0)) {
            revert EmptyCommitment();
        }

        caseData.documentCommitment = documentCommitment;
        if (caseData.feePaid) {
            caseData.status = CaseStatus.IN_REVIEW;
        } else {
            caseData.status = CaseStatus.DOCUMENTS_SUBMITTED;
        }

        emit DocumentsSubmitted(caseId, msg.sender, caseData.reviewRound, documentCommitment);
        if (caseData.status == CaseStatus.IN_REVIEW) {
            emit CaseEnteredReview(caseId, caseData.reviewRound);
        }
    }

    function payFee(uint256 caseId) external {
        CaseData storage caseData = _existingCase(caseId);
        _requireCaseOwner(caseId, caseData);
        _requireNonTerminal(caseId, caseData.status);
        if (caseData.documentCommitment == bytes32(0)) {
            revert DocumentsMissing(caseId);
        }
        if (caseData.feePaid) {
            revert FeeAlreadyPaid(caseId);
        }
        if (caseData.status != CaseStatus.DOCUMENTS_SUBMITTED) {
            revert InvalidStatus(caseId, caseData.status, CaseStatus.DOCUMENTS_SUBMITTED);
        }

        caseData.feePaid = true;
        caseData.status = CaseStatus.IN_REVIEW;
        feeToken.safeTransferFrom(msg.sender, treasury, feeAmount);

        emit FeePaid(caseId, msg.sender, feeAmount, treasury);
        emit CaseEnteredReview(caseId, caseData.reviewRound);
    }

    function requestRemediation(uint256 caseId, bytes32 reasonCode) external {
        _requireInstitutionRole();
        _requireReasonCode(reasonCode);

        CaseData storage caseData = _existingCase(caseId);
        _requireStatus(caseId, caseData.status, CaseStatus.IN_REVIEW);

        caseData.reviewRound += 1;
        caseData.status = CaseStatus.REMEDIATION_REQUIRED;
        caseData.foreignAffairsApproved = false;
        caseData.policeApproved = false;

        emit RemediationRequested(caseId, msg.sender, caseData.reviewRound, reasonCode);
    }

    function approveForeignAffairs(uint256 caseId, uint64 round) external {
        _requireRole(FOREIGN_AFFAIRS_ROLE);
        CaseData storage caseData = _existingCase(caseId);
        _requireStatus(caseId, caseData.status, CaseStatus.IN_REVIEW);
        _requireCurrentRound(caseId, round, caseData.reviewRound);
        if (caseData.foreignAffairsApproved) {
            revert ApprovalAlreadyRecorded(caseId, ReviewRole.FOREIGN_AFFAIRS, round);
        }

        caseData.foreignAffairsApproved = true;
        emit ForeignAffairsApproved(caseId, msg.sender, round);
        _approveIfComplete(caseId, caseData);
    }

    function approvePolice(uint256 caseId, uint64 round) external {
        _requireRole(POLICE_ROLE);
        CaseData storage caseData = _existingCase(caseId);
        _requireStatus(caseId, caseData.status, CaseStatus.IN_REVIEW);
        _requireCurrentRound(caseId, round, caseData.reviewRound);
        if (caseData.policeApproved) {
            revert ApprovalAlreadyRecorded(caseId, ReviewRole.POLICE, round);
        }

        caseData.policeApproved = true;
        emit PoliceApproved(caseId, msg.sender, round);
        _approveIfComplete(caseId, caseData);
    }

    function rejectCase(uint256 caseId, bytes32 reasonCode) external {
        _requireInstitutionRole();
        _requireReasonCode(reasonCode);

        CaseData storage caseData = _existingCase(caseId);
        _requireStatus(caseId, caseData.status, CaseStatus.IN_REVIEW);

        caseData.status = CaseStatus.REJECTED;
        emit CaseRejected(caseId, msg.sender, caseData.reviewRound, reasonCode);
    }

    function issueCredential(uint256 caseId) external returns (uint256 tokenId) {
        _requireRole(CREDENTIAL_ISSUER_ROLE);

        CaseData storage caseData = _existingCase(caseId);
        if (caseData.status != CaseStatus.APPROVED) {
            revert CaseNotApproved(caseId);
        }
        if (caseData.credentialTokenId != 0) {
            revert CredentialAlreadyIssued(caseId, caseData.credentialTokenId);
        }

        caseData.credentialTokenId = caseId;
        tokenId = credential.mintForCase(caseId, caseData.owner);
        if (tokenId != caseId) {
            revert UnexpectedCredentialToken(caseId, tokenId);
        }
        emit CredentialIssued(caseId, tokenId, caseData.owner);
    }

    function getCase(uint256 caseId) external view returns (CaseData memory) {
        return _existingCaseView(caseId);
    }

    function currentRound(uint256 caseId) external view returns (uint64) {
        return _existingCaseView(caseId).reviewRound;
    }

    function _approveIfComplete(uint256 caseId, CaseData storage caseData) private {
        if (caseData.foreignAffairsApproved && caseData.policeApproved) {
            caseData.status = CaseStatus.APPROVED;
            emit CaseApproved(caseId, caseData.reviewRound);
        }
    }

    function _existingCase(uint256 caseId) private view returns (CaseData storage caseData) {
        caseData = cases[caseId];
        if (caseData.owner == address(0)) {
            revert InvalidCase(caseId);
        }
    }

    function _existingCaseView(uint256 caseId) private view returns (CaseData memory caseData) {
        caseData = cases[caseId];
        if (caseData.owner == address(0)) {
            revert InvalidCase(caseId);
        }
    }

    function _requireCaseOwner(uint256 caseId, CaseData storage caseData) private view {
        if (caseData.owner != msg.sender) {
            revert NotCaseOwner(caseId, msg.sender);
        }
    }

    function _requireStatus(uint256 caseId, CaseStatus current, CaseStatus expected) private pure {
        if (current != expected) {
            revert InvalidStatus(caseId, current, expected);
        }
    }

    function _requireNonTerminal(uint256 caseId, CaseStatus status) private pure {
        if (status == CaseStatus.APPROVED || status == CaseStatus.REJECTED) {
            revert TerminalCase(caseId, status);
        }
    }

    function _requireCurrentRound(uint256 caseId, uint64 provided, uint64 current) private pure {
        if (provided != current) {
            revert StaleReviewRound(caseId, provided, current);
        }
    }

    function _requireReasonCode(bytes32 reasonCode) private pure {
        if (reasonCode == bytes32(0)) {
            revert InvalidReasonCode(reasonCode);
        }
    }

    function _requireInstitutionRole() private view {
        if (hasRole(FOREIGN_AFFAIRS_ROLE, msg.sender) || hasRole(POLICE_ROLE, msg.sender)) {
            return;
        }
        revert Unauthorized(msg.sender, FOREIGN_AFFAIRS_ROLE);
    }

    function _requireRole(bytes32 role) private view {
        if (!hasRole(role, msg.sender)) {
            revert Unauthorized(msg.sender, role);
        }
    }
}
