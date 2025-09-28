import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { ethers } from 'ethers'
import type { FhevmInstance } from '@zama-fhe/relayer-sdk'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/SecretInvest'

interface TradingSectionProps {
  fhevmInstance: FhevmInstance | null
}

export default function TradingSection({ fhevmInstance }: TradingSectionProps) {
  const { address } = useAccount()
  const [tokenAddress, setTokenAddress] = useState('')
  const [direction, setDirection] = useState<1 | 2>(1) // 1 for long, 2 for short
  const [amount, setAmount] = useState('')
  const [tokenPrice, setTokenPrice] = useState('')

  const { data: userBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserBalance',
    args: [address!],
    query: {
      enabled: !!address,
    },
  })

  const { data: currentTokenPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getTokenPrice',
    args: [tokenAddress],
    query: {
      enabled: !!tokenAddress && tokenAddress.length === 42,
    },
  })

  const {
    writeContract: openPosition,
    data: positionHash,
    isPending: isPositionPending,
  } = useWriteContract()

  const {
    writeContract: setPrice,
    data: priceHash,
    isPending: isPricePending,
  } = useWriteContract()

  const { isLoading: isPositionConfirming } = useWaitForTransactionReceipt({
    hash: positionHash,
  })

  const { isLoading: isPriceConfirming } = useWaitForTransactionReceipt({
    hash: priceHash,
  })

  const handleOpenPosition = async () => {
    if (!fhevmInstance || !tokenAddress || !amount || !window.ethereum) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])

      // Create encrypted inputs
      const input = fhevmInstance.createEncryptedInput(CONTRACT_ADDRESS, address!)
      input.add8(direction)
      input.add32(parseInt(amount))
      const encryptedInput = await input.encrypt()

      openPosition({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'openPosition',
        args: [
          tokenAddress,
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.inputProof,
        ],
      })
    } catch (error) {
      console.error('Open position failed:', error)
    }
  }

  const handleSetTokenPrice = async () => {
    if (!tokenAddress || !tokenPrice || !window.ethereum) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])

      setPrice({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'setTokenPrice',
        args: [tokenAddress, parseEther(tokenPrice)],
      })
    } catch (error) {
      console.error('Set token price failed:', error)
    }
  }

  return (
    <div className="section trading-section">
      <h2>Trading</h2>

      <div className="price-info">
        <p>Platform Balance: {userBalance ? formatEther(userBalance as bigint) : '0'} ETH</p>
        <p>Cost per position: 0.001 ETH</p>
      </div>

      <div className="set-price-controls">
        <h3>Set Token Price (Owner Only)</h3>
        <div className="input-group">
          <input
            type="text"
            placeholder="Token contract address"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
          />
          <input
            type="number"
            placeholder="Price in ETH"
            step="0.000001"
            value={tokenPrice}
            onChange={(e) => setTokenPrice(e.target.value)}
          />
          <button
            onClick={handleSetTokenPrice}
            disabled={!tokenAddress || !tokenPrice || isPricePending || isPriceConfirming}
          >
            {isPricePending || isPriceConfirming ? 'Setting...' : 'Set Price'}
          </button>
        </div>
      </div>

      <div className="current-price">
        {currentTokenPrice && (
          <p>Current Price: {formatEther(currentTokenPrice as bigint)} ETH</p>
        )}
      </div>

      <div className="trading-controls">
        <h3>Open Position</h3>
        <div className="form-group">
          <label>Token Contract Address:</label>
          <input
            type="text"
            placeholder="0x..."
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Direction:</label>
          <select value={direction} onChange={(e) => setDirection(Number(e.target.value) as 1 | 2)}>
            <option value={1}>Long (Buy)</option>
            <option value={2}>Short (Sell)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Amount (units):</label>
          <input
            type="number"
            placeholder="Number of units"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <button
          onClick={handleOpenPosition}
          disabled={
            !fhevmInstance ||
            !tokenAddress ||
            !amount ||
            isPositionPending ||
            isPositionConfirming
          }
          className="open-position-btn"
        >
          {isPositionPending || isPositionConfirming ? 'Opening Position...' : 'Open Position'}
        </button>
      </div>
    </div>
  )
}