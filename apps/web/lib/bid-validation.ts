import { formatEther, parseEther } from 'viem'
import { z } from 'zod'

// Bid validation schema
export const bidValidationSchema = z.object({
  auctionId: z.string().min(1),
  bidAmount: z.string().refine((val) => {
    try {
      const amount = parseEther(val)
      return amount > 0n
    } catch {
      return false
    }
  }, "Invalid bid amount"),
  currentBid: z.bigint(),
  maxSlippage: z.number().min(0.1).max(10),
  treasuryBalance: z.bigint(),
  endTime: z.date()
})

export interface BidValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestedBid?: bigint
  estimatedGasCost?: bigint
}

export interface SlippageProtection {
  maxSlippage: number
  currentPrice: bigint
  maxAcceptablePrice: bigint
  priceImpact: number
}

export function validateBidAmount(
  bidAmount: string,
  currentBid: bigint,
  minIncrement: bigint = parseEther("0.01"),
  treasuryBalance: bigint,
  maxSlippage: number = 5.0
): BidValidationResult {
  const result: BidValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  try {
    const bidAmountWei = parseEther(bidAmount)
    const minRequiredBid = currentBid + minIncrement

    // Basic validation
    if (bidAmountWei <= 0n) {
      result.errors.push("Bid amount must be greater than 0")
      result.isValid = false
    }

    if (bidAmountWei <= currentBid) {
      result.errors.push(`Bid must be higher than current bid of ${formatEther(currentBid)} ETH`)
      result.isValid = false
    }

    if (bidAmountWei < minRequiredBid) {
      result.errors.push(`Minimum bid increment is ${formatEther(minIncrement)} ETH`)
      result.isValid = false
      result.suggestedBid = minRequiredBid
    }

    // Treasury balance check
    const estimatedGas = parseEther("0.005") // Estimated gas cost
    const totalRequired = bidAmountWei + estimatedGas
    
    if (totalRequired > treasuryBalance) {
      result.errors.push(`Insufficient treasury balance. Required: ${formatEther(totalRequired)} ETH, Available: ${formatEther(treasuryBalance)} ETH`)
      result.isValid = false
    }

    // Slippage warnings
    const priceIncrease = Number((bidAmountWei - currentBid) * 100n / currentBid)
    if (priceIncrease > maxSlippage) {
      result.warnings.push(`Bid increase of ${priceIncrease.toFixed(2)}% exceeds max slippage of ${maxSlippage}%`)
    }

    // Overbidding warnings
    if (bidAmountWei > currentBid * 2n) {
      result.warnings.push("Bid is significantly higher than current bid. Consider a smaller increment.")
    }

    // Suggested optimal bid
    if (result.isValid && !result.suggestedBid) {
      result.suggestedBid = currentBid + (currentBid * BigInt(Math.floor(maxSlippage * 100)) / 10000n)
    }

    result.estimatedGasCost = estimatedGas

  } catch (error) {
    result.errors.push("Invalid bid amount format")
    result.isValid = false
  }

  return result
}

export function calculateSlippageProtection(
  currentPrice: bigint,
  maxSlippage: number,
  proposedBid: bigint
): SlippageProtection {
  const slippageMultiplier = BigInt(Math.floor((100 + maxSlippage) * 100))
  const maxAcceptablePrice = currentPrice * slippageMultiplier / 10000n
  const priceImpact = Number((proposedBid - currentPrice) * 100n / currentPrice)

  return {
    maxSlippage,
    currentPrice,
    maxAcceptablePrice,
    priceImpact
  }
}

export function validateAuctionTiming(endTime: Date, proposalExecutionTime: Date = new Date()): {
  isValid: boolean
  timeRemaining: number
  warnings: string[]
} {
  const now = new Date()
  const timeUntilEnd = endTime.getTime() - now.getTime()
  const executionBuffer = proposalExecutionTime.getTime() - now.getTime()
  
  const result = {
    isValid: true,
    timeRemaining: Math.max(0, Math.floor(timeUntilEnd / 1000 / 60)), // minutes
    warnings: [] as string[]
  }

  if (timeUntilEnd <= 0) {
    result.isValid = false
    result.warnings.push("Auction has already ended")
  } else if (timeUntilEnd < 5 * 60 * 1000) { // Less than 5 minutes
    result.warnings.push("Auction ends very soon. Bid execution may fail.")
  } else if (timeUntilEnd < executionBuffer) {
    result.warnings.push("Proposal voting period may extend beyond auction end time.")
  }

  return result
}

// Transaction monitoring utilities
export interface TransactionStatus {
  hash?: string
  status: 'pending' | 'confirmed' | 'failed' | 'unknown'
  confirmations: number
  gasUsed?: bigint
  effectiveGasPrice?: bigint
  blockNumber?: number
  timestamp?: Date
  error?: string
}

export function createTransactionMonitor() {
  const transactions = new Map<string, TransactionStatus>()
  const listeners = new Map<string, ((status: TransactionStatus) => void)[]>()

  const updateTransaction = (hash: string, update: Partial<TransactionStatus>) => {
    const current = transactions.get(hash) || { hash, status: 'unknown', confirmations: 0 }
    const updated = { ...current, ...update }
    transactions.set(hash, updated)

    // Notify listeners
    const hashListeners = listeners.get(hash) || []
    hashListeners.forEach(listener => listener(updated))
  }

  const monitorTransaction = (hash: string, callback: (status: TransactionStatus) => void) => {
    const hashListeners = listeners.get(hash) || []
    hashListeners.push(callback)
    listeners.set(hash, hashListeners)

    // Return unsubscribe function
    return () => {
      const current = listeners.get(hash) || []
      const filtered = current.filter(cb => cb !== callback)
      if (filtered.length === 0) {
        listeners.delete(hash)
      } else {
        listeners.set(hash, filtered)
      }
    }
  }

  const getTransaction = (hash: string): TransactionStatus | undefined => {
    return transactions.get(hash)
  }

  return {
    updateTransaction,
    monitorTransaction,
    getTransaction,
    transactions: () => Array.from(transactions.values())
  }
}

// Bid execution utilities
export interface BidExecution {
  auctionId: string
  proposalId: string
  bidAmount: bigint
  maxSlippage: number
  autoExecute: boolean
  executionDeadline: Date
}

export function shouldExecuteBid(
  execution: BidExecution,
  currentBid: bigint,
  auctionEndTime: Date
): { shouldExecute: boolean; reason: string } {
  const now = new Date()
  
  // Check if auction is still active
  if (auctionEndTime <= now) {
    return { shouldExecute: false, reason: "Auction has ended" }
  }

  // Check execution deadline
  if (execution.executionDeadline <= now) {
    return { shouldExecute: false, reason: "Execution deadline passed" }
  }

  // Check if our bid is still competitive
  const slippageProtection = calculateSlippageProtection(
    currentBid,
    execution.maxSlippage,
    execution.bidAmount
  )

  if (execution.bidAmount > slippageProtection.maxAcceptablePrice) {
    return { shouldExecute: false, reason: "Current price exceeds maximum slippage tolerance" }
  }

  // Check minimum time buffer (e.g., 2 minutes before auction ends)
  const timeUntilEnd = auctionEndTime.getTime() - now.getTime()
  if (timeUntilEnd < 2 * 60 * 1000) {
    return { shouldExecute: false, reason: "Insufficient time remaining in auction" }
  }

  return { shouldExecute: true, reason: "Ready for execution" }
}