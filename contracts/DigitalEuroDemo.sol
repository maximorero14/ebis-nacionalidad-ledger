// SPDX-License-Identifier: MIT
pragma solidity 0.8.31;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title DigitalEuroDemo
/// @notice ERC-20 de demostracion para pagar tasas dentro del TFM. No representa dinero real.
contract DigitalEuroDemo is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant FAUCET_ROLE = keccak256("FAUCET_ROLE");
    bytes32 public constant FEE_COLLECTOR_ROLE = keccak256("FEE_COLLECTOR_ROLE");

    uint8 private constant TOKEN_DECIMALS = 2;
    uint256 public constant FAUCET_AMOUNT = 100_00;

    address public immutable treasury;
    bool public faucetEnabled;

    mapping(address account => bool claimed) public faucetClaimed;

    error ZeroAddress();
    error ZeroAmount();
    error FaucetDisabled();
    error FaucetAlreadyClaimed(address account);

    event DemoEuroMinted(address indexed operator, address indexed to, uint256 amount);
    event DemoFaucetClaimed(address indexed account, uint256 amount);
    event DemoFeeCollected(
        address indexed operator,
        address indexed payer,
        address indexed treasury,
        uint256 amount,
        bytes32 paymentReference
    );
    event FaucetStatusChanged(bool enabled);

    constructor(address admin, address treasury_) ERC20("Demo Digital Euro", "dEUR") {
        if (admin == address(0) || treasury_ == address(0)) {
            revert ZeroAddress();
        }

        treasury = treasury_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(FAUCET_ROLE, admin);
        _grantRole(FEE_COLLECTOR_ROLE, admin);
    }

    function decimals() public pure override returns (uint8) {
        return TOKEN_DECIMALS;
    }

    function mint(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) {
            revert ZeroAddress();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        _mint(to, amount);
        emit DemoEuroMinted(msg.sender, to, amount);
    }

    function setFaucetEnabled(bool enabled) external onlyRole(FAUCET_ROLE) {
        faucetEnabled = enabled;
        emit FaucetStatusChanged(enabled);
    }

    function claimFaucet() external {
        if (!faucetEnabled) {
            revert FaucetDisabled();
        }
        if (faucetClaimed[msg.sender]) {
            revert FaucetAlreadyClaimed(msg.sender);
        }

        faucetClaimed[msg.sender] = true;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit DemoFaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    function collectFeeFrom(
        address payer,
        uint256 amount,
        bytes32 paymentReference
    ) external onlyRole(FEE_COLLECTOR_ROLE) {
        if (payer == address(0)) {
            revert ZeroAddress();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        _spendAllowance(payer, msg.sender, amount);
        _transfer(payer, treasury, amount);

        emit DemoFeeCollected(msg.sender, payer, treasury, amount, paymentReference);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
