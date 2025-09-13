import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'

interface ToastNotification {
  id: string
  title: string
  description?: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export function useNotifications() {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<ToastNotification[]>([])

  const showNotification = (notification: Omit<ToastNotification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const fullNotification = { ...notification, id }
    
    setNotifications(prev => [...prev, fullNotification])

    // Show toast
    toast({
      title: notification.title,
      description: notification.description,
      variant: notification.type === 'error' ? 'destructive' : 'default',
      duration: notification.duration,
      action: notification.action ? {
        altText: notification.action.label,
        children: notification.action.label,
        onClick: notification.action.onClick
      } : undefined
    })

    // Auto-remove after duration
    const duration = notification.duration || 5000
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, duration)

    return id
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return {
    notifications,
    showNotification,
    removeNotification
  }
}

// Auction-specific notifications
export function useAuctionNotifications() {
  const { showNotification } = useNotifications()

  const notifyBidPlaced = (domain: string, amount: string) => {
    showNotification({
      title: "Bid Placed Successfully",
      description: `Your bid of ${amount} ETH for ${domain} has been submitted.`,
      type: "success"
    })
  }

  const notifyBidOutbid = (domain: string, newHighBid: string) => {
    showNotification({
      title: "You've Been Outbid",
      description: `${domain} now has a higher bid of ${newHighBid} ETH.`,
      type: "warning",
      action: {
        label: "View Auction",
        onClick: () => window.open(`/auctions/${domain}`, '_blank')
      }
    })
  }

  const notifyAuctionEnding = (domain: string, timeLeft: string) => {
    showNotification({
      title: "Auction Ending Soon",
      description: `${domain} auction ends in ${timeLeft}.`,
      type: "warning",
      action: {
        label: "View Auction",
        onClick: () => window.open(`/auctions/${domain}`, '_blank')
      }
    })
  }

  const notifyAuctionWon = (domain: string, amount: string) => {
    showNotification({
      title: "🎉 Auction Won!",
      description: `Congratulations! You won ${domain} for ${amount} ETH.`,
      type: "success",
      duration: 10000
    })
  }

  const notifyAuctionLost = (domain: string, winningBid: string) => {
    showNotification({
      title: "Auction Ended",
      description: `${domain} was won with a bid of ${winningBid} ETH.`,
      type: "info"
    })
  }

  const notifyBidFailed = (domain: string, error: string) => {
    showNotification({
      title: "Bid Failed",
      description: `Failed to place bid for ${domain}: ${error}`,
      type: "error",
      duration: 8000
    })
  }

  const notifySlippageExceeded = (domain: string, currentBid: string, maxBid: string) => {
    showNotification({
      title: "Slippage Protection Triggered",
      description: `Bid for ${domain} not executed. Current bid ${currentBid} ETH exceeds your maximum of ${maxBid} ETH.`,
      type: "warning",
      duration: 8000
    })
  }

  return {
    notifyBidPlaced,
    notifyBidOutbid,
    notifyAuctionEnding,
    notifyAuctionWon,
    notifyAuctionLost,
    notifyBidFailed,
    notifySlippageExceeded
  }
}

// Circle-specific notifications
export function useCircleNotifications() {
  const { showNotification } = useNotifications()

  const notifyProposalCreated = (proposalTitle: string, circleId: string) => {
    showNotification({
      title: "New Proposal Created",
      description: `"${proposalTitle}" is now open for voting.`,
      type: "info",
      action: {
        label: "Vote Now",
        onClick: () => window.open(`/circles/${circleId}/proposals`, '_blank')
      }
    })
  }

  const notifyProposalVoted = (proposalTitle: string, vote: 'for' | 'against') => {
    showNotification({
      title: "Vote Recorded",
      description: `Your ${vote} vote for "${proposalTitle}" has been recorded.`,
      type: "success"
    })
  }

  const notifyProposalApproved = (proposalTitle: string) => {
    showNotification({
      title: "Proposal Approved",
      description: `"${proposalTitle}" has been approved and will be executed.`,
      type: "success",
      duration: 8000
    })
  }

  const notifyProposalRejected = (proposalTitle: string) => {
    showNotification({
      title: "Proposal Rejected",
      description: `"${proposalTitle}" has been rejected by the Circle.`,
      type: "info"
    })
  }

  const notifyProposalExecuted = (proposalTitle: string, transactionHash: string) => {
    showNotification({
      title: "Proposal Executed",
      description: `"${proposalTitle}" has been successfully executed.`,
      type: "success",
      action: {
        label: "View Transaction",
        onClick: () => window.open(`https://etherscan.io/tx/${transactionHash}`, '_blank')
      }
    })
  }

  const notifyMemberJoined = (memberName: string, circleId: string) => {
    showNotification({
      title: "New Member Joined",
      description: `${memberName} has joined your Circle.`,
      type: "info",
      action: {
        label: "View Circle",
        onClick: () => window.open(`/circles/${circleId}`, '_blank')
      }
    })
  }

  const notifyTreasuryDeposit = (amount: string, from: string) => {
    showNotification({
      title: "Treasury Deposit",
      description: `${amount} ETH deposited by ${from}.`,
      type: "success"
    })
  }

  return {
    notifyProposalCreated,
    notifyProposalVoted,
    notifyProposalApproved,
    notifyProposalRejected,
    notifyProposalExecuted,
    notifyMemberJoined,
    notifyTreasuryDeposit
  }
}

// Transaction monitoring notifications
export function useTransactionNotifications() {
  const { showNotification } = useNotifications()

  const notifyTransactionPending = (description: string, hash: string) => {
    showNotification({
      title: "Transaction Pending",
      description: `${description} - Waiting for confirmation...`,
      type: "info",
      duration: 10000,
      action: {
        label: "View on Etherscan",
        onClick: () => window.open(`https://etherscan.io/tx/${hash}`, '_blank')
      }
    })
  }

  const notifyTransactionConfirmed = (description: string, hash: string) => {
    showNotification({
      title: "Transaction Confirmed",
      description: `${description} - Successfully confirmed!`,
      type: "success",
      action: {
        label: "View on Etherscan",
        onClick: () => window.open(`https://etherscan.io/tx/${hash}`, '_blank')
      }
    })
  }

  const notifyTransactionFailed = (description: string, hash: string, error?: string) => {
    showNotification({
      title: "Transaction Failed",
      description: `${description} - ${error || 'Transaction was reverted'}`,
      type: "error",
      duration: 10000,
      action: {
        label: "View on Etherscan",
        onClick: () => window.open(`https://etherscan.io/tx/${hash}`, '_blank')
      }
    })
  }

  const notifyHighGasFees = (gasPriceGwei: number) => {
    showNotification({
      title: "High Gas Fees",
      description: `Current gas price is ${gasPriceGwei} Gwei. Consider waiting for lower fees.`,
      type: "warning",
      duration: 8000
    })
  }

  return {
    notifyTransactionPending,
    notifyTransactionConfirmed,
    notifyTransactionFailed,
    notifyHighGasFees
  }
}