import { useState, useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk'
import DepositSection from './DepositSection'
import TradingSection from './TradingSection'
import PositionsSection from './PositionsSection'
import type { FhevmInstance } from '@zama-fhe/relayer-sdk'

export default function SecretInvestApp() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [fhevmInstance, setFhevmInstance] = useState<FhevmInstance | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const initFHEVM = async () => {
      if (isConnected && window.ethereum) {
        try {
          setLoading(true)
          const config = { ...SepoliaConfig, network: window.ethereum }
          const instance = await createInstance(config)
          setFhevmInstance(instance)
        } catch (error) {
          console.error('Failed to initialize FHEVM:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    initFHEVM()
  }, [isConnected])

  if (!isConnected) {
    return (
      <div className="connect-wallet">
        <h2>Connect Your Wallet</h2>
        <p>Please connect your wallet to start trading</p>
        <ConnectButton />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading">
        <p>Initializing encrypted environment...</p>
      </div>
    )
  }

  return (
    <div className="secret-invest-app">
      <div className="wallet-info">
        <div className="wallet-status">
          <span>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
          <ConnectButton />
        </div>
      </div>

      <div className="main-content">
        <div className="sections">
          <DepositSection fhevmInstance={fhevmInstance} />
          <TradingSection fhevmInstance={fhevmInstance} />
          <PositionsSection fhevmInstance={fhevmInstance} />
        </div>
      </div>
    </div>
  )
}