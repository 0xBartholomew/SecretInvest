import { useState, useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import '@rainbow-me/rainbowkit/styles.css'
import './App.css'
import SecretInvestApp from './components/SecretInvestApp'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, walletConnectWallet],
    },
  ],
  {
    appName: 'Secret Invest',
    projectId: 'YOUR_PROJECT_ID',
  }
)

const config = createConfig({
  connectors,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
})

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="app">
            <header className="header">
              <h1>Secret Invest</h1>
              <p>Encrypted Trading Platform</p>
            </header>
            <main>
              <SecretInvestApp />
            </main>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
