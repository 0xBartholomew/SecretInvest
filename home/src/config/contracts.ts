// SecretInvest contract on Sepolia (replace after deploy)
export const CONTRACT_ADDRESS = '0x7B0f7d142Fbf2F3245af337D6836F47AfBa77a4B';

// ABI for SecretInvest
export const CONTRACT_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [], "name": "UNIT_PRICE_WEI", "outputs": [{"internalType":"uint256","name":"","type":"uint256"}], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [{"internalType":"address","name":"","type":"address"}], "stateMutability": "view", "type": "function" },
  { "inputs": [{"internalType":"address","name":"","type":"address"}], "name": "balances", "outputs": [{"internalType":"uint256","name":"","type":"uint256"}], "stateMutability": "view", "type": "function" },
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
