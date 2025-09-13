"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useAccount } from "wagmi"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery } from "@tanstack/react-query"
import { 
  Clock, 
  TrendingUp, 
  Globe, 
  History, 
  Users, 
  Gavel,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BarChart3,
  Timer,
  Wallet
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { formatEther } from "viem"
import { BidProposal } from "@/components/BidProposal"
import { useCircleStore } from "@/store"
import { useToast } from "@/hooks/use-toast"

interface AuctionDetails {
  id: string
  domain: string
  description: string
  category: string
  currentBid: bigint
  minBid: bigint
  startTime: Date
  endTime: Date
  status: "active" | "ending_soon" | "ended"
  bidCount: number
  estimatedValue: {
    low: bigint
    high: bigint
    current: bigint
  }
  highestBidder?: string
  seller: string
  registrationDate: Date
  expirationDate: Date
  previousSales: Array<{
    date: Date
    price: bigint
    buyer: string
  }>
  domainMetrics: {
    length: number
    keywords: string[]
    brandability: number
    seoValue: number
    commercialPotential: number
  }
  technicalDetails: {
    dnssec: boolean
    whoisPrivacy: boolean
    emailForwarding: boolean
    webForwarding: boolean
  }
}

interface BidHistory {
  id: string
  bidder: string
  amount: bigint
  timestamp: Date
  isWinning: boolean
}

export default function AuctionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { address } = useAccount()
  const { toast } = useToast()
  const { circles } = useCircleStore()
  
  const selectedCircleId = searchParams.get("circle")
  const action = searchParams.get("action")
  const [showBidProposal, setShowBidProposal] = useState(action === "bid")
  const [isWatching, setIsWatching] = useState(false)

  // Fetch auction details
  const { data: auction, isLoading: auctionLoading, error: auctionError } = useQuery({
    queryKey: ["auction", id],
    queryFn: async (): Promise<AuctionDetails> => {
      // Mock data - replace with actual API call
      return {
        id: id as string,
        domain: "premium.doma",
        description: "Premium brandable domain perfect for fintech, SaaS, or enterprise solutions. Short, memorable, and highly commercial.",
        category: "premium",
        currentBid: BigInt("5000000000000000000"), // 5 ETH
        minBid: BigInt("1000000000000000000"), // 1 ETH
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        status: "active",
        bidCount: 12,
        estimatedValue: {
          low: BigInt("4000000000000000000"), // 4 ETH
          high: BigInt("8000000000000000000"), // 8 ETH
          current: BigInt("6000000000000000000"), // 6 ETH
        },
        highestBidder: "0x1234567890123456789012345678901234567890",
        seller: "0x0987654321098765432109876543210987654321",
        registrationDate: new Date("2023-01-15"),
        expirationDate: new Date("2025-01-15"),
        previousSales: [
          {
            date: new Date("2023-01-15"),
            price: BigInt("3000000000000000000"), // 3 ETH
            buyer: "0x1111111111111111111111111111111111111111"
          }
        ],
        domainMetrics: {
          length: 7,
          keywords: ["premium", "brand", "finance"],
          brandability: 9.2,
          seoValue: 8.5,
          commercialPotential: 9.8
        },
        technicalDetails: {
          dnssec: true,
          whoisPrivacy: true,
          emailForwarding: true,
          webForwarding: true
        }
      }
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  // Fetch bid history
  const { data: bidHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["auction-bids", id],
    queryFn: async (): Promise<BidHistory[]> => {
      // Mock data - replace with actual API call
      return [
        {
          id: "bid-1",
          bidder: "0x1234567890123456789012345678901234567890",
          amount: BigInt("5000000000000000000"), // 5 ETH
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          isWinning: true
        },
        {
          id: "bid-2",
          bidder: "0x2345678901234567890123456789012345678901",
          amount: BigInt("4500000000000000000"), // 4.5 ETH
          timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          isWinning: false
        },
        {
          id: "bid-3",
          bidder: "0x3456789012345678901234567890123456789012",
          amount: BigInt("4000000000000000000"), // 4 ETH
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          isWinning: false
        }
      ]
    },
    refetchInterval: 15000 // Refetch every 15 seconds
  })

  useEffect(() => {
    // Check if user has this auction in watchlist
    const watchlist = JSON.parse(localStorage.getItem("auction-watchlist") || "[]")
    setIsWatching(watchlist.includes(id))
  }, [id])

  const handleToggleWatch = () => {
    const watchlist = JSON.parse(localStorage.getItem("auction-watchlist") || "[]")
    if (isWatching) {
      const updated = watchlist.filter((auctionId: string) => auctionId !== id)
      localStorage.setItem("auction-watchlist", JSON.stringify(updated))
      setIsWatching(false)
      toast({
        title: "Removed from Watchlist",
        description: `${auction?.domain} has been removed from your watchlist.`
      })
    } else {
      const updated = [...watchlist, id]
      localStorage.setItem("auction-watchlist", JSON.stringify(updated))
      setIsWatching(true)
      toast({
        title: "Added to Watchlist",
        description: `${auction?.domain} has been added to your watchlist.`
      })
    }
  }

  const getStatusBadge = (auction: AuctionDetails) => {
    const minutesLeft = Math.floor((auction.endTime.getTime() - Date.now()) / (1000 * 60))
    
    if (minutesLeft <= 0) {
      return <Badge variant="secondary">Ended</Badge>
    } else if (minutesLeft <= 30) {
      return <Badge variant="destructive">Ending Soon</Badge>
    } else {
      return <Badge variant="default">Active</Badge>
    }
  }

  const getTimeRemaining = (endTime: Date) => {
    const now = new Date()
    if (endTime <= now) return "Ended"
    return `${formatDistanceToNow(endTime)} left`
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getMetricColor = (value: number) => {
    if (value >= 9) return "text-green-600"
    if (value >= 7) return "text-yellow-600"
    return "text-red-600"
  }

  if (auctionLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-40 bg-muted rounded"></div>
              <div className="h-60 bg-muted rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-40 bg-muted rounded"></div>
              <div className="h-40 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (auctionError || !auction) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Auction Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The auction you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/auctions")}>
              Back to Auctions
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{auction.domain}</h1>
            <p className="text-muted-foreground">{auction.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(auction)}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleWatch}
              className="flex items-center gap-2"
            >
              {isWatching ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {isWatching ? "Watching" : "Watch"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Auction Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Auction Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {formatEther(auction.currentBid)} ETH
                  </p>
                  <p className="text-sm text-muted-foreground">Current Bid</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{auction.bidCount}</p>
                  <p className="text-sm text-muted-foreground">Total Bids</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {getTimeRemaining(auction.endTime).split(" ")[0]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getTimeRemaining(auction.endTime).includes("left") ? "Hours Left" : "Ended"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatEther(auction.estimatedValue.current)} ETH
                  </p>
                  <p className="text-sm text-muted-foreground">Est. Value</p>
                </div>
              </div>

              {auction.status === "active" && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Auction Progress</p>
                    <p className="text-sm text-muted-foreground">
                      {format(auction.endTime, "MMM d, h:mm a")}
                    </p>
                  </div>
                  <Progress 
                    value={((Date.now() - auction.startTime.getTime()) / (auction.endTime.getTime() - auction.startTime.getTime())) * 100} 
                    className="mb-2" 
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Started {formatDistanceToNow(auction.startTime)} ago</span>
                    <span>Ends in {getTimeRemaining(auction.endTime)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history">Bid History</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Domain Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <Badge variant="outline">{auction.category}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Length</p>
                      <p className="font-semibold">{auction.domainMetrics.length} characters</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Registration Date</p>
                      <p className="font-semibold">{format(auction.registrationDate, "MMM d, yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expiration Date</p>
                      <p className="font-semibold">{format(auction.expirationDate, "MMM d, yyyy")}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {auction.domainMetrics.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Valuation Range</p>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="font-semibold">{formatEther(auction.estimatedValue.low)} ETH</p>
                        <p className="text-xs text-muted-foreground">Low</p>
                      </div>
                      <div className="flex-1">
                        <Progress value={50} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{formatEther(auction.estimatedValue.high)} ETH</p>
                        <p className="text-xs text-muted-foreground">High</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {auction.previousSales.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Previous Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {auction.previousSales.map((sale, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-semibold">{formatEther(sale.price)} ETH</p>
                            <p className="text-sm text-muted-foreground">{format(sale.date, "MMM d, yyyy")}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Buyer</p>
                            <p className="text-sm font-mono">{formatAddress(sale.buyer)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Bid History</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-20"></div>
                            <div className="h-3 bg-muted rounded w-32"></div>
                          </div>
                          <div className="h-4 bg-muted rounded w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : bidHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No bids yet</p>
                  ) : (
                    <div className="space-y-3">
                      {bidHistory.map((bid) => (
                        <div 
                          key={bid.id} 
                          className={`flex justify-between items-center p-3 rounded-lg ${
                            bid.isWinning ? "bg-green-50 border border-green-200" : "bg-muted/50"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{formatEther(bid.amount)} ETH</p>
                              {bid.isWinning && <Badge variant="default" size="sm">Winning</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(bid.timestamp)} ago
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Bidder</p>
                            <p className="text-sm font-mono">{formatAddress(bid.bidder)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Domain Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className={`text-2xl font-bold ${getMetricColor(auction.domainMetrics.brandability)}`}>
                        {auction.domainMetrics.brandability}
                      </p>
                      <p className="text-sm text-muted-foreground">Brandability</p>
                      <Progress value={auction.domainMetrics.brandability * 10} className="mt-2" />
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className={`text-2xl font-bold ${getMetricColor(auction.domainMetrics.seoValue)}`}>
                        {auction.domainMetrics.seoValue}
                      </p>
                      <p className="text-sm text-muted-foreground">SEO Value</p>
                      <Progress value={auction.domainMetrics.seoValue * 10} className="mt-2" />
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className={`text-2xl font-bold ${getMetricColor(auction.domainMetrics.commercialPotential)}`}>
                        {auction.domainMetrics.commercialPotential}
                      </p>
                      <p className="text-sm text-muted-foreground">Commercial</p>
                      <Progress value={auction.domainMetrics.commercialPotential * 10} className="mt-2" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Market Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Similar domains sold for:</p>
                        <p className="font-semibold">2.5 - 8.2 ETH (last 6 months)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Category average:</p>
                        <p className="font-semibold">4.1 ETH</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Length premium:</p>
                        <p className="font-semibold">+15% (7 chars)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Trend:</p>
                        <p className="font-semibold text-green-600">+23% (30 days)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="technical">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span>DNSSEC</span>
                      {auction.technicalDetails.dnssec ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span>WHOIS Privacy</span>
                      {auction.technicalDetails.whoisPrivacy ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span>Email Forwarding</span>
                      {auction.technicalDetails.emailForwarding ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span>Web Forwarding</span>
                      {auction.technicalDetails.webForwarding ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bidding Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Place Bid</CardTitle>
            </CardHeader>
            <CardContent>
              {auction.status === "ended" ? (
                <div className="text-center py-4">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Auction has ended</p>
                </div>
              ) : !address ? (
                <div className="text-center py-4">
                  <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-3">Connect your wallet to bid</p>
                  <Button size="sm">Connect Wallet</Button>
                </div>
              ) : circles.length === 0 ? (
                <div className="text-center py-4">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground mb-3">Join a Circle to participate in auctions</p>
                  <Button size="sm" onClick={() => router.push("/circles/create")}>
                    Create Circle
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Next bid must be at least</p>
                    <p className="text-xl font-bold">
                      {formatEther(auction.currentBid + parseEther("0.1"))} ETH
                    </p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => setShowBidProposal(true)}
                  >
                    Create Bid Proposal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seller Info */}
          <Card>
            <CardHeader>
              <CardTitle>Seller Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{formatAddress(auction.seller).slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{formatAddress(auction.seller)}</p>
                  <p className="text-sm text-muted-foreground">Verified Seller</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Current Bidder</span>
                <span className="text-sm font-mono">
                  {auction.highestBidder ? formatAddress(auction.highestBidder) : "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Min Bid</span>
                <span className="text-sm font-semibold">{formatEther(auction.minBid)} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bid Increment</span>
                <span className="text-sm font-semibold">0.1 ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Watchers</span>
                <span className="text-sm font-semibold">24</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bid Proposal Modal/Section */}
      {showBidProposal && selectedCircleId && (
        <div className="mt-8">
          <BidProposal
            auctionId={auction.id}
            circleId={selectedCircleId}
            domain={auction.domain}
            currentBid={auction.currentBid}
            minBid={auction.minBid}
            endTime={auction.endTime}
            onProposalCreated={(proposalId) => {
              setShowBidProposal(false)
              toast({
                title: "Proposal Created",
                description: "Your bid proposal has been submitted for Circle voting."
              })
            }}
          />
        </div>
      )}
    </div>
  )
}