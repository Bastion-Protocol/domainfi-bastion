"use client"

import React, { useState } from "react"
import { useAccount } from "wagmi"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery } from "@tanstack/react-query"
import { 
  Trophy,
  TrendingUp, 
  TrendingDown, 
  Users,
  Target,
  Crown,
  Award,
  Zap,
  Activity,
  DollarSign,
  Calendar,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  Medal,
  Star,
  Fire,
  Eye
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { formatEther, parseEther } from "viem"
import { format, subDays, addDays } from "date-fns"

interface LeaderboardEntry {
  rank: number
  previousRank?: number
  address: string
  ens?: string
  avatar?: string
  portfolioValue: bigint
  totalDomains: number
  totalBorrowed: bigint
  healthFactor: number
  weeklyChange: number
  monthlyChange: number
  topDomain: string
  circleId?: string
  circleName?: string
  badges: string[]
  achievements: Achievement[]
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: "common" | "rare" | "epic" | "legendary"
  earnedDate: Date
}

interface CircleRanking {
  id: string
  name: string
  totalMembers: number
  averagePortfolioValue: bigint
  totalVolume: bigint
  topPerformer: string
  weeklyGrowth: number
  monthlyGrowth: number
  rank: number
  previousRank?: number
}

interface CompetitionEvent {
  id: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  prize: bigint
  participants: number
  status: "upcoming" | "active" | "completed"
  category: string
  winner?: string
}

interface LeaderboardStats {
  totalPortfolioValue: bigint
  totalParticipants: number
  averagePortfolioValue: bigint
  topGainer: {
    address: string
    ens?: string
    change: number
  }
  mostActiveTrader: {
    address: string
    ens?: string
    transactions: number
  }
}

export default function LeaderboardPage() {
  const { address } = useAccount()
  const [activeTab, setActiveTab] = useState("overall")
  const [timeframe, setTimeframe] = useState("weekly")

  // Fetch leaderboard data
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["leaderboard", timeframe],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      // Mock data - replace with actual API call
      return [
        {
          rank: 1,
          previousRank: 2,
          address: "0x1234...5678",
          ens: "domainmaster.eth",
          avatar: "/avatars/01.png",
          portfolioValue: parseEther("250"),
          totalDomains: 15,
          totalBorrowed: parseEther("120"),
          healthFactor: 2.8,
          weeklyChange: 12.5,
          monthlyChange: 45.2,
          topDomain: "premium-crypto.doma",
          circleId: "circle-1",
          circleName: "DeFi Pioneers",
          badges: ["Early Adopter", "Top Trader", "Risk Master"],
          achievements: [
            {
              id: "first-million",
              name: "Millionaire",
              description: "Reached 1M+ portfolio value",
              icon: "💎",
              rarity: "legendary",
              earnedDate: new Date("2024-08-15")
            }
          ]
        },
        {
          rank: 2,
          previousRank: 1,
          address: "0x2345...6789",
          ens: "cryptowhale.eth",
          portfolioValue: parseEther("220"),
          totalDomains: 22,
          totalBorrowed: parseEther("80"),
          healthFactor: 3.5,
          weeklyChange: -2.1,
          monthlyChange: 38.7,
          topDomain: "trading-bot.doma",
          circleId: "circle-2",
          circleName: "Yield Hunters",
          badges: ["Whale Status", "Diamond Hands"],
          achievements: []
        },
        {
          rank: 3,
          previousRank: 3,
          address: "0x3456...789a",
          ens: "nftcollector.eth",
          portfolioValue: parseEther("180"),
          totalDomains: 8,
          totalBorrowed: parseEther("45"),
          healthFactor: 4.2,
          weeklyChange: 8.3,
          monthlyChange: 22.1,
          topDomain: "art-gallery.doma",
          circleId: "circle-1",
          circleName: "DeFi Pioneers",
          badges: ["Collector", "Steady Growth"],
          achievements: []
        }
      ]
    },
    refetchInterval: 30000
  })

  // Fetch circle rankings
  const { data: circleRankings = [] } = useQuery({
    queryKey: ["circle-rankings"],
    queryFn: async (): Promise<CircleRanking[]> => {
      return [
        {
          id: "circle-1",
          name: "DeFi Pioneers",
          totalMembers: 45,
          averagePortfolioValue: parseEther("95"),
          totalVolume: parseEther("4275"),
          topPerformer: "domainmaster.eth",
          weeklyGrowth: 8.5,
          monthlyGrowth: 32.1,
          rank: 1,
          previousRank: 2
        },
        {
          id: "circle-2", 
          name: "Yield Hunters",
          totalMembers: 38,
          averagePortfolioValue: parseEther("82"),
          totalVolume: parseEther("3116"),
          topPerformer: "cryptowhale.eth",
          weeklyGrowth: 6.2,
          monthlyGrowth: 28.7,
          rank: 2,
          previousRank: 1
        },
        {
          id: "circle-3",
          name: "NFT Enthusiasts", 
          totalMembers: 52,
          averagePortfolioValue: parseEther("67"),
          totalVolume: parseEther("3484"),
          topPerformer: "nftcollector.eth",
          weeklyGrowth: 4.8,
          monthlyGrowth: 19.3,
          rank: 3,
          previousRank: 3
        }
      ]
    }
  })

  // Fetch competitions
  const { data: competitions = [] } = useQuery({
    queryKey: ["competitions"],
    queryFn: async (): Promise<CompetitionEvent[]> => {
      return [
        {
          id: "comp-1",
          name: "September Trading Challenge",
          description: "Highest portfolio growth wins 100 ETH",
          startDate: new Date("2024-09-01"),
          endDate: new Date("2024-09-30"),
          prize: parseEther("100"),
          participants: 156,
          status: "active",
          category: "Trading",
          winner: undefined
        },
        {
          id: "comp-2",
          name: "Domain Discovery Contest",
          description: "Find and acquire the most valuable domains",
          startDate: new Date("2024-10-01"),
          endDate: new Date("2024-10-15"),
          prize: parseEther("50"),
          participants: 0,
          status: "upcoming",
          category: "Discovery"
        },
        {
          id: "comp-3",
          name: "August Portfolio Rally",
          description: "Best performing portfolio in August",
          startDate: new Date("2024-08-01"),
          endDate: new Date("2024-08-31"),
          prize: parseEther("75"),
          participants: 134,
          status: "completed",
          category: "Portfolio",
          winner: "domainmaster.eth"
        }
      ]
    }
  })

  // Fetch overall stats
  const { data: stats } = useQuery({
    queryKey: ["leaderboard-stats"],
    queryFn: async (): Promise<LeaderboardStats> => {
      return {
        totalPortfolioValue: parseEther("12450"),
        totalParticipants: 487,
        averagePortfolioValue: parseEther("25.6"),
        topGainer: {
          address: "0x1234...5678",
          ens: "domainmaster.eth",
          change: 12.5
        },
        mostActiveTrader: {
          address: "0x2345...6789", 
          ens: "cryptowhale.eth",
          transactions: 28
        }
      }
    }
  })

  const getRankChange = (rank: number, previousRank?: number) => {
    if (!previousRank) return { icon: Minus, color: "text-muted-foreground" }
    
    if (rank < previousRank) {
      return { icon: ArrowUp, color: "text-green-600" }
    } else if (rank > previousRank) {
      return { icon: ArrowDown, color: "text-red-600" }
    }
    return { icon: Minus, color: "text-muted-foreground" }
  }

  const getRarityColor = (rarity: Achievement["rarity"]) => {
    switch (rarity) {
      case "legendary": return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "epic": return "text-purple-600 bg-purple-50 border-purple-200"
      case "rare": return "text-blue-600 bg-blue-50 border-blue-200"
      default: return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const currentUserRank = leaderboard.findIndex(entry => entry.address.toLowerCase() === address?.toLowerCase()) + 1

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
        <p className="text-muted-foreground">
          Compete with the community and track your ranking
        </p>
      </div>

      {/* Overall Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value Locked</p>
                  <p className="text-2xl font-bold">{formatEther(stats.totalPortfolioValue)} ETH</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Participants</p>
                  <p className="text-2xl font-bold">{stats.totalParticipants}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Top Gainer</p>
                  <p className="text-lg font-bold">{stats.topGainer.ens || `${stats.topGainer.address.slice(0, 6)}...`}</p>
                  <p className="text-sm text-green-600">+{stats.topGainer.change}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Most Active</p>
                  <p className="text-lg font-bold">{stats.mostActiveTrader.ens || `${stats.mostActiveTrader.address.slice(0, 6)}...`}</p>
                  <p className="text-sm text-blue-600">{stats.mostActiveTrader.transactions} trades</p>
                </div>
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current User Position */}
      {address && currentUserRank > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Medal className="h-6 w-6 text-blue-600" />
                  <span className="text-lg font-bold">Your Rank: #{currentUserRank}</span>
                </div>
                <Badge variant="outline">
                  {leaderboard[currentUserRank - 1]?.circleName}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatEther(leaderboard[currentUserRank - 1]?.portfolioValue || BigInt(0))} ETH</p>
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Leaderboard */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Rankings</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={timeframe === "weekly" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeframe("weekly")}
                  >
                    Weekly
                  </Button>
                  <Button
                    variant={timeframe === "monthly" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeframe("monthly")}
                  >
                    Monthly
                  </Button>
                  <Button
                    variant={timeframe === "all-time" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeframe("all-time")}
                  >
                    All Time
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overall">Overall</TabsTrigger>
                  <TabsTrigger value="circles">Circles</TabsTrigger>
                  <TabsTrigger value="domains">Top Domains</TabsTrigger>
                </TabsList>

                <TabsContent value="overall" className="space-y-4">
                  {leaderboard.map((entry, index) => {
                    const rankChange = getRankChange(entry.rank, entry.previousRank)
                    const RankIcon = rankChange.icon
                    
                    return (
                      <div key={entry.address} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Rank */}
                            <div className="flex items-center gap-2 min-w-[60px]">
                              <span className={`text-lg font-bold ${
                                entry.rank === 1 ? "text-yellow-600" :
                                entry.rank === 2 ? "text-gray-600" :
                                entry.rank === 3 ? "text-orange-600" : ""
                              }`}>
                                #{entry.rank}
                              </span>
                              <RankIcon className={`h-4 w-4 ${rankChange.color}`} />
                            </div>

                            {/* Avatar & Name */}
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={entry.avatar} />
                                <AvatarFallback>
                                  {entry.ens ? entry.ens.slice(0, 2).toUpperCase() : entry.address.slice(2, 4).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">
                                  {entry.ens || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                                </p>
                                {entry.circleName && (
                                  <Badge variant="outline" size="sm">{entry.circleName}</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <p className="font-semibold">{formatEther(entry.portfolioValue)} ETH</p>
                              <p className="text-muted-foreground">Portfolio</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{entry.totalDomains}</p>
                              <p className="text-muted-foreground">Domains</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-medium ${
                                timeframe === "weekly" ? 
                                  entry.weeklyChange > 0 ? "text-green-600" : "text-red-600" :
                                  entry.monthlyChange > 0 ? "text-green-600" : "text-red-600"
                              }`}>
                                {timeframe === "weekly" ? 
                                  (entry.weeklyChange > 0 ? "+" : "") + entry.weeklyChange.toFixed(1) + "%" :
                                  (entry.monthlyChange > 0 ? "+" : "") + entry.monthlyChange.toFixed(1) + "%"
                                }
                              </p>
                              <p className="text-muted-foreground">Change</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{entry.healthFactor.toFixed(1)}</p>
                              <p className="text-muted-foreground">Health</p>
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        {entry.badges.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {entry.badges.slice(0, 3).map((badge) => (
                              <Badge key={badge} variant="secondary" size="sm">
                                {badge}
                              </Badge>
                            ))}
                            {entry.badges.length > 3 && (
                              <Badge variant="outline" size="sm">
                                +{entry.badges.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Achievements */}
                        {entry.achievements.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {entry.achievements.map((achievement) => (
                              <div 
                                key={achievement.id}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${getRarityColor(achievement.rarity)}`}
                                title={achievement.description}
                              >
                                <span>{achievement.icon}</span>
                                <span>{achievement.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </TabsContent>

                <TabsContent value="circles" className="space-y-4">
                  {circleRankings.map((circle) => {
                    const rankChange = getRankChange(circle.rank, circle.previousRank)
                    const RankIcon = rankChange.icon
                    
                    return (
                      <div key={circle.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 min-w-[60px]">
                              <span className="text-lg font-bold">#{circle.rank}</span>
                              <RankIcon className={`h-4 w-4 ${rankChange.color}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold">{circle.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {circle.totalMembers} members • Top: {circle.topPerformer}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatEther(circle.totalVolume)} ETH</p>
                            <p className="text-sm text-muted-foreground">Total Volume</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </TabsContent>

                <TabsContent value="domains" className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4" />
                    <p>Top performing domains coming soon</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active Competitions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Competitions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {competitions.map((comp) => (
                <div key={comp.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">{comp.name}</h4>
                      <Badge 
                        variant={comp.status === "active" ? "default" : comp.status === "upcoming" ? "secondary" : "outline"}
                        size="sm"
                      >
                        {comp.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatEther(comp.prize)} ETH</p>
                      <p className="text-xs text-muted-foreground">Prize</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">{comp.description}</p>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{format(comp.startDate, "MMM dd")} - {format(comp.endDate, "MMM dd")}</span>
                    <span>{comp.participants} participants</span>
                  </div>
                  
                  {comp.winner && (
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      <Crown className="h-3 w-3 text-yellow-600" />
                      <span>Winner: {comp.winner}</span>
                    </div>
                  )}
                </div>
              ))}
              
              <Button variant="outline" size="sm" className="w-full">
                View All Competitions
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
                <span className="text-sm text-muted-foreground">Avg Portfolio Value</span>
                <span className="font-semibold">{stats ? formatEther(stats.averagePortfolioValue) : "0"} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Circles</span>
                <span className="font-semibold">{circleRankings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Competitions</span>
                <span className="font-semibold">{competitions.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Achievement Showcase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaderboard
                .flatMap(entry => entry.achievements)
                .sort((a, b) => b.earnedDate.getTime() - a.earnedDate.getTime())
                .slice(0, 3)
                .map((achievement) => (
                  <div key={achievement.id} className={`p-2 rounded border ${getRarityColor(achievement.rarity)}`}>
                    <div className="flex items-center gap-2">
                      <span>{achievement.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{achievement.name}</p>
                        <p className="text-xs opacity-75">{achievement.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
              <Button variant="outline" size="sm" className="w-full">
                View All Achievements
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}