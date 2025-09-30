// SecretInvest contract on Sepolia (replace after deploy)
export const CONTRACT_ADDRESS = '0x187816B1d7983a8F629657DC966559CB1Ef00d9f';

// ABI for SecretInvest
export const CONTRACT_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [], "name": "UNIT_PRICE_WEI", "outputs": [{"internalType":"uint256","name":"","type":"uint256"}], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [{"internalType":"address","name":"","type":"address"}], "stateMutability": "view", "type": "function" },
  { "inputs": [{"internalType":"address","name":"user","type":"address"}], "name": "getEncryptedBalance", "outputs": [{"internalType":"euint64","name":"","type":"bytes32"}], "stateMutability": "view", "type": "function" },
  { "inputs": [{"internalType":"address","name":"","type":"address"}], "name": "tokenPrice", "outputs": [{"internalType":"uint256","name":"","type":"uint256"}], "stateMutability": "view", "type": "function" },
  { "inputs": [{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"}], "name": "setTokenPrice", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{"internalType":"address","name":"token","type":"address"}], "name": "getTokenPrice", "outputs": [{"internalType":"uint256","name":"","type":"uint256"}], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "deposit", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [{"internalType":"uint256","name":"amount","type":"uint256"}], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{"internalType":"address","name":"user","type":"address"}], "name": "hasActivePosition", "outputs": [{"internalType":"bool","name":"","type":"bool"}], "stateMutability": "view", "type": "function" },
  { "inputs": [{"internalType":"address","name":"user","type":"address"}], "name": "getPosition", "outputs": [
      {"internalType":"address","name":"token","type":"address"},
      {"internalType":"euint32","name":"direction","type":"bytes32"},
      {"internalType":"euint32","name":"quantity","type":"bytes32"},
      {"internalType":"uint256","name":"openPrice","type":"uint256"},
      {"internalType":"uint256","name":"openedAt","type":"uint256"},
      {"internalType":"bool","name":"active","type":"bool"}
    ], "stateMutability": "view", "type": "function" },
  { "inputs": [
      {"internalType":"address","name":"token","type":"address"},
      {"internalType":"externalEuint32","name":"directionHandle","type":"bytes32"},
      {"internalType":"externalEuint32","name":"quantityHandle","type":"bytes32"},
      {"internalType":"externalEuint64","name":"stakeHandle","type":"bytes32"},
      {"internalType":"bytes","name":"inputProof","type":"bytes"}
    ], "name": "openPosition", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [
      {"internalType":"uint32","name":"clearQuantity","type":"uint32"},
      {"internalType":"uint32","name":"clearDirection","type":"uint32"}
    ], "name": "closePosition", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{"internalType":"address","name":"newOwner","type":"address"}], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "anonymous": false, "inputs": [
      {"indexed": true, "internalType":"address","name":"previousOwner","type":"address"},
      {"indexed": true, "internalType":"address","name":"newOwner","type":"address"}
    ], "name": "OwnershipTransferred", "type": "event" },
  { "anonymous": false, "inputs": [
      {"indexed": true, "internalType":"address","name":"user","type":"address"},
      {"indexed": false, "internalType":"uint256","name":"amount","type":"uint256"}
    ], "name": "Deposited", "type": "event" },
  { "anonymous": false, "inputs": [
      {"indexed": true, "internalType":"address","name":"user","type":"address"},
      {"indexed": false, "internalType":"uint256","name":"amount","type":"uint256"}
    ], "name": "Withdrawn", "type": "event" },
  { "anonymous": false, "inputs": [
      {"indexed": true, "internalType":"address","name":"user","type":"address"},
      {"indexed": true, "internalType":"address","name":"token","type":"address"},
      {"indexed": false, "internalType":"uint256","name":"cost","type":"uint256"},
      {"indexed": false, "internalType":"uint256","name":"openPrice","type":"uint256"}
    ], "name": "PositionOpened", "type": "event" },
  { "anonymous": false, "inputs": [
      {"indexed": true, "internalType":"address","name":"user","type":"address"},
      {"indexed": true, "internalType":"address","name":"token","type":"address"},
      {"indexed": false, "internalType":"bool","name":"win","type":"bool"},
      {"indexed": false, "internalType":"uint256","name":"payout","type":"uint256"}
    ], "name": "PositionClosed", "type": "event" },
  { "anonymous": false, "inputs": [
      {"indexed": true, "internalType":"address","name":"token","type":"address"},
      {"indexed": false, "internalType":"uint256","name":"price","type":"uint256"}
    ], "name": "TokenPriceUpdated", "type": "event" }
] as const;

// Predefined sample token addresses (fake) for selection in UI
export const TOKENS = [
  '0xa9fb0c21e4d3b7f5a8c2d1e3f4b5a6c7d8e9f0a1',
  '0x7c3e2a19b5f4d6c8a1e0b2d3c4f5a6978e1d2c3b',
  '0x5b1d3f7a9c2e4d6f8a0b1c2d3e4f5061728394ab',
  '0xd4c3b2a1908f7e6d5c4b3a291817263544332211',
  '0x2e9f8d7c6b5a4c3d2b1a09182736455463728190',
] as const;
