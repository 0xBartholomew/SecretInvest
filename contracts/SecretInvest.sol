// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint8, externalEuint32, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract SecretInvest is SepoliaConfig {
    address public owner;
    uint256 public constant PRICE_PER_UNIT = 0.001 ether;

    struct Position {
        address tokenAddress;
        euint8 direction; // 1 for long, 2 for short
        euint32 amount;
        uint256 entryPrice;
        uint256 timestamp;
        bool isActive;
    }

    mapping(address => uint256) public userBalances;
    mapping(address => uint256) public tokenPrices;
    mapping(address => Position[]) public userPositions;
    mapping(address => uint256) public userPositionCount;

    uint256 private latestRequestId;
    bool public isDecryptionPending;

    event Deposit(address indexed user, uint256 amount);
    event PositionOpened(address indexed user, address indexed token, uint256 positionId);
    event PositionClosed(address indexed user, uint256 positionId, int256 pnl);
    event TokenPriceUpdated(address indexed token, uint256 price);
    event DecryptionRequested(uint256 requestId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        userBalances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        userBalances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }

    function setTokenPrice(address tokenAddress, uint256 price) external onlyOwner {
        require(price > 0, "Price must be greater than 0");
        tokenPrices[tokenAddress] = price;
        emit TokenPriceUpdated(tokenAddress, price);
    }

    function openPosition(
        address tokenAddress,
        externalEuint8 encryptedDirection,
        externalEuint32 encryptedAmount,
        bytes calldata inputProof
    ) external {
        require(tokenPrices[tokenAddress] > 0, "Token price not set");

        euint8 direction = FHE.fromExternal(encryptedDirection, inputProof);
        euint32 amount = FHE.fromExternal(encryptedAmount, inputProof);

        uint256 totalCost = PRICE_PER_UNIT;
        require(userBalances[msg.sender] >= totalCost, "Insufficient balance");

        userBalances[msg.sender] -= totalCost;

        Position memory newPosition = Position({
            tokenAddress: tokenAddress,
            direction: direction,
            amount: amount,
            entryPrice: tokenPrices[tokenAddress],
            timestamp: block.timestamp,
            isActive: true
        });

        userPositions[msg.sender].push(newPosition);
        uint256 positionId = userPositionCount[msg.sender];
        userPositionCount[msg.sender]++;

        FHE.allowThis(direction);
        FHE.allow(direction, msg.sender);
        FHE.allowThis(amount);
        FHE.allow(amount, msg.sender);

        emit PositionOpened(msg.sender, tokenAddress, positionId);
    }

    function closePosition(uint256 positionId) external {
        require(positionId < userPositionCount[msg.sender], "Invalid position ID");
        require(userPositions[msg.sender][positionId].isActive, "Position already closed");

        Position storage position = userPositions[msg.sender][positionId];
        position.isActive = false;

        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(position.direction);
        cts[1] = FHE.toBytes32(position.amount);

        latestRequestId = FHE.requestDecryption(cts, this.decryptionCallback.selector);
        isDecryptionPending = true;

        emit DecryptionRequested(latestRequestId);
    }

    function decryptionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) public returns (bool) {
        require(requestId == latestRequestId, "Invalid requestId");
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        (uint8 direction, uint32 amount) = abi.decode(cleartexts, (uint8, uint32));

        // Find the position that was being closed
        // This is simplified - in production you'd need better tracking
        for (uint256 i = userPositionCount[msg.sender]; i > 0; i--) {
            Position storage position = userPositions[msg.sender][i-1];
            if (!position.isActive) {
                uint256 currentPrice = generateRandomPrice(position.entryPrice);
                tokenPrices[position.tokenAddress] = currentPrice;

                int256 pnl = calculatePnL(
                    direction,
                    amount,
                    position.entryPrice,
                    currentPrice
                );

                if (pnl > 0) {
                    userBalances[msg.sender] += uint256(pnl);
                } else if (pnl < 0 && userBalances[msg.sender] >= uint256(-pnl)) {
                    userBalances[msg.sender] -= uint256(-pnl);
                }

                emit PositionClosed(msg.sender, i-1, pnl);
                break;
            }
        }

        isDecryptionPending = false;
        return true;
    }

    function calculatePnL(
        uint8 direction,
        uint32 amount,
        uint256 entryPrice,
        uint256 exitPrice
    ) internal pure returns (int256) {
        int256 priceDiff = int256(exitPrice) - int256(entryPrice);

        if (direction == 1) { // Long position
            return (priceDiff * int256(uint256(amount))) / int256(entryPrice);
        } else { // Short position
            return (-priceDiff * int256(uint256(amount))) / int256(entryPrice);
        }
    }

    function generateRandomPrice(uint256 basePrice) internal view returns (uint256) {
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender
        )));

        int256 changePercent = int256(randomSeed % 21) - 10; // -10% to +10%
        int256 newPrice = int256(basePrice) + (int256(basePrice) * changePercent / 100);

        return newPrice > 0 ? uint256(newPrice) : basePrice;
    }

    function getUserBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }

    function getUserPositionCount(address user) external view returns (uint256) {
        return userPositionCount[user];
    }

    function getUserPosition(address user, uint256 positionId) external view returns (
        address tokenAddress,
        euint8 direction,
        euint32 amount,
        uint256 entryPrice,
        uint256 timestamp,
        bool isActive
    ) {
        require(positionId < userPositionCount[user], "Invalid position ID");
        Position memory position = userPositions[user][positionId];

        return (
            position.tokenAddress,
            position.direction,
            position.amount,
            position.entryPrice,
            position.timestamp,
            position.isActive
        );
    }

    function getTokenPrice(address tokenAddress) external view returns (uint256) {
        return tokenPrices[tokenAddress];
    }
}