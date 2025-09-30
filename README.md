# 🔐 SecretInvest

**A Privacy-Preserving Investment Platform Built on Fully Homomorphic Encryption (FHE)**

SecretInvest is a decentralized investment platform that leverages Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine) to enable users to trade token positions while keeping their trading direction (long/short) and position quantities completely private on-chain. This groundbreaking approach ensures that sensitive trading strategies remain confidential, even from validators and block explorers.

---

## 🌟 Overview

SecretInvest demonstrates the practical application of fully homomorphic encryption in DeFi, allowing users to:

- **Open encrypted trading positions** where direction (long/short) and quantity are fully encrypted on-chain
- **Maintain complete privacy** of trading strategies from all parties, including miners and validators
- **Settle positions** with encrypted balance management
- **Decrypt data client-side** using Zama's FHE infrastructure when needed

The platform operates as a simple investment game where users stake ETH on token price movements without revealing their positions publicly.

---

## 🎯 Key Features

### 1. **Fully Encrypted Trading Positions**
- Position direction (long/short) stored as encrypted `euint32` values
- Position quantity stored as encrypted `euint32` values
- Only the user can decrypt their position details using their private key

### 2. **Encrypted Balance Management**
- User balances are stored as `euint64` encrypted values
- Deposits and withdrawals operate on encrypted data
- Balance decryption happens client-side through secure FHE protocols

### 3. **Privacy-Preserving Operations**
- All sensitive data remains encrypted on-chain
- Smart contract performs computations on encrypted values without decryption
- Zero-knowledge proofs validate encrypted inputs

### 4. **Modern Web3 Frontend**
- Built with React 19 and TypeScript
- RainbowKit wallet integration for seamless connectivity
- Beautiful gradient UI with responsive design
- Real-time transaction status updates

### 5. **Decentralized Architecture**
- Deployed on Ethereum Sepolia testnet
- Smart contracts written in Solidity 0.8.27
- Hardhat development environment with comprehensive testing

---

## 🔧 Technology Stack

### Smart Contract Layer
- **Solidity ^0.8.24** - Smart contract programming language
- **Zama FHEVM (@fhevm/solidity)** - Fully homomorphic encryption library
- **Hardhat** - Development framework for Ethereum
- **OpenZeppelin Contracts** - Secure, audited contract libraries
- **TypeChain** - TypeScript bindings for Ethereum smart contracts

### Frontend Layer
- **React 19.1.1** - Modern UI framework
- **TypeScript 5.8.3** - Type-safe JavaScript
- **Vite 7.1.6** - Lightning-fast build tool
- **Ethers.js 6.15.0** - Ethereum library for wallet interactions
- **Wagmi 2.17.0** - React hooks for Ethereum
- **Viem 2.37.6** - TypeScript Ethereum interface
- **RainbowKit 2.2.8** - Beautiful wallet connection UI
- **TanStack Query 5.89.0** - Powerful data synchronization

### FHE Infrastructure
- **@zama-fhe/relayer-sdk** - Client-side FHE operations
- **@zama-fhe/oracle-solidity** - On-chain decryption oracle
- **SepoliaConfig** - Zama testnet configuration

### Development Tools
- **Hardhat Deploy** - Deployment management
- **Hardhat Gas Reporter** - Gas usage analysis
- **Solhint** - Solidity linting
- **ESLint & Prettier** - Code quality and formatting
- **Mocha & Chai** - Testing framework

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **npm** >= 7.0.0
- **MetaMask** or compatible Web3 wallet
- **Sepolia ETH** for testnet transactions

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/SecretInvest.git
cd SecretInvest
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd home
npm install
cd ..
```

3. **Configure environment variables**

Create a `.env` file in the root directory:
```env
PRIVATE_KEY=your_sepolia_private_key
INFURA_API_KEY=your_infura_api_key
MNEMONIC=your_mnemonic_phrase
```

Set Hardhat variables:
```bash
npx hardhat vars set ETHERSCAN_API_KEY your_etherscan_api_key
```

4. **Compile smart contracts**
```bash
npm run compile
```

---

## 📦 Deployment

### Deploy to Sepolia Testnet

1. **Ensure you have Sepolia ETH** in your wallet

2. **Deploy the contract**
```bash
npm run deploy:sepolia
```

3. **Verify the contract** (optional)
```bash
npm run verify:sepolia
```

4. **Update frontend configuration**

Edit `home/src/config/contracts.ts` with your deployed contract address:
```typescript
export const CONTRACT_ADDRESS = '0xYourDeployedContractAddress';
```

---

## 🎮 Usage

### Running the Frontend

1. **Start the development server**
```bash
cd home
npm run dev
```

2. **Open your browser** and navigate to `http://localhost:5173`

3. **Connect your wallet** using the "Connect Wallet" button

### Interacting with the Platform

#### 1. **Deposit Funds**
- Click "💵 Deposit 0.005 ETH" to add funds to your encrypted balance
- Your balance is stored as an encrypted `euint64` on-chain

#### 2. **Decrypt Your Balance**
- Click "🔓 Decrypt Balance" to reveal your encrypted balance
- This triggers client-side decryption using your wallet signature
- The decryption happens entirely in your browser

#### 3. **Open a Trading Position**
- Select a token from the dropdown
- Choose direction: 📈 Long or 📉 Short
- Enter quantity (number of units)
- Click "🚀 Open Position"
- Your direction and quantity are encrypted before being sent on-chain

#### 4. **View Your Active Position**
- See your encrypted position in the "Active Position" panel
- Click "🔓 Decrypt Position" to reveal your direction and quantity
- Position metadata (token, open price, timestamp) is visible

#### 5. **Close Your Position**
- Click "❌ Close Position" to settle your trade
- The contract computes a pseudo-random outcome (for demo purposes)
- Winnings are added to your encrypted balance

#### 6. **Withdraw Funds**
- Click "💸 Withdraw 0.005 ETH" to withdraw funds to your wallet

### Admin Functions (Contract Owner Only)

The contract owner can set token prices:
- Enter a price in wei
- Click "Set Price" to update the token oracle

---

## 🏗️ Architecture

### Smart Contract Architecture

```
SecretInvest.sol
├── Encrypted State
│   ├── _balances (euint64) - User ETH balances
│   └── positions - Trading positions
│       ├── direction (euint32) - Long/Short (encrypted)
│       ├── quantity (euint32) - Units (encrypted)
│       ├── openPrice (uint256) - Token price at open
│       └── metadata (timestamps, status)
├── Public State
│   ├── tokenPrice - Oracle prices for tokens
│   └── owner - Contract administrator
└── Functions
    ├── deposit() - Add encrypted balance
    ├── withdraw() - Remove encrypted balance
    ├── openPosition() - Create encrypted position
    ├── closePosition() - Settle position with PnL
    ├── getEncryptedBalance() - Returns euint64 handle
    └── getPosition() - Returns position with encrypted fields
```

### Frontend Architecture

```
home/
├── src/
│   ├── components/
│   │   └── SecretInvestApp.tsx - Main application component
│   ├── config/
│   │   └── contracts.ts - Contract ABI and address
│   ├── hooks/
│   │   ├── useEthersSigner.ts - Ethers provider adapter
│   │   └── useZamaInstance.ts - FHE instance initialization
│   └── main.tsx - Application entry point
```

### Data Flow

1. **User Action** (e.g., open position)
2. **Client-Side Encryption** using Zama FHE SDK
3. **Generate Zero-Knowledge Proof** for encrypted inputs
4. **Submit Transaction** with encrypted handles and proof
5. **Smart Contract Validation** verifies proof on-chain
6. **Store Encrypted Data** in contract state
7. **Grant Permissions** for user and contract to access handles

---

## 🔒 Security & Privacy

### Encryption Guarantees

- **On-Chain Privacy**: All sensitive data (direction, quantity, balance) is encrypted using FHE
- **Computation on Encrypted Data**: The smart contract performs operations without decrypting values
- **Zero-Knowledge Proofs**: Input validation happens without revealing plaintext values
- **Client-Side Decryption**: Users decrypt their own data using wallet signatures

### Security Considerations

⚠️ **This is a demonstration project. Do not use in production without:**
- Professional security audit
- Comprehensive testing on mainnet conditions
- Production-grade random number generation (replace pseudo-random)
- Access control hardening
- Rate limiting and anti-manipulation measures

### Known Limitations

1. **Pseudo-Random Outcome**: Uses block data for randomness (not cryptographically secure)
2. **Simplified PnL**: Win/loss logic is basic and not reflective of real markets
3. **Single Position Per User**: Only one active position allowed for simplicity
4. **No Stop-Loss/Take-Profit**: Advanced trading features not implemented
5. **Testnet Only**: Currently deployed on Sepolia, not production-ready

---

## 🧪 Testing

### Run Smart Contract Tests

```bash
npm test
```

### Run Tests on Sepolia Testnet

```bash
npm run test:sepolia
```

### Coverage Report

```bash
npm run coverage
```

### Custom Tasks

Interact with deployed contracts using Hardhat tasks:

```bash
# Check account balances
npx hardhat accounts --network sepolia

# Interact with SecretInvest
npx hardhat secretinvest:deposit --network sepolia --amount 0.01
```

---

## 📊 Use Cases

### 1. **Private DeFi Trading**
Institutional investors can trade without revealing strategies to competitors or frontrunners.

### 2. **Dark Pools on Blockchain**
Enable private order matching where participants don't see each other's positions.

### 3. **Confidential Asset Management**
Portfolio managers can execute strategies without exposing holdings to the public.

### 4. **Anti-MEV Protection**
Prevent Maximum Extractable Value (MEV) attacks by hiding transaction details.

### 5. **Private Yield Farming**
Stake assets with encrypted amounts to maintain privacy in DeFi protocols.

---

## 🔮 Future Roadmap

### Phase 1: Core Enhancements
- [ ] Multi-asset portfolio management
- [ ] Advanced order types (limit orders, stop-loss)
- [ ] Real-time price feeds from Chainlink oracles
- [ ] Multiple positions per user

### Phase 2: Privacy Features
- [ ] Encrypted profit/loss tracking
- [ ] Private transaction history
- [ ] Encrypted notifications system
- [ ] Privacy-preserving analytics dashboard

### Phase 3: DeFi Integration
- [ ] Liquidity pools with encrypted TVL
- [ ] Encrypted lending/borrowing
- [ ] Cross-chain encrypted bridges
- [ ] Integration with existing DeFi protocols

### Phase 4: Production Readiness
- [ ] Full security audit by reputable firm
- [ ] Mainnet deployment on Ethereum
- [ ] Gasless transactions (meta-transactions)
- [ ] Mobile wallet support
- [ ] Comprehensive documentation

### Phase 5: Advanced Features
- [ ] DAO governance with encrypted voting
- [ ] Encrypted derivatives trading
- [ ] Privacy-preserving KYC/AML compliance
- [ ] Institutional custody solutions
- [ ] API for third-party integrations

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Development Process

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Coding Standards

- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Run linters before committing:
  ```bash
  npm run lint
  npm run prettier:check
  ```

### Areas for Contribution

- 🐛 **Bug Fixes**: Find and fix issues
- ✨ **Features**: Implement roadmap items
- 📖 **Documentation**: Improve guides and examples
- 🧪 **Testing**: Add comprehensive test coverage
- 🎨 **UI/UX**: Enhance frontend design
- 🔒 **Security**: Identify vulnerabilities

---

## 📜 License

This project is licensed under the **BSD-3-Clause-Clear License**.

See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Built With

- **[Zama](https://www.zama.ai/)** - Fully Homomorphic Encryption technology
- **[Hardhat](https://hardhat.org/)** - Ethereum development environment
- **[RainbowKit](https://www.rainbowkit.com/)** - Wallet connection UI
- **[Vite](https://vitejs.dev/)** - Next-generation frontend tooling

### Inspired By

- Privacy-preserving DeFi protocols
- Dark pool trading systems
- MEV protection research
- Encrypted blockchain applications

### Special Thanks

- Zama team for pioneering FHE in blockchain
- Ethereum community for infrastructure
- Open-source contributors worldwide

---

## 📞 Contact & Support

### Get Help

- 📖 **Documentation**: Check this README and code comments
- 💬 **Discussions**: Open a GitHub Discussion
- 🐛 **Issues**: Report bugs via GitHub Issues
- 🔐 **Security**: Email security concerns to [security@yourproject.com]

### Community

- 🐦 **Twitter**: [@SecretInvest]
- 💬 **Discord**: [Join our server]
- 📧 **Email**: [contact@yourproject.com]

### Links

- 🌐 **Website**: [https://secretinvest.xyz]
- 📱 **Demo**: [https://demo.secretinvest.xyz]
- 📖 **Docs**: [https://docs.secretinvest.xyz]
- 🔍 **Contract**: [View on Etherscan](https://sepolia.etherscan.io/address/0x187816B1d7983a8F629657DC966559CB1Ef00d9f)

---

## 🎓 Educational Resources

### Learn About FHE

- [Zama Documentation](https://docs.zama.ai/)
- [FHEVM Whitepaper](https://github.com/zama-ai/fhevm)
- [Fully Homomorphic Encryption Explained](https://www.zama.ai/post/what-is-fully-homomorphic-encryption-fhe)

### Learn About Ethereum Development

- [Ethereum Developer Documentation](https://ethereum.org/developers)
- [Hardhat Documentation](https://hardhat.org/getting-started/)
- [Solidity by Example](https://solidity-by-example.org/)

---

## 🔄 Changelog

### v0.1.0 (Current)
- Initial release
- Basic encrypted trading positions
- Encrypted balance management
- Sepolia testnet deployment
- React frontend with RainbowKit
- Client-side decryption functionality

---

## ⚠️ Disclaimer

**THIS SOFTWARE IS PROVIDED FOR EDUCATIONAL AND DEMONSTRATION PURPOSES ONLY.**

- 🚧 Not audited for production use
- 💸 Do not use with real funds on mainnet
- 🔬 Experimental technology
- 📉 Demo includes simulated trading (not real markets)
- ⚖️ User assumes all risks

Always conduct thorough research and testing before deploying smart contracts with real assets.

---

<div align="center">

**Built with 💜 by the SecretInvest Team**

*Empowering private DeFi for everyone*

[⭐ Star us on GitHub](https://github.com/yourusername/SecretInvest) | [🐛 Report Bug](https://github.com/yourusername/SecretInvest/issues) | [💡 Request Feature](https://github.com/yourusername/SecretInvest/issues)

</div>