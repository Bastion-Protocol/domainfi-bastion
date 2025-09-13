"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery } from "@tanstack/react-query"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3,
  Filter,
  Search,
  Download,
  Eye,
  Wallet,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Shield
} from "lucide-react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts"
import { formatEther } from "viem"
import { format, subDays, subMonths } from "date-fns"
// import { useCircleStore } from "@/store"

interface Circle {
  id: string
  name: string
}

interface Portfolio {
  id: string
  circleId: string
  circleName: string
  totalValue: bigint
  domains: Domain[]
  performance: {
    day: number
    week: number
    month: number
    year: number
  }
  allocation: {
    premium: number
    business: number
    tech: number
    other: number
  }
  borrowingInfo: {
    totalBorrowed: bigint
    availableCredit: bigint
    healthFactor: number
  }
}

interface Domain {
  id: string
  name: string
  category: string
  purchasePrice: bigint
  currentValue: bigint
  purchaseDate: Date
  isCollateralized: boolean
  borrowedAgainst: bigint
  performanceHistory: Array<{
    date: Date
    value: bigint
  }>
}

interface PortfolioFilters {
  circle: string
  period: string
  category: string
  sortBy: string
  search: string
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88']

export default function PortfolioOverviewPage() {
  const router = useRouter()
  const { address } = useAccount()
  // const { circles } = useCircleStore()
  const circles: Circle[] = [
    { id: "circle-1", name: "DeFi Ventures" },
    { id: "circle-2", name: "Premium Domains" }
  ]
  
  const [filters, setFilters] = useState<PortfolioFilters>({
    circle: "all",
    period: "30d",
    category: "all",
    sortBy: "value",
    search: ""
  })

  // Fetch portfolio data
  const { data: portfolios = [], isLoading, error } = useQuery({
    queryKey: ["portfolios", filters],
    queryFn: async (): Promise<Portfolio[]> => {
      // Mock data - replace with actual API call
      return [
        {
          id: "portfolio-1",
          circleId: "circle-1",
          circleName: "DeFi Ventures",
          totalValue: BigInt("45000000000000000000"), // 45 ETH
          domains: [
            {
              id: "domain-1",
              name: "defi-protocol.doma",
              category: "tech",
              purchasePrice: BigInt("8000000000000000000"), // 8 ETH
              currentValue: BigInt("12000000000000000000"), // 12 ETH
              purchaseDate: new Date("2024-06-15"),
              isCollateralized: true,
              borrowedAgainst: BigInt("6000000000000000000"), // 6 ETH
              performanceHistory: generateMockHistory(BigInt("8000000000000000000"), BigInt("12000000000000000000"))
            },
            {
              id: "domain-2",
              name: "crypto-exchange.doma",
              category: "business",
              purchasePrice: BigInt("15000000000000000000"), // 15 ETH
              currentValue: BigInt("18000000000000000000"), // 18 ETH
              purchaseDate: new Date("2024-05-20"),
              isCollateralized: false,
              borrowedAgainst: BigInt("0"),
              performanceHistory: generateMockHistory(BigInt("15000000000000000000"), BigInt("18000000000000000000"))
            }
          ],
          performance: {
            day: 2.3,
            week: 8.7,
            month: 15.2,
            year: 34.8
          },
          allocation: {
            premium: 20,
            business: 40,
            tech: 35,
            other: 5
          },
          borrowingInfo: {
            totalBorrowed: BigInt("6000000000000000000"), // 6 ETH
            availableCredit: BigInt("9000000000000000000"), // 9 ETH
            healthFactor: 2.1
          }
        },
        {
          id: "portfolio-2", 
          circleId: "circle-2",
          circleName: "Premium Domains",
          totalValue: BigInt("32000000000000000000"), // 32 ETH
          domains: [
            {
              id: "domain-3",
              name: "premium.doma",
              category: "premium",
              purchasePrice: BigInt("20000000000000000000"), // 20 ETH
              currentValue: BigInt("25000000000000000000"), // 25 ETH
              purchaseDate: new Date("2024-04-10"),
              isCollateralized: true,
              borrowedAgainst: BigInt("12000000000000000000"), // 12 ETH
              performanceHistory: generateMockHistory(BigInt("20000000000000000000"), BigInt("25000000000000000000"))
            }
          ],
          performance: {
            day: -0.8,
            week: 3.2,
            month: 8.9,
            year: 25.0
          },
          allocation: {
            premium: 80,
            business: 10,
            tech: 5,
            other: 5
          },
          borrowingInfo: {
            totalBorrowed: BigInt("12000000000000000000"), // 12 ETH
            availableCredit: BigInt("6000000000000000000"), // 6 ETH
            healthFactor: 1.8
          }
        }
      ]
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  // Generate aggregated data
  const aggregatedData = React.useMemo(() => {
    const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, BigInt("0"))
    const totalBorrowed = portfolios.reduce((sum, p) => sum + p.borrowingInfo.totalBorrowed, BigInt("0"))
    const totalDomains = portfolios.reduce((sum, p) => sum + p.domains.length, 0)
    
    const avgPerformance = {
      day: portfolios.reduce((sum, p) => sum + p.performance.day, 0) / portfolios.length,
      week: portfolios.reduce((sum, p) => sum + p.performance.week, 0) / portfolios.length,
      month: portfolios.reduce((sum, p) => sum + p.performance.month, 0) / portfolios.length,
      year: portfolios.reduce((sum, p) => sum + p.performance.year, 0) / portfolios.length
    }

    return {
      totalValue,
      totalBorrowed,
      totalDomains,
      avgPerformance
    }
  }, [portfolios])

  // Generate chart data
  const performanceChartData = React.useMemo(() => {
    const days = 30
    const data = []
    for (let i = days; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const baseValue = Number(formatEther(aggregatedData.totalValue))
      const variance = (Math.random() - 0.5) * 0.1 // ±5% variance
      const value = baseValue * (1 + variance * (i / days))
      
      data.push({
        date: format(date, "MMM dd"),
        value: value,
        borrowed: Number(formatEther(aggregatedData.totalBorrowed))
      })
    }
    return data
  }, [aggregatedData])

  const allocationChartData = React.useMemo(() => {
    const totalAllocation = { premium: 0, business: 0, tech: 0, other: 0 }
    portfolios.forEach(p => {
      totalAllocation.premium += p.allocation.premium
      totalAllocation.business += p.allocation.business
      totalAllocation.tech += p.allocation.tech
      totalAllocation.other += p.allocation.other
    })
    
    const total = Object.values(totalAllocation).reduce((sum, val) => sum + val, 0)
    
    return [
      { name: "Premium", value: (totalAllocation.premium / total) * 100, color: COLORS[0] },
      { name: "Business", value: (totalAllocation.business / total) * 100, color: COLORS[1] },
      { name: "Technology", value: (totalAllocation.tech / total) * 100, color: COLORS[2] },
      { name: "Other", value: (totalAllocation.other / total) * 100, color: COLORS[3] }
    ]
  }, [portfolios])

  const getPerformanceColor = (performance: number) => {
    return performance >= 0 ? "text-green-600" : "text-red-600"
  }

  const getPerformanceIcon = (performance: number) => {
    return performance >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
  }

  const filteredPortfolios = portfolios.filter(portfolio => {
    if (filters.circle !== "all" && portfolio.circleId !== filters.circle) return false
    if (filters.search && !portfolio.circleName.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case "value":
        return Number(b.totalValue - a.totalValue)
      case "performance":
        return b.performance.month - a.performance.month
      case "name":
        return a.circleName.localeCompare(b.circleName)
      default:
        return 0
    }
  })

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Overview</h1>
          <p className="text-muted-foreground">
            Track your Circle portfolios and domain investments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Reports
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                <p className="text-2xl font-bold">{formatEther(aggregatedData.totalValue)} ETH</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <div className={`flex items-center gap-1 mt-2 ${getPerformanceColor(aggregatedData.avgPerformance.day)}`}>
              {getPerformanceIcon(aggregatedData.avgPerformance.day)}
              <span className="text-sm font-medium">
                {aggregatedData.avgPerformance.day > 0 ? "+" : ""}{aggregatedData.avgPerformance.day.toFixed(2)}% (24h)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Borrowed</p>
                <p className="text-2xl font-bold">{formatEther(aggregatedData.totalBorrowed)} ETH</p>
              </div>
              <Wallet className="h-8 w-8 text-orange-600" />
            </div>
            <div className="flex items-center gap-1 mt-2 text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span className="text-sm">Avg Health: 1.95</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Domains</p>
                <p className="text-2xl font-bold">{aggregatedData.totalDomains}</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex items-center gap-1 mt-2 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="text-sm">{portfolios.length} Circles</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">30D Performance</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(aggregatedData.avgPerformance.month)}`}>
                  {aggregatedData.avgPerformance.month > 0 ? "+" : ""}{aggregatedData.avgPerformance.month.toFixed(1)}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
            <div className={`flex items-center gap-1 mt-2 ${getPerformanceColor(aggregatedData.avgPerformance.year)}`}>
              {getPerformanceIcon(aggregatedData.avgPerformance.year)}
              <span className="text-sm">
                {aggregatedData.avgPerformance.year.toFixed(1)}% (1Y)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value.toFixed(2)} ETH`, ""]} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  dataKey="value"
                  data={allocationChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ name, value }: any) => `${name}: ${(value || 0).toFixed(1)}%`}
                >
                  {allocationChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search circles..."
                  value={filters.search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filters.circle}
                onChange={(e) => setFilters(prev => ({ ...prev, circle: e.target.value }))}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Circles</option>
                {circles.map((circle: Circle) => (
                  <option key={circle.id} value={circle.id}>{circle.name}</option>
                ))}
              </select>
              <select
                value={filters.period}
                onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
                className="px-3 py-2 border rounded-md"
              >
                <option value="1d">1 Day</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="1y">1 Year</option>
              </select>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="px-3 py-2 border rounded-md"
              >
                <option value="value">Total Value</option>
                <option value="performance">Performance</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Grid */}
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
            <p className="text-destructive">Failed to load portfolios. Please try again.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortfolios.map((portfolio) => (
            <Card key={portfolio.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{portfolio.circleName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {portfolio.domains.length} domains
                    </p>
                  </div>
                  <Badge variant="outline">{portfolio.id}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span className="font-semibold">
                      {formatEther(portfolio.totalValue)} ETH
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Borrowed</span>
                    <span className="text-sm">
                      {formatEther(portfolio.borrowingInfo.totalBorrowed)} ETH
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Health Factor</span>
                    <span className={`text-sm font-medium ${
                      portfolio.borrowingInfo.healthFactor > 2 ? "text-green-600" :
                      portfolio.borrowingInfo.healthFactor > 1.5 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {portfolio.borrowingInfo.healthFactor.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">30D Performance</span>
                    <span className={`text-sm font-medium flex items-center gap-1 ${getPerformanceColor(portfolio.performance.month)}`}>
                      {getPerformanceIcon(portfolio.performance.month)}
                      {portfolio.performance.month > 0 ? "+" : ""}{portfolio.performance.month.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="pt-3 border-t flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/circles/${portfolio.circleId}/dashboard`)}
                    >
                      <Eye className="h-3 w-3 mr-2" />
                      View Circle
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/portfolio/domain/${portfolio.domains[0]?.id || ''}`)}
                    >
                      Details
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

// Helper function to generate mock performance history
function generateMockHistory(startValue: bigint, endValue: bigint) {
  const history = []
  const days = 30
  const startPrice = Number(formatEther(startValue))
  const endPrice = Number(formatEther(endValue))
  const priceChange = endPrice - startPrice
  
  for (let i = 0; i <= days; i++) {
    const date = subDays(new Date(), days - i)
    const progress = i / days
    const baseValue = startPrice + (priceChange * progress)
    const volatility = baseValue * 0.1 * (Math.random() - 0.5) // ±10% volatility
    const value = BigInt(Math.floor((baseValue + volatility) * 1e18))
    
    history.push({ date, value })
  }
  
  return history
}