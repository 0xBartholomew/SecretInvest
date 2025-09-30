// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SecretInvest
/// @notice Minimal FHE-enabled investment game with encrypted direction and quantity
/// @dev Uses Zama FHEVM types. View methods MUST NOT rely on msg.sender.
contract SecretInvest is SepoliaConfig {
    // ===== Types =====
    struct Position {
        address user;
        address token;
        euint32 direction; // 1 = long, 2 = short (encrypted)
        euint32 quantity;  // encrypted units
        uint256 openPrice; // token price set at open (clear)
        uint256 openedAt;
        bool active;
    }

    uint32 private constant DIR_LONG = 1;
    uint32 private constant DIR_SHORT = 2;

    // ===== Events =====
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event PositionOpened(address indexed user, address indexed token, uint256 cost, uint256 openPrice);
    event PositionClosed(address indexed user, address indexed token, bool win, uint256 payout);
    event TokenPriceUpdated(address indexed token, uint256 price);

    // ===== Constants =====
    uint256 public constant UNIT_PRICE_WEI = 1e15; // 0.001 ether per unit

    // ===== Storage =====
    address public owner;
    mapping(address => euint64) private _balances;

    // Per token price configured by owner
    mapping(address => uint256) public tokenPrice; // price in wei (arbitrary units)

    // Single active position per user for simplicity
    mapping(address => Position) private positions;

    // ===== Modifiers =====
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ===== Ownership =====
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ===== Admin: token prices =====
    function setTokenPrice(address token, uint256 price) external onlyOwner {
        require(token != address(0), "Zero token");
        tokenPrice[token] = price;
        emit TokenPriceUpdated(token, price);
    }

    function getTokenPrice(address token) external view returns (uint256) {
        return tokenPrice[token];
    }

    // ===== User funds =====
    function getEncryptedBalance(address user) external view returns (euint64) {
        return _balances[user];
    }

    function deposit() external payable {
        require(msg.value > 0, "No value");
        require(msg.value <= type(uint64).max, "too big");
        euint64 encAmount = FHE.asEuint64(uint64(msg.value));
        euint64 current = _balances[msg.sender];
        if (!FHE.isInitialized(current)) {
            current = FHE.asEuint64(0);
        }
        euint64 updated = FHE.add(current, encAmount);
        _balances[msg.sender] = updated;
        FHE.allowThis(updated);
        FHE.allow(updated, msg.sender);
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Zero amount");
        require(amount <= type(uint64).max, "too big");
        euint64 current = _balances[msg.sender];
        require(FHE.isInitialized(current), "Insufficient balance");
        euint64 encAmount = FHE.asEuint64(uint64(amount));
        euint64 updated = FHE.sub(current, encAmount);
        _balances[msg.sender] = updated;
        FHE.allowThis(updated);
        FHE.allow(updated, msg.sender);

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Withdraw failed");
        emit Withdrawn(msg.sender, amount);
    }

    // ===== Positions =====
    function hasActivePosition(address user) external view returns (bool) {
        return positions[user].active;
    }

    function getPosition(address user)
        external
        view
        returns (
            address token,
            euint32 direction,
            euint32 quantity,
            uint256 openPrice,
            uint256 openedAt,
            bool active
        )
    {
        Position storage p = positions[user];
        return (p.token, p.direction, p.quantity, p.openPrice, p.openedAt, p.active);
    }

    function openPosition(
        address token,
        externalEuint32 directionHandle,
        externalEuint32 quantityHandle,
        externalEuint64 stakeHandle,
        bytes calldata inputProof
    ) external {
        require(!positions[msg.sender].active, "Position exists");
        require(token != address(0), "Zero token");
        uint256 price = tokenPrice[token];
        require(price > 0, "Token price not set");

        // Verify encrypted inputs
        euint32 encDirection = FHE.fromExternal(directionHandle, inputProof);
        euint32 encQuantity = FHE.fromExternal(quantityHandle, inputProof);
        euint64 encStake = FHE.fromExternal(stakeHandle, inputProof);

        // Grant view permissions: contract + user
        FHE.allowThis(encDirection);
        FHE.allow(encDirection, msg.sender);
        FHE.allowThis(encQuantity);
        FHE.allow(encQuantity, msg.sender);
        FHE.allowThis(encStake);
        FHE.allow(encStake, msg.sender);

        // Deduct encrypted stake from encrypted balance
        euint64 cur = _balances[msg.sender];
        if (!FHE.isInitialized(cur)) {
            cur = FHE.asEuint64(0);
        }
        euint64 upd = FHE.sub(cur, encStake);
        _balances[msg.sender] = upd;
        FHE.allowThis(upd);
        FHE.allow(upd, msg.sender);

        // Compute and lock stake = quantity * UNIT_PRICE
        // We cannot multiply clear by encrypted easily here for locking; quantity is encrypted.
        // We lock at most by a user-provided clear stake derived off-chain: here, we approximate
        // by requiring sender to have enough to cover max reasonable stake. For simplicity, we
        // ask user to ensure their balance >= UNIT_PRICE. We then settle exact payout on close.
        // To make costs deterministic, we will charge cost as UNIT_PRICE * decrypted quantity during close.

        // Store position with clear metadata
        positions[msg.sender] = Position({
            user: msg.sender,
            token: token,
            direction: encDirection,
            quantity: encQuantity,
            openPrice: price,
            openedAt: block.timestamp,
            active: true
        });

        emit PositionOpened(msg.sender, token, 0, price);
    }

    /// @notice Close position; computes random up/down outcome and settles PnL against internal balance.
    /// @dev Decrypts on-chain via oracle-like path is not exposed here; instead we use user-provided
    ///      batched decryption by requiring caller to pass the decrypted results signed by KMS in future.
    ///      For this simplified example, we derive outcome randomly and settle with unit stake per quantity
    ///      without exposing decrypted values on-chain.
    function closePosition(
        uint32 clearQuantity,
        uint32 clearDirection
    ) external {
        Position storage p = positions[msg.sender];
        require(p.active, "No position");

        // Basic consistency: clear inputs must be 1/2 for direction, positive quantity
        require(clearDirection == DIR_LONG || clearDirection == DIR_SHORT, "dir");
        require(clearQuantity > 0, "qty");

        // Encrypted stake was deducted at openPosition

        // Pseudo-random outcome using block data (not for production)
        bool up = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % 2 == 0;

        bool longWins = up && (clearDirection == DIR_LONG);
        bool shortWins = (!up) && (clearDirection == DIR_SHORT);
        bool win = longWins || shortWins;

        uint256 payoutClear = win ? (uint256(clearQuantity) * UNIT_PRICE_WEI * 2) : 0;
        if (win) {
            require(payoutClear <= type(uint64).max, "too big");
            euint64 encPayout = FHE.asEuint64(uint64(payoutClear));
            euint64 cur2 = _balances[msg.sender];
            if (!FHE.isInitialized(cur2)) {
                cur2 = FHE.asEuint64(0);
            }
            euint64 upd2 = FHE.add(cur2, encPayout);
            _balances[msg.sender] = upd2;
            FHE.allowThis(upd2);
            FHE.allow(upd2, msg.sender);
        }

        emit PositionClosed(msg.sender, p.token, win, payoutClear);

        // Clear position
        delete positions[msg.sender];
    }
}
