"use client"

import React, { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { formatEther, parseEther } from "viem"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock, 
  Vote, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TrendingUp,
  Users,
  Wallet,
  Timer,
  Shield,
  AlertCircle
} from "lucide-react"
import { formatDistanceToNow, addHours } from "date-fns"
import { useCircleStore } from "@/store"
import { validateBidAmount, calculateSlippageProtection, validateAuctionTiming } from "@/lib/bid-validation"

interface BidProposalProps {
  auctionId: string
  circleId: string
  domain: string
  currentBid: bigint
  minBid: bigint
  endTime: Date
  onProposalCreated?: (proposalId: string) => void
}

interface CircleMember {
  address: string
  name?: string
  role: "admin" | "member"
  votingPower: number
}

interface BidProposal {
  id: string
  bidAmount: bigint
  maxSlippage: number
  rationale: string
  proposer: string
  status: "active" | "approved" | "rejected" | "executed" | "expired"
  votes: {
    for: number
    against: number
    total: number
  }
  quorum: number
  threshold: number
  endTime: Date
  createdAt: Date
  executedAt?: Date
  transactionHash?: string
}

const bidProposalSchema = z.object({
  bidAmount: z.string().min(1, "Bid amount required"),
  maxSlippage: z.number().min(0.1).max(10, "Slippage must be between 0.1% and 10%"),
  rationale: z.string().min(10, "Rationale must be at least 10 characters"),
  autoExecute: z.boolean().default(true)
})

type BidProposalForm = z.infer<typeof bidProposalSchema>

export function BidProposal({ 
  auctionId, 
  circleId, 
  domain, 
  currentBid, 
  minBid, 
  endTime,
  onProposalCreated 
}: BidProposalProps) {
  const { address } = useAccount()
  const { toast } = useToast()
  const { circles } = useCircleStore()
  const [loading, setLoading] = useState(false)
  const [activeProposal, setActiveProposal] = useState<BidProposal | null>(null)
  const [members, setMembers] = useState<CircleMember[]>([])
  const [userVote, setUserVote] = useState<"for" | "against" | null>(null)

  const circle = circles.find(c => c.id === circleId)
  
  const form = useForm<BidProposalForm>({
    resolver: zodResolver(bidProposalSchema),
    defaultValues: {
      bidAmount: formatEther(currentBid + parseEther("0.1")), // Suggest slightly higher bid
      maxSlippage: 2.0,
      rationale: "",
      autoExecute: true
    }
  })

  const bidAmount = form.watch("bidAmount")
  const maxSlippage = form.watch("maxSlippage")
  const suggestedBid = currentBid + (currentBid * BigInt(10) / BigInt(100)) // 10% higher
  
  // Real-time bid validation
  const [bidValidation, setBidValidation] = useState<any>(null)
  const [slippageInfo, setSlippageInfo] = useState<any>(null)
  const [timingValidation, setTimingValidation] = useState<any>(null)

  // Validate bid in real-time
  useEffect(() => {
    if (bidAmount && circle) {
      const treasuryBalance = parseEther(circle.treasuryBalance || "0")
      const validation = validateBidAmount(bidAmount, currentBid, parseEther("0.01"), treasuryBalance, maxSlippage)
      setBidValidation(validation)

      if (validation.isValid) {
        const slippage = calculateSlippageProtection(currentBid, maxSlippage, parseEther(bidAmount))
        setSlippageInfo(slippage)
      }

      const timing = validateAuctionTiming(endTime)
      setTimingValidation(timing)
    }
  }, [bidAmount, maxSlippage, currentBid, endTime, circle])

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Fetch circle members
    setMembers([
      { address: "0x1234...5678", name: "Alice", role: "admin", votingPower: 2 },
      { address: "0x9876...4321", name: "Bob", role: "member", votingPower: 1 },
      { address: "0x5555...6666", name: "Charlie", role: "member", votingPower: 1 },
    ])

    // Check for existing active proposal
    setActiveProposal({
      id: "prop-1",
      bidAmount: parseEther("5.5"),
      maxSlippage: 2.0,
      rationale: "This domain has strong brand potential and aligns with our investment strategy.",
      proposer: "0x1234...5678",
      status: "active",
      votes: { for: 2, against: 0, total: 4 },
      quorum: 3,
      threshold: 2,
      endTime: addHours(new Date(), 24),
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    })
  }, [auctionId, circleId])

  const handleCreateProposal = async (data: BidProposalForm) => {
    if (!address || !circle) return

    setLoading(true)
    try {
      // Validate bid amount
      const bidAmountWei = parseEther(data.bidAmount)
      if (bidAmountWei <= currentBid) {
        throw new Error("Bid must be higher than current bid")
      }

      // Create proposal via API
      const proposal = {
        auctionId,
        circleId,
        bidAmount: bidAmountWei,
        maxSlippage: data.maxSlippage,
        rationale: data.rationale,
        autoExecute: data.autoExecute,
        proposer: address
      }

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const newProposal: BidProposal = {
        id: `prop-${Date.now()}`,
        ...proposal,
        status: "active",
        votes: { for: 0, against: 0, total: members.length },
        quorum: Math.ceil(members.length * 0.6), // 60% quorum
        threshold: Math.ceil(members.length * 0.5), // 50% threshold
        endTime: addHours(new Date(), 24),
        createdAt: new Date(),
      }

      setActiveProposal(newProposal)
      onProposalCreated?.(newProposal.id)
      
      toast({
        title: "Proposal Created",
        description: `Bid proposal for ${domain} has been submitted for voting.`,
      })

      form.reset()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create proposal",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (vote: "for" | "against") => {
    if (!address || !activeProposal) return

    setLoading(true)
    try {
      // Mock voting API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setUserVote(vote)
      
      // Update vote counts
      setActiveProposal(prev => {
        if (!prev) return prev
        return {
          ...prev,
          votes: {
            ...prev.votes,
            [vote]: prev.votes[vote] + 1
          }
        }
      })

      toast({
        title: "Vote Submitted",
        description: `Your ${vote} vote has been recorded.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteProposal = async () => {
    if (!activeProposal) return

    setLoading(true)
    try {
      // Execute bid via smart contract
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setActiveProposal(prev => prev ? { ...prev, status: "executed", executedAt: new Date() } : prev)
      
      toast({
        title: "Proposal Executed",
        description: `Bid of ${formatEther(activeProposal.bidAmount)} ETH has been submitted to the auction.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute proposal",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getProposalStatusBadge = (status: BidProposal["status"]) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="flex items-center gap-1">
          <Timer className="h-3 w-3" />
          Voting Active
        </Badge>
      case "approved":
        return <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>
      case "rejected":
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      case "executed":
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Executed
        </Badge>
      case "expired":
        return <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Expired
        </Badge>
      default:
        return null
    }
  }

  const votingProgress = activeProposal ? 
    (activeProposal.votes.for + activeProposal.votes.against) / activeProposal.votes.total * 100 : 0

  const quorumMet = activeProposal ? 
    (activeProposal.votes.for + activeProposal.votes.against) >= activeProposal.quorum : false

  const thresholdMet = activeProposal ? 
    activeProposal.votes.for >= activeProposal.threshold : false

  return (
    <div className="space-y-6">
      {/* Existing Active Proposal */}
      {activeProposal && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Vote className="h-5 w-5" />
                  Active Bid Proposal
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Proposal for {domain}
                </p>
              </div>
              {getProposalStatusBadge(activeProposal.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Proposed Bid</p>
                <p className="text-lg font-semibold">{formatEther(activeProposal.bidAmount)} ETH</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Max Slippage</p>
                <p className="text-lg font-semibold">{activeProposal.maxSlippage}%</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Rationale</p>
              <p className="text-sm">{activeProposal.rationale}</p>
            </div>

            {/* Voting Status */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Voting Progress</p>
                <p className="text-sm text-muted-foreground">
                  {activeProposal.votes.for + activeProposal.votes.against} / {activeProposal.votes.total} votes
                </p>
              </div>
              <Progress value={votingProgress} className="mb-3" />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-green-600">{activeProposal.votes.for}</p>
                  <p className="text-xs text-muted-foreground">For</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-red-600">{activeProposal.votes.against}</p>
                  <p className="text-xs text-muted-foreground">Against</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{activeProposal.threshold}</p>
                  <p className="text-xs text-muted-foreground">Needed</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <div className="flex items-center gap-1 text-xs">
                  <div className={`w-2 h-2 rounded-full ${quorumMet ? "bg-green-500" : "bg-gray-300"}`} />
                  Quorum {quorumMet ? "Met" : "Pending"}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className={`w-2 h-2 rounded-full ${thresholdMet ? "bg-green-500" : "bg-gray-300"}`} />
                  Threshold {thresholdMet ? "Met" : "Pending"}
                </div>
              </div>
            </div>

            {/* Voting Actions */}
            {activeProposal.status === "active" && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Cast Your Vote</p>
                {userVote ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    You voted <strong>{userVote}</strong> this proposal
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleVote("for")}
                      disabled={loading}
                      className="flex-1"
                    >
                      Vote For
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleVote("against")}
                      disabled={loading}
                      className="flex-1"
                    >
                      Vote Against
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Execution */}
            {activeProposal.status === "active" && quorumMet && thresholdMet && (
              <div className="border-t pt-4">
                <Button
                  onClick={handleExecuteProposal}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Executing..." : "Execute Proposal"}
                </Button>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p>Proposal ends: {formatDistanceToNow(activeProposal.endTime)} remaining</p>
              <p>Created: {formatDistanceToNow(activeProposal.createdAt)} ago</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Proposal */}
      {!activeProposal && (
        <Card>
          <CardHeader>
            <CardTitle>Create Bid Proposal</CardTitle>
            <p className="text-sm text-muted-foreground">
              Submit a bid proposal for {domain} to your Circle for voting
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleCreateProposal)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Current Bid</label>
                  <div className="text-lg font-semibold">{formatEther(currentBid)} ETH</div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Suggested Bid</label>
                  <div className="text-lg font-semibold text-primary">{formatEther(suggestedBid)} ETH</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Bid Amount (ETH)</label>
                <Input
                  type="number"
                  step="0.01"
                  min={formatEther(currentBid + parseEther("0.01"))}
                  {...form.register("bidAmount")}
                  placeholder="Enter bid amount"
                />
                {form.formState.errors.bidAmount && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.bidAmount.message}
                  </p>
                )}
                
                {/* Real-time validation feedback */}
                {bidValidation && (
                  <div className="mt-2 space-y-1">
                    {bidValidation.errors.map((error: string, index: number) => (
                      <div key={index} className="flex items-center gap-1 text-sm text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {error}
                      </div>
                    ))}
                    {bidValidation.warnings.map((warning: string, index: number) => (
                      <div key={index} className="flex items-center gap-1 text-sm text-yellow-600">
                        <AlertTriangle className="h-3 w-3" />
                        {warning}
                      </div>
                    ))}
                    {bidValidation.suggestedBid && (
                      <div className="flex items-center gap-1 text-sm text-blue-600">
                        <TrendingUp className="h-3 w-3" />
                        Suggested: {formatEther(bidValidation.suggestedBid)} ETH
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Max Slippage (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  {...form.register("maxSlippage", { valueAsNumber: true })}
                  placeholder="2.0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum price increase you're willing to accept if the auction price changes
                </p>
                
                {/* Slippage protection info */}
                {slippageInfo && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="flex items-center gap-1 text-blue-700 font-medium mb-1">
                      <Shield className="h-3 w-3" />
                      Slippage Protection
                    </div>
                    <div className="text-blue-600">
                      Max acceptable price: {formatEther(slippageInfo.maxAcceptablePrice)} ETH
                    </div>
                    <div className="text-blue-600">
                      Price impact: {slippageInfo.priceImpact.toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Rationale</label>
                <Textarea
                  {...form.register("rationale")}
                  placeholder="Explain why this domain is a good investment for the Circle..."
                  className="min-h-[100px]"
                />
                {form.formState.errors.rationale && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.rationale.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoExecute"
                  {...form.register("autoExecute")}
                  className="rounded"
                />
                <label htmlFor="autoExecute" className="text-sm">
                  Auto-execute when approved (before auction ends)
                </label>
              </div>

              <Button 
                type="submit" 
                disabled={loading || !circle || !bidValidation?.isValid} 
                className="w-full"
              >
                {loading ? "Creating Proposal..." : "Create Bid Proposal"}
              </Button>
              
              {/* Timing warnings */}
              {timingValidation && timingValidation.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {timingValidation.warnings.map((warning: string, index: number) => (
                    <div key={index} className="flex items-center gap-1 text-sm text-yellow-600">
                      <Clock className="h-3 w-3" />
                      {warning}
                    </div>
                  ))}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Circle Info */}
      {circle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {circle.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Members</p>
                <p className="font-semibold">{members.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Treasury Balance</p>
                <p className="font-semibold">{circle.treasuryBalance || "0"} ETH</p>
              </div>
              <div>
                <p className="text-muted-foreground">Quorum</p>
                <p className="font-semibold">{Math.ceil(members.length * 0.6)}/{members.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Threshold</p>
                <p className="font-semibold">{Math.ceil(members.length * 0.5)}/{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}