import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther } from 'viem'
import { ethers } from 'ethers'
import type { FhevmInstance } from '@zama-fhe/relayer-sdk'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/SecretInvest'

interface PositionsSectionProps {
  fhevmInstance: FhevmInstance | null
}

interface Position {
  id: number
  tokenAddress: string
  entryPrice: bigint
  timestamp: bigint
  isActive: boolean
  encryptedDirection: string
  encryptedAmount: string
}

export default function PositionsSection({ fhevmInstance }: PositionsSectionProps) {
  const { address } = useAccount()
  const [positions, setPositions] = useState<Position[]>([])
  const [decryptedPositions, setDecryptedPositions] = useState<{ [key: number]: { direction: number; amount: number } }>({})

  const { data: positionCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserPositionCount',
    args: [address!],
    query: {
      enabled: !!address,
    },
  })

  const {
    writeContract: closePosition,
    data: closeHash,
    isPending: isClosePending,
  } = useWriteContract()

  const { isLoading: isCloseConfirming } = useWaitForTransactionReceipt({
    hash: closeHash,
  })

  useEffect(() => {
    const fetchPositions = async () => {
      if (!address || !positionCount) return

      const fetchedPositions: Position[] = []
      for (let i = 0; i < Number(positionCount); i++) {
        try {
          const position = await fetch(`/api/position/${address}/${i}`)
          if (position.ok) {
            const positionData = await position.json()
            fetchedPositions.push({
              id: i,
              ...positionData,
            })
          }
        } catch (error) {
          console.error(`Failed to fetch position ${i}:`, error)
        }
      }
      setPositions(fetchedPositions)
    }

    fetchPositions()
  }, [address, positionCount])

  const handleDecryptPosition = async (positionId: number, encryptedDirection: string, encryptedAmount: string) => {
    if (!fhevmInstance || !address || !window.ethereum) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const keypair = fhevmInstance.generateKeypair()
      const handleContractPairs = [
        {
          handle: encryptedDirection,
          contractAddress: CONTRACT_ADDRESS,
        },
        {
          handle: encryptedAmount,
          contractAddress: CONTRACT_ADDRESS,
        },
      ]

      const startTimeStamp = Math.floor(Date.now() / 1000).toString()
      const durationDays = "10"
      const contractAddresses = [CONTRACT_ADDRESS]

      const eip712 = fhevmInstance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays)

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      )

      const result = await fhevmInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      )

      setDecryptedPositions(prev => ({
        ...prev,
        [positionId]: {
          direction: result[encryptedDirection],
          amount: result[encryptedAmount],
        },
      }))
    } catch (error) {
      console.error('Decryption failed:', error)
    }
  }

  const handleClosePosition = async (positionId: number) => {
    if (!window.ethereum) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])

      closePosition({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'closePosition',
        args: [positionId],
      })
    } catch (error) {
      console.error('Close position failed:', error)
    }
  }

  return (
    <div className="section positions-section">
      <h2>Your Positions</h2>

      <div className="positions-count">
        <p>Total Positions: {positionCount ? Number(positionCount) : 0}</p>
      </div>

      {positions.length === 0 ? (
        <p>No positions found</p>
      ) : (
        <div className="positions-list">
          {positions.map((position) => {
            const decrypted = decryptedPositions[position.id]

            return (
              <div key={position.id} className="position-card">
                <div className="position-header">
                  <h3>Position #{position.id}</h3>
                  <span className={`status ${position.isActive ? 'active' : 'closed'}`}>
                    {position.isActive ? 'Active' : 'Closed'}
                  </span>
                </div>

                <div className="position-details">
                  <p><strong>Token:</strong> {position.tokenAddress}</p>
                  <p><strong>Entry Price:</strong> {formatEther(position.entryPrice)} ETH</p>
                  <p><strong>Opened:</strong> {new Date(Number(position.timestamp) * 1000).toLocaleDateString()}</p>

                  {decrypted ? (
                    <>
                      <p><strong>Direction:</strong> {decrypted.direction === 1 ? 'Long' : 'Short'}</p>
                      <p><strong>Amount:</strong> {decrypted.amount} units</p>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDecryptPosition(position.id, position.encryptedDirection, position.encryptedAmount)}
                      className="decrypt-btn"
                    >
                      Decrypt Details
                    </button>
                  )}
                </div>

                {position.isActive && (
                  <div className="position-actions">
                    <button
                      onClick={() => handleClosePosition(position.id)}
                      disabled={isClosePending || isCloseConfirming}
                      className="close-position-btn"
                    >
                      {isClosePending || isCloseConfirming ? 'Closing...' : 'Close Position'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}