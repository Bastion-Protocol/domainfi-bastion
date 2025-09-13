"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Clock, Search, Filter, TrendingUp, Users, Wifi, WifiOff } from "lucide-react"
import { formatDistanceToNow, differenceInMinutes } from "date-fns"
import { useCircleStore } from "@/store"
import { getContractConfig } from "@/lib/contracts"
import { formatEther } from "viem"
// import { useAuctionWebSocket } from "@/hooks/use-websocket"
// import { useAuctionNotifications } from "@/hooks/use-notifications"

interface Auction {
  id: string
  domain: string
  currentBid: bigint
  minBid: bigint
  endTime: Date
  status: "active" | "ending_soon" | "ended"
  bidCount: number
  estimatedValue: bigint
  category: string
  highestBidder?: string
  description?: string
}

interface AuctionFilters {
  search: string
  category: string
  priceRange: string
  status: string
}

export default function AuctionBrowserPage() {
  const router = useRouter()
  const { address } = useAccount()
  const { circles } = useCircleStore()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<AuctionFilters>({
    search: "",
    category: "all",
    priceRange: "all",
    status: "active"
  })
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null)
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false)

  // WebSocket for real-time updates (placeholder for now)
  // const { isConnected, subscribe } = useAuctionWebSocket()
  // const { notifyBidOutbid, notifyAuctionEnding } = useAuctionNotifications()

  // Subscribe to real-time auction updates
  useEffect(() => {
    // Mock WebSocket connection status
    setIsRealTimeConnected(true)
    
    // TODO: Implement real WebSocket subscription
    // const unsubscribeBidUpdate = subscribe('bid_update', (data: any) => {
    //   queryClient.invalidateQueries({ queryKey: ["auctions"] })
    //   if (data.domain && data.amount) {
    //     notifyBidOutbid(data.domain, formatEther(data.amount))
    //   }
    // })

    // return () => {
    //   unsubscribeBidUpdate()
    // }
  }, [])

  // Fetch active auctions
  const { data: auctions = [], isLoading, error } = useQuery({
    queryKey: ["auctions", filters],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const mockAuctions: Auction[] = [
        {
          id: "1",
          domain: "premium.doma",
          currentBid: BigInt("5000000000000000000"), // 5 ETH
          minBid: BigInt("1000000000000000000"), // 1 ETH
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
          status: "active",
          bidCount: 12,
          estimatedValue: BigInt("8000000000000000000"), // 8 ETH
          category: "premium",
          description: "High-value premium domain with strong branding potential"
        },
        {
          id: "2",
          domain: "crypto-startup.doma",
          currentBid: BigInt("2500000000000000000"), // 2.5 ETH
          minBid: BigInt("500000000000000000"), // 0.5 ETH
          endTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          status: "ending_soon",
          bidCount: 8,
          estimatedValue: BigInt("3000000000000000000"), // 3 ETH
          category: "business"
        },
        {
          id: "3",
          domain: "defi-tools.doma",
          currentBid: BigInt("1800000000000000000"), // 1.8 ETH
          minBid: BigInt("300000000000000000"), // 0.3 ETH
          endTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
          status: "active",
          bidCount: 5,
          estimatedValue: BigInt("2200000000000000000"), // 2.2 ETH
          category: "tech"
        }
      ]
      
      // Apply filters
      return mockAuctions.filter(auction => {
        if (filters.search && !auction.domain.toLowerCase().includes(filters.search.toLowerCase())) {
          return false
        }
        if (filters.category !== "all" && auction.category !== filters.category) {
          return false
        }
        if (filters.status !== "all" && auction.status !== filters.status) {
          return false
        }
        return true
      })
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  const getStatusBadge = (auction: Auction) => {
    const minutesLeft = differenceInMinutes(auction.endTime, new Date())
    
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

  const handleBidProposal = (auction: Auction) => {
    if (!selectedCircle) {
      alert("Please select a Circle to create a bid proposal")
      return
    }
    // Navigate to bid proposal creation
    router.push(`/auctions/${auction.id}?circle=${selectedCircle}&action=bid`)
  }

  const filteredAuctions = auctions.filter(auction => {
    // Additional client-side filtering if needed
    return true
  })

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Domain Auctions</h1>
            <p className="text-muted-foreground">
              Discover and bid on premium Doma domains through your Circle's treasury
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isRealTimeConnected ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                Live Updates
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search domains..."
                  value={filters.search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Categories</option>
                <option value="premium">Premium</option>
                <option value="business">Business</option>
                <option value="tech">Technology</option>
                <option value="finance">Finance</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="ending_soon">Ending Soon</option>
              </select>
            </div>
          </div>
          
          {/* Circle Selection */}
          {circles.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <label className="text-sm font-medium mb-2 block">Select Circle for Bidding:</label>
              <div className="flex flex-wrap gap-2">
                {circles.map((circle: any) => (
                  <Button
                    key={circle.id}
                    variant={selectedCircle === circle.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCircle(circle.id)}
                    className="flex items-center gap-2"
                  >
                    <Users className="h-3 w-3" />
                    {circle.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auction Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-6 bg-muted rounded mb-4"></div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Failed to load auctions. Please try again.</p>
          </CardContent>
        </Card>
      ) : filteredAuctions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No auctions found matching your criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuctions.map((auction) => (
            <Card key={auction.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{auction.domain}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {auction.description}
                    </p>
                  </div>
                  {getStatusBadge(auction)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Bid</span>
                    <span className="font-semibold">
                      {formatEther(auction.currentBid)} ETH
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Estimated Value</span>
                    <span className="text-sm flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {formatEther(auction.estimatedValue)} ETH
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Time Left
                    </span>
                    <span className="text-sm font-medium">
                      {getTimeRemaining(auction.endTime)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Bids</span>
                    <span className="text-sm">{auction.bidCount}</span>
                  </div>
                  
                  <div className="pt-3 border-t flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/auctions/${auction.id}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleBidProposal(auction)}
                      disabled={!selectedCircle || auction.status === "ended"}
                    >
                      Create Bid Proposal
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}