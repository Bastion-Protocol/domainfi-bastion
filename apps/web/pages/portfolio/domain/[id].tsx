"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery } from "@tanstack/react-query"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Shield, 
  BarChart3,
  Activity,
  CreditCard,
  Send,
  ShoppingCart,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock,
  Calculator,
  Globe,
  Calendar,
  Users
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
  BarChart,
  Bar
} from "recharts"
import { formatEther, parseEther } from "viem"
import { format, subDays } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface DomainDetails {
  id: string
  name: string
  category: string
  circleId: string
  circleName: string
  
  // Financial
  purchasePrice: bigint
  currentValue: bigint
  estimatedValue: {
    low: bigint
    high: bigint
    confidence: number
  }
  
  // Collateral & Borrowing
  isCollateralized: boolean
  borrowedAmount: bigint
  availableCredit: bigint
  healthFactor: number
  liquidationPrice: bigint
  collateralRatio: number
  
  // Market Data
  marketComparisons: Array<{
    domain: string
    price: bigint
    similarity: number
    saleDate: Date
  }>
  
  // Performance
  performanceHistory: Array<{
    date: Date
    value: bigint
    volume?: bigint
  }>
  
  // Metadata
  registrationDate: Date
  expirationDate: Date
  owner: string
  transferHistory: Array<{
    from: string
    to: string
    price: bigint
    date: Date
  }>
  
  // Analytics
  analytics: {
    views: number
    inquiries: number
    offers: number
    brandability: number
    seoValue: number
    commercialPotential: number
  }
}

export default function DomainDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { address } = useAccount()
  const { toast } = useToast()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch domain details
  const { data: domain, isLoading, error } = useQuery({
    queryKey: ["domain", id],
    queryFn: async (): Promise<DomainDetails> => {
      // Mock data - replace with actual API call
      return {
        id: id as string,
        name: "defi-protocol.doma",
        category: "tech",
        circleId: "circle-1",
        circleName: "DeFi Ventures",
        
        purchasePrice: parseEther("8"),
        currentValue: parseEther("12"),
        estimatedValue: {
          low: parseEther("10"),
          high: parseEther("15"),
          confidence: 85
        },
        
        isCollateralized: true,
        borrowedAmount: parseEther("6"),
        availableCredit: parseEther("3"),
        healthFactor: 2.1,
        liquidationPrice: parseEther("7.5"),
        collateralRatio: 60,
        
        marketComparisons: [
          {
            domain: "defi-tools.doma",
            price: parseEther("11"),
            similarity: 92,
            saleDate: new Date("2024-08-15")
          },
          {
            domain: "protocol-finance.doma", 
            price: parseEther("13"),
            similarity: 87,
            saleDate: new Date("2024-07-20")
          },
          {
            domain: "blockchain-app.doma",
            price: parseEther("9.5"),
            similarity: 78,
            saleDate: new Date("2024-06-10")
          }
        ],
        
        performanceHistory: generateMockPerformanceHistory(),
        
        registrationDate: new Date("2024-01-15"),
        expirationDate: new Date("2026-01-15"),
        owner: "0x1234567890123456789012345678901234567890",
        
        transferHistory: [
          {
            from: "0x0000000000000000000000000000000000000000",
            to: "0x1234567890123456789012345678901234567890",
            price: parseEther("8"),
            date: new Date("2024-06-15")
          }
        ],
        
        analytics: {
          views: 1247,
          inquiries: 23,
          offers: 5,
          brandability: 8.7,
          seoValue: 7.9,
          commercialPotential: 9.2
        }
      }
    },
    refetchInterval: 30000
  })

  const handleCollateralize = async () => {
    if (!domain) return
    
    setActionLoading("collateralize")
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Collateralization Updated",
        description: `${domain.name} collateral status updated successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update collateralization status",
        variant: "destructive"
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSell = async () => {
    setActionLoading("sell")
    try {
      // Navigate to sell interface
      router.push(`/marketplace/sell/${id}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleTransfer = async () => {
    setActionLoading("transfer")
    try {
      // Navigate to transfer interface
      router.push(`/portfolio/transfer/${id}`)
    } finally {
      setActionLoading(null)
    }
  }

  const getHealthFactorColor = (healthFactor: number) => {
    if (healthFactor > 2) return "text-green-600"
    if (healthFactor > 1.5) return "text-yellow-600"
    return "text-red-600"
  }

  const getHealthFactorBg = (healthFactor: number) => {
    if (healthFactor > 2) return "bg-green-50 border-green-200"
    if (healthFactor > 1.5) return "bg-yellow-50 border-yellow-200"
    return "bg-red-50 border-red-200"
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const performanceChange = domain ? 
    ((Number(formatEther(domain.currentValue)) - Number(formatEther(domain.purchasePrice))) / 
     Number(formatEther(domain.purchasePrice))) * 100 : 0

  if (isLoading) {
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

  if (error || !domain) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Domain Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The domain you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => router.push("/portfolio")}>
              Back to Portfolio
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
            <h1 className="text-3xl font-bold mb-2">{domain.name}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{domain.category}</Badge>
              <Badge variant="secondary">{domain.circleName}</Badge>
              {domain.isCollateralized && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Collateralized
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleTransfer}
              disabled={!!actionLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              Transfer
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSell}
              disabled={!!actionLoading}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sell
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Current Value</p>
                <p className="text-xl font-bold">{formatEther(domain.currentValue)} ETH</p>
                <div className={`flex items-center justify-center gap-1 mt-1 ${
                  performanceChange >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {performanceChange >= 0 ? 
                    <TrendingUp className="h-3 w-3" /> : 
                    <TrendingDown className="h-3 w-3" />
                  }
                  <span className="text-xs">
                    {performanceChange >= 0 ? "+" : ""}{performanceChange.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Purchase Price</p>
                <p className="text-xl font-bold">{formatEther(domain.purchasePrice)} ETH</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(domain.registrationDate, "MMM yyyy")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Borrowed</p>
                <p className="text-xl font-bold">{formatEther(domain.borrowedAmount)} ETH</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {domain.collateralRatio}% ratio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Health Factor</p>
                <p className={`text-xl font-bold ${getHealthFactorColor(domain.healthFactor)}`}>
                  {domain.healthFactor.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {domain.healthFactor > 2 ? "Safe" : domain.healthFactor > 1.5 ? "Moderate" : "At Risk"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance History</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={domain.performanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), "MMM dd")}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${value.toFixed(1)} ETH`}
                  />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
                    formatter={(value: any) => [`${value.toFixed(2)} ETH`, "Value"]}
                  />
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

          {/* Tabs */}
          <Tabs defaultValue="analytics" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Domain Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {domain.analytics.brandability}
                      </p>
                      <p className="text-sm text-muted-foreground">Brandability</p>
                      <Progress value={domain.analytics.brandability * 10} className="mt-2" />
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {domain.analytics.seoValue}
                      </p>
                      <p className="text-sm text-muted-foreground">SEO Value</p>
                      <Progress value={domain.analytics.seoValue * 10} className="mt-2" />
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {domain.analytics.commercialPotential}
                      </p>
                      <p className="text-sm text-muted-foreground">Commercial</p>
                      <Progress value={domain.analytics.commercialPotential * 10} className="mt-2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{domain.analytics.views.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Views</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{domain.analytics.inquiries}</p>
                      <p className="text-sm text-muted-foreground">Inquiries</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{domain.analytics.offers}</p>
                      <p className="text-sm text-muted-foreground">Offers</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{domain.estimatedValue.confidence}%</p>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="market">
              <Card>
                <CardHeader>
                  <CardTitle>Market Comparisons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {domain.marketComparisons.map((comp, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-semibold">{comp.domain}</p>
                          <p className="text-sm text-muted-foreground">
                            {comp.similarity}% similar • {format(comp.saleDate, "MMM yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatEther(comp.price)} ETH</p>
                          <Badge variant="outline" size="sm">
                            {comp.similarity}% match
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Transfer History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {domain.transferHistory.map((transfer, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            From {formatAddress(transfer.from)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            To {formatAddress(transfer.to)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatEther(transfer.price)} ETH</p>
                          <p className="text-sm text-muted-foreground">
                            {format(transfer.date, "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Domain Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Registration Date</p>
                      <p className="font-semibold">{format(domain.registrationDate, "MMM dd, yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expiration Date</p>
                      <p className="font-semibold">{format(domain.expirationDate, "MMM dd, yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Owner</p>
                      <p className="font-mono text-sm">{formatAddress(domain.owner)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Circle</p>
                      <p className="font-semibold">{domain.circleName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Collateral Status */}
          <Card className={domain.isCollateralized ? getHealthFactorBg(domain.healthFactor) : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {domain.isCollateralized ? (
                  <Lock className="h-5 w-5" />
                ) : (
                  <Unlock className="h-5 w-5" />
                )}
                Collateral Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {domain.isCollateralized ? (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Borrowed</span>
                      <span className="font-semibold">{formatEther(domain.borrowedAmount)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Available Credit</span>
                      <span className="font-semibold">{formatEther(domain.availableCredit)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Health Factor</span>
                      <span className={`font-semibold ${getHealthFactorColor(domain.healthFactor)}`}>
                        {domain.healthFactor.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Liquidation Price</span>
                      <span className="font-semibold">{formatEther(domain.liquidationPrice)} ETH</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => router.push(`/portfolio/borrow?domain=${domain.id}`)}
                    className="w-full"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Manage Borrowing
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    This domain is not currently being used as collateral.
                  </p>
                  <Button
                    onClick={handleCollateralize}
                    disabled={actionLoading === "collateralize"}
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {actionLoading === "collateralize" ? "Enabling..." : "Use as Collateral"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Valuation */}
          <Card>
            <CardHeader>
              <CardTitle>Valuation Range</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Low</span>
                  <span>{formatEther(domain.estimatedValue.low)} ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Current</span>
                  <span className="font-semibold">{formatEther(domain.currentValue)} ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>High</span>
                  <span>{formatEther(domain.estimatedValue.high)} ETH</span>
                </div>
              </div>
              
              <div className="relative">
                <Progress 
                  value={
                    ((Number(formatEther(domain.currentValue)) - Number(formatEther(domain.estimatedValue.low))) / 
                     (Number(formatEther(domain.estimatedValue.high)) - Number(formatEther(domain.estimatedValue.low)))) * 100
                  } 
                />
                <div className="text-center mt-2">
                  <Badge variant="outline">
                    {domain.estimatedValue.confidence}% confidence
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push(`/circles/${domain.circleId}/dashboard`)}
              >
                <Users className="h-4 w-4 mr-2" />
                View Circle
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open(`https://doma.io/${domain.name}`, '_blank')}
              >
                <Globe className="h-4 w-4 mr-2" />
                Visit Domain
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push(`/marketplace/domain/${domain.id}`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Marketplace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Helper function to generate mock performance history
function generateMockPerformanceHistory() {
  const history = []
  const days = 90
  const baseValue = 8 // Starting at 8 ETH
  const endValue = 12 // Ending at 12 ETH
  const valueChange = endValue - baseValue
  
  for (let i = 0; i <= days; i++) {
    const date = subDays(new Date(), days - i)
    const progress = i / days
    const trend = baseValue + (valueChange * progress)
    const volatility = trend * 0.1 * (Math.random() - 0.5) // ±10% volatility
    const value = Math.max(0, trend + volatility)
    
    history.push({ 
      date: date.toISOString(), 
      value: value
    })
  }
  
  return history
}