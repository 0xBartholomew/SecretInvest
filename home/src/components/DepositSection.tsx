import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { ethers } from 'ethers'
import type { FhevmInstance } from '@zama-fhe/relayer-sdk'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/SecretInvest'

interface DepositSectionProps {
  fhevmInstance: FhevmInstance | null
}

export default function DepositSection({ fhevmInstance }: DepositSectionProps) {
  const { address } = useAccount()
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const { data: userBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserBalance',
    args: [address!],
    query: {
      enabled: !!address,
    },
  })

  const {
    writeContract: deposit,
    data: depositHash,
    isPending: isDepositPending,
  } = useWriteContract()

  const {
    writeContract: withdraw,
    data: withdrawHash,
    isPending: isWithdrawPending,
  } = useWriteContract()

  const { isLoading: isDepositConfirming } = useWaitForTransactionReceipt({
    hash: depositHash,
  })

  const { isLoading: isWithdrawConfirming } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  })

  const handleDeposit = async () => {
    if (!depositAmount || !window.ethereum) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])

      deposit({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'deposit',
        value: parseEther(depositAmount),
      })
    } catch (error) {
      console.error('Deposit failed:', error)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || !window.ethereum) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])

      withdraw({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'withdraw',
        args: [parseEther(withdrawAmount)],
      })
    } catch (error) {
      console.error('Withdraw failed:', error)
    }
  }

  return (
    <div className="section deposit-section">
      <h2>Wallet Management</h2>

      <div className="balance-info">
        <p>Platform Balance: {userBalance ? formatEther(userBalance as bigint) : '0'} ETH</p>
      </div>

      <div className="deposit-controls">
        <h3>Deposit ETH</h3>
        <div className="input-group">
          <input
            type="number"
            placeholder="Amount in ETH"
            step="0.001"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <button
            onClick={handleDeposit}
            disabled={!depositAmount || isDepositPending || isDepositConfirming}
          >
            {isDepositPending || isDepositConfirming ? 'Depositing...' : 'Deposit'}
          </button>
        </div>
      </div>

      <div className="withdraw-controls">
        <h3>Withdraw ETH</h3>
        <div className="input-group">
          <input
            type="number"
            placeholder="Amount in ETH"
            step="0.001"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
          <button
            onClick={handleWithdraw}
            disabled={!withdrawAmount || isWithdrawPending || isWithdrawConfirming}
          >
            {isWithdrawPending || isWithdrawConfirming ? 'Withdrawing...' : 'Withdraw'}
          </button>
        </div>
      </div>
    </div>
  )
}