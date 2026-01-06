// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ReliefStablecoin - permissioned stable token with beneficiary whitelisting and category spend controls
/// @notice Transfers are blocked except through controlled spending paths to enforce category limits and auditability.
contract ReliefStablecoin is ERC20, AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant MINT_ROLE = keccak256("MINT_ROLE");

    error NotWhitelisted();
    error CategoryDisabled();
    error OverCategoryLimit();
    error TransfersDisabled();

    struct Allowance {
        uint256 limit;
        uint256 spent;
    }

    mapping(address => bool) public isBeneficiary;
    mapping(bytes32 => bool) public isCategory;
    bytes32[] private _categories;
    mapping(bytes32 => uint256) private _categoryIndexPlus1;
    mapping(address => mapping(bytes32 => Allowance)) public allowances;

    bool private _inControlledTransfer;

    event BeneficiaryUpdated(address indexed account, bool whitelisted);
    event CategoryAdded(bytes32 indexed category);
    event CategoryRemoved(bytes32 indexed category);
    event AllowanceSet(address indexed beneficiary, bytes32 indexed category, uint256 limit);
    event Minted(address indexed to, uint256 amount);
    event Spent(
        address indexed beneficiary,
        address indexed merchant,
        bytes32 indexed category,
        uint256 amount,
        string memo
    );

    constructor(string memory name_, string memory symbol_, address admin) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
        _grantRole(MINT_ROLE, admin);
    }

    // --- admin/manager actions ---

    function setBeneficiary(address account, bool allowed) external onlyRole(MANAGER_ROLE) {
        isBeneficiary[account] = allowed;
        emit BeneficiaryUpdated(account, allowed);
    }

    function addCategory(bytes32 category) external onlyRole(MANAGER_ROLE) {
        if (isCategory[category]) return; // idempotent
        isCategory[category] = true;
        _categories.push(category);
        _categoryIndexPlus1[category] = _categories.length;
        emit CategoryAdded(category);
    }

    function removeCategory(bytes32 category) external onlyRole(MANAGER_ROLE) {
        if (!isCategory[category]) return;
        isCategory[category] = false;
        uint256 idxPlus = _categoryIndexPlus1[category];
        if (idxPlus > 0) {
            uint256 idx = idxPlus - 1;
            uint256 last = _categories.length - 1;
            if (idx != last) {
                bytes32 lastCat = _categories[last];
                _categories[idx] = lastCat;
                _categoryIndexPlus1[lastCat] = idx + 1;
            }
            _categories.pop();
            _categoryIndexPlus1[category] = 0;
        }
        emit CategoryRemoved(category);
    }

    function setAllowance(address beneficiary, bytes32 category, uint256 limit) external onlyRole(MANAGER_ROLE) {
        if (!isBeneficiary[beneficiary]) revert NotWhitelisted();
        if (!isCategory[category]) revert CategoryDisabled();
        allowances[beneficiary][category].limit = limit;
        if (allowances[beneficiary][category].spent > limit) {
            allowances[beneficiary][category].spent = limit; // clamp to limit
        }
        emit AllowanceSet(beneficiary, category, limit);
    }

    function mintTo(address beneficiary, uint256 amount) external onlyRole(MINT_ROLE) {
        if (!isBeneficiary[beneficiary]) revert NotWhitelisted();
        _controlledMint(beneficiary, amount);
        emit Minted(beneficiary, amount);
    }

    /// @notice Manager can recover/move funds between addresses (still subject to transfer guard bypass)
    function adminTransfer(address from, address to, uint256 amount) external onlyRole(MANAGER_ROLE) {
        _controlledTransfer(from, to, amount);
    }

    // --- spending ---

    function spend(bytes32 category, address merchant, uint256 amount, string calldata memo) external {
        if (!isBeneficiary[msg.sender]) revert NotWhitelisted();
        if (!isCategory[category]) revert CategoryDisabled();
        Allowance storage a = allowances[msg.sender][category];
        if (amount == 0) revert OverCategoryLimit();
        if (a.spent + amount > a.limit) revert OverCategoryLimit();
        a.spent += amount;
        _controlledTransfer(msg.sender, merchant, amount);
        emit Spent(msg.sender, merchant, category, amount, memo);
    }

    function getCategories() external view returns (bytes32[] memory) {
        return _categories;
    }

    function allowanceInfo(address beneficiary, bytes32 category) external view returns (uint256 limit, uint256 spent) {
        Allowance memory a = allowances[beneficiary][category];
        return (a.limit, a.spent);
    }

    // --- internal guarded transfer helpers ---

    function _controlledTransfer(address from, address to, uint256 amount) internal {
        _inControlledTransfer = true;
        _update(from, to, amount);
        _inControlledTransfer = false;
    }

    function _controlledMint(address to, uint256 amount) internal {
        _inControlledTransfer = true;
        _update(address(0), to, amount);
        _inControlledTransfer = false;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (!_inControlledTransfer && from != address(0) && to != address(0)) {
            revert TransfersDisabled();
        }
        super._update(from, to, value);
    }
}
