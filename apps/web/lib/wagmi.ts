import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'
import { avalancheFuji } from 'wagmi/chains'
import { connectkit } from '@rainbow-me/rainbowkit/wallets'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { metaMask, walletConnect, coinbaseWallet, injected } from '@rainbow-me/rainbowkit/wallets'

// Define Doma testnet chain
export const domaTestnet = defineChain({
  id: 13371337,
  name: 'Doma Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'DOMA',
    symbol: 'DOMA',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_DOMA_RPC || 'https://rpc.doma.testnet'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Doma Explorer',
      url: 'https://explorer.doma.testnet',
    },
  },
  contracts: {
    // Add contract addresses specific to Doma
    ensRegistry: {
      address: '0x...',
    },
    ensUniversalResolver: {
      address: '0x...',
    },
  },
  testnet: true,
})

// Configure supported chains
export const chains = [domaTestnet, avalancheFuji] as const

// Configure wallet connectors
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMask,
        walletConnect,
        coinbaseWallet,
      ],
    },
    {
      groupName: 'Other',
      wallets: [
        injected,
      ],
    },
  ],
  {
    appName: 'Bastion Protocol',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  }
)

// Create wagmi config
export const config = createConfig({
  chains,
  connectors,
  transports: {
    [domaTestnet.id]: http(process.env.NEXT_PUBLIC_DOMA_RPC),
    [avalancheFuji.id]: http(process.env.NEXT_PUBLIC_AVALANCHE_RPC),
  },
  ssr: true,
})

// Export chain configuration for easy access
export const chainConfig = {
  doma: {
    id: domaTestnet.id,
    name: domaTestnet.name,
    rpcUrl: process.env.NEXT_PUBLIC_DOMA_RPC || 'https://rpc.doma.testnet',
    blockExplorer: 'https://explorer.doma.testnet',
    nativeCurrency: domaTestnet.nativeCurrency,
  },
  avalanche: {
    id: avalancheFuji.id,
    name: avalancheFuji.name,
    rpcUrl: process.env.NEXT_PUBLIC_AVALANCHE_RPC || 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io',
    nativeCurrency: avalancheFuji.nativeCurrency,
  },
} as const

// Helper function to get chain by ID
export function getChainById(chainId: number) {
  return chains.find(chain => chain.id === chainId)
}

// Helper function to check if chain is supported
export function isSupportedChain(chainId: number): boolean {
  return chains.some(chain => chain.id === chainId)
}

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}