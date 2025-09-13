import { Address } from 'viem'

// Contract addresses by chain
export const CONTRACTS = {
  // Doma Testnet
  13371337: {
    CIRCLE_FACTORY: process.env.NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS as Address || '0x...',
    MIRROR_NFT: process.env.NEXT_PUBLIC_MIRROR_NFT_ADDRESS as Address || '0x...',
    BASTION_PROTOCOL: '0x...' as Address,
  },
  // Avalanche Fuji
  43113: {
    CIRCLE_FACTORY: '0x...' as Address,
    MIRROR_NFT: process.env.NEXT_PUBLIC_MIRROR_NFT_ADDRESS as Address || '0x...',
    BASTION_PROTOCOL: '0x...' as Address,
  },
} as const

// Contract ABIs
export const ABIS = {
  CIRCLE_FACTORY: [
    {
      "inputs": [
        {"internalType": "string", "name": "name", "type": "string"},
        {"internalType": "address[]", "name": "initialMembers", "type": "address[]"}
      ],
      "name": "createCircle",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
      "name": "getUserCircles",
      "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "address", "name": "circle", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
        {"indexed": false, "internalType": "string", "name": "name", "type": "string"}
      ],
      "name": "CircleCreated",
      "type": "event"
    }
  ] as const,

  MIRROR_NFT: [
    {
      "inputs": [
        {"internalType": "address", "name": "to", "type": "address"},
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
        {"internalType": "string", "name": "tokenURI", "type": "string"}
      ],
      "name": "mint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
      "name": "burn",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
      "name": "ownerOf",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
      "name": "tokenURI",
      "outputs": [{"internalType": "string", "name": "", "type": "string"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
        {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"}
      ],
      "name": "Transfer",
      "type": "event"
    }
  ] as const,

  BASTION_PROTOCOL: [
    {
      "inputs": [
        {"internalType": "uint256", "name": "domainTokenId", "type": "uint256"},
        {"internalType": "address", "name": "newCustodian", "type": "address"}
      ],
      "name": "changeCustody",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "uint256", "name": "domainTokenId", "type": "uint256"}],
      "name": "getCustodian",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "uint256", "name": "domainTokenId", "type": "uint256"},
        {"indexed": true, "internalType": "address", "name": "previousCustodian", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "newCustodian", "type": "address"}
      ],
      "name": "CustodyChanged",
      "type": "event"
    }
  ] as const,
} as const

// Helper function to get contract address by chain ID
export function getContractAddress(
  chainId: keyof typeof CONTRACTS,
  contractName: keyof typeof CONTRACTS[keyof typeof CONTRACTS]
): Address {
  return CONTRACTS[chainId]?.[contractName] || '0x0000000000000000000000000000000000000000'
}

// Helper function to get contract ABI
export function getContractABI(contractName: keyof typeof ABIS) {
  return ABIS[contractName]
}

// TypeScript types for contract interactions
export type CircleFactoryContract = {
  address: Address
  abi: typeof ABIS.CIRCLE_FACTORY
}

export type MirrorNFTContract = {
  address: Address
  abi: typeof ABIS.MIRROR_NFT
}

export type BastionProtocolContract = {
  address: Address
  abi: typeof ABIS.BASTION_PROTOCOL
}

// Contract configuration builder
export function getContractConfig(
  chainId: keyof typeof CONTRACTS,
  contractName: keyof typeof ABIS
) {
  return {
    address: getContractAddress(chainId, contractName as any),
    abi: getContractABI(contractName),
  }
}

// Event types for TypeScript
export interface CircleCreatedEvent {
  circle: Address
  creator: Address
  name: string
}

export interface CustodyChangedEvent {
  domainTokenId: bigint
  previousCustodian: Address
  newCustodian: Address
}

export interface TransferEvent {
  from: Address
  to: Address
  tokenId: bigint
}