"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAccount } from "wagmi"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery } from "@tanstack/react-query"
import { 
  Calculator,
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Shield,
  Clock,
  DollarSign,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Activity,
  Zap,
  CheckCircle
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
  ResponsiveContainer
} from "recharts"
import { formatEther, parseEther } from "viem"
import { format, addDays } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface CollateralAsset {
  id: string
  name: string
  category: string
  currentValue: bigint
  borrowedAmount: bigint
  availableCredit: bigint
  healthFactor: number
  isSelected: boolean
  collateralRatio: number
  liquidationPrice: bigint
}

interface LoanTerms {
  interestRate: number
  liquidationThreshold: number
  borrowFee: number
  maxLTV: number
}

interface BorrowingPosition {
  id: string
  collateralAssets: CollateralAsset[]
  totalBorrowed: bigint
  totalCollateralValue: bigint
  overallHealthFactor: number
  interestAccrued: bigint
  nextPaymentDue: Date
  totalInterestPaid: bigint
}

interface BorrowTransaction {
  id: string
  type: "borrow" | "repay" | "liquidation" | "interest"
  amount: bigint
  collateral?: string
  timestamp: Date
  interestRate?: number
  healthFactorBefore: number
  healthFactorAfter: number
}

export default function BorrowingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { address } = useAccount()
  const { toast } = useToast()
  
  const selectedDomainId = searchParams.get("domain")
  
  const [borrowAmount, setBorrowAmount] = useState("")
  const [repayAmount, setRepayAmount] = useState("")
  const [selectedCollateral, setSelectedCollateral] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("borrow")
  const [loading, setLoading] = useState<string | null>(null)

  // Fetch borrowing position
  const { data: position, isLoading } = useQuery({
    queryKey: ["borrowing-position", address],
    queryFn: async (): Promise<BorrowingPosition> => {
      // Mock data - replace with actual API call
      return {
        id: "position-1",
        collateralAssets: [
          {
            id: "domain-1",
            name: "defi-protocol.doma",
            category: "tech",
            currentValue: parseEther("12"),
            borrowedAmount: parseEther("6"),
            availableCredit: parseEther("3"),
            healthFactor: 2.1,
            isSelected: selectedDomainId === "domain-1",
            collateralRatio: 60,
            liquidationPrice: parseEther("7.5")
          },
          {
            id: "domain-2",
            name: "crypto-exchange.doma", 
            category: "business",
            currentValue: parseEther("18"),
            borrowedAmount: parseEther("0"),
            availableCredit: parseEther("12"),
            healthFactor: 0,
            isSelected: false,
            collateralRatio: 0,
            liquidationPrice: parseEther("0")
          },
          {
            id: "domain-3",
            name: "premium.doma",
            category: "premium", 
            currentValue: parseEther("25"),
            borrowedAmount: parseEther("12"),
            availableCredit: parseEther("6"),
            healthFactor: 1.8,
            isSelected: false,
            collateralRatio: 50,
            liquidationPrice: parseEther("15")
          }
        ],
        totalBorrowed: parseEther("18"),
        totalCollateralValue: parseEther("55"),
        overallHealthFactor: 1.95,
        interestAccrued: parseEther("0.25"),
        nextPaymentDue: addDays(new Date(), 7),
        totalInterestPaid: parseEther("1.2")
      }
    },
    refetchInterval: 30000
  })

  // Fetch loan terms
  const { data: loanTerms } = useQuery({
    queryKey: ["loan-terms"],
    queryFn: async (): Promise<LoanTerms> => {
      return {
        interestRate: 8.5, // APR %
        liquidationThreshold: 75, // %
        borrowFee: 0.5, // %
        maxLTV: 70 // %
      }
    }
  })

  // Fetch transaction history
  const { data: transactions = [] } = useQuery({
    queryKey: ["borrow-transactions", address],
    queryFn: async (): Promise<BorrowTransaction[]> => {
      return [
        {
          id: "tx-1",
          type: "borrow",
          amount: parseEther("6"),
          collateral: "defi-protocol.doma",
          timestamp: new Date("2024-08-15"),
          interestRate: 8.5,
          healthFactorBefore: 0,
          healthFactorAfter: 2.3
        },
        {
          id: "tx-2", 
          type: "borrow",
          amount: parseEther("12"),
          collateral: "premium.doma",
          timestamp: new Date("2024-07-20"),
          interestRate: 8.2,
          healthFactorBefore: 0,
          healthFactorAfter: 2.1
        },
        {
          id: "tx-3",
          type: "interest",
          amount: parseEther("0.15"),
          timestamp: new Date("2024-09-01"),
          healthFactorBefore: 2.1,
          healthFactorAfter: 2.0
        }
      ]
    }
  })

  // Calculate metrics
  const calculateProjectedHealthFactor = (additionalBorrow: bigint = BigInt(0), additionalRepay: bigint = BigInt(0)) => {
    if (!position) return 0
    
    const newTotalBorrowed = position.totalBorrowed + additionalBorrow - additionalRepay
    const collateralValue = position.totalCollateralValue
    
    if (newTotalBorrowed <= 0) return 999 // No debt
    
    return Number(collateralValue * BigInt(75) / BigInt(100)) / Number(formatEther(newTotalBorrowed))
  }

  const calculateBorrowFee = (amount: bigint) => {
    if (!loanTerms) return BigInt(0)
    return amount * BigInt(Math.floor(loanTerms.borrowFee * 100)) / BigInt(10000)
  }

  const calculateAnnualInterest = (principal: bigint) => {
    if (!loanTerms) return BigInt(0)
    return principal * BigInt(Math.floor(loanTerms.interestRate * 100)) / BigInt(10000)
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

  const handleBorrow = async () => {
    if (!borrowAmount || !position) return
    
    setLoading("borrow")
    try {
      const borrowAmountWei = parseEther(borrowAmount)
      const projectedHealth = calculateProjectedHealthFactor(borrowAmountWei)
      
      if (projectedHealth < 1.2) {
        throw new Error("This borrow amount would put you at risk of liquidation")
      }

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Borrow Successful",
        description: `Successfully borrowed ${borrowAmount} ETH`,
      })
      
      setBorrowAmount("")
    } catch (error) {
      toast({
        title: "Borrow Failed",
        description: error instanceof Error ? error.message : "Failed to process borrow",
        variant: "destructive"
      })
    } finally {
      setLoading(null)
    }
  }

  const handleRepay = async () => {
    if (!repayAmount || !position) return
    
    setLoading("repay")
    try {
      const repayAmountWei = parseEther(repayAmount)
      
      if (repayAmountWei > position.totalBorrowed) {
        throw new Error("Repay amount exceeds total borrowed amount")
      }

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Repay Successful", 
        description: `Successfully repaid ${repayAmount} ETH`,
      })
      
      setRepayAmount("")
    } catch (error) {
      toast({
        title: "Repay Failed",
        description: error instanceof Error ? error.message : "Failed to process repayment",
        variant: "destructive"
      })
    } finally {
      setLoading(null)
    }
  }

  const projectedHealthFactor = position ? calculateProjectedHealthFactor(
    borrowAmount ? parseEther(borrowAmount) : BigInt(0),
    repayAmount ? parseEther(repayAmount) : BigInt(0)
  ) : 0

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

  if (!position) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Borrowing Position</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any domains available for collateral.
            </p>
            <Button onClick={() => router.push("/portfolio")}>
              View Portfolio
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
        <h1 className="text-3xl font-bold mb-2">Borrowing & Lending</h1>
        <p className="text-muted-foreground">
          Use your domain portfolio as collateral to access liquidity
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Borrowed</p>
                <p className="text-2xl font-bold">{formatEther(position.totalBorrowed)} ETH</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                +{formatEther(position.interestAccrued)} ETH interest accrued
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collateral Value</p>
                <p className="text-2xl font-bold">{formatEther(position.totalCollateralValue)} ETH</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                {position.collateralAssets.filter(a => a.borrowedAmount > 0).length} domains used
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={getHealthFactorBg(position.overallHealthFactor)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Health Factor</p>
                <p className={`text-2xl font-bold ${getHealthFactorColor(position.overallHealthFactor)}`}>
                  {position.overallHealthFactor.toFixed(2)}
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                {position.overallHealthFactor > 2 ? "Safe" : 
                 position.overallHealthFactor > 1.5 ? "Moderate risk" : "High risk"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Credit</p>
                <p className="text-2xl font-bold">
                  {formatEther(position.collateralAssets.reduce((sum, asset) => sum + asset.availableCredit, BigInt(0)))} ETH
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                {loanTerms?.interestRate}% APR
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Borrow/Repay Interface */}
          <Card>
            <CardHeader>
              <CardTitle>Manage Position</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="borrow">Borrow</TabsTrigger>
                  <TabsTrigger value="repay">Repay</TabsTrigger>
                </TabsList>

                <TabsContent value="borrow" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Borrow Amount (ETH)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={borrowAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBorrowAmount(e.target.value)}
                    />
                    {borrowAmount && (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div>Borrow fee: {formatEther(calculateBorrowFee(parseEther(borrowAmount)))} ETH</div>
                        <div>Annual interest: {formatEther(calculateAnnualInterest(parseEther(borrowAmount)))} ETH</div>
                      </div>
                    )}
                  </div>

                  {borrowAmount && (
                    <div className={`p-3 rounded-lg ${getHealthFactorBg(projectedHealthFactor)}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Projected Health Factor</span>
                        <span className={`font-bold ${getHealthFactorColor(projectedHealthFactor)}`}>
                          {projectedHealthFactor.toFixed(2)}
                        </span>
                      </div>
                      {projectedHealthFactor < 1.5 && (
                        <div className="flex items-center gap-1 mt-1 text-yellow-600 text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          Warning: Low health factor increases liquidation risk
                        </div>
                      )}
                    </div>
                  )}

                  <Button 
                    onClick={handleBorrow}
                    disabled={!borrowAmount || Number(borrowAmount) <= 0 || loading === "borrow" || projectedHealthFactor < 1.2}
                    className="w-full"
                  >
                    {loading === "borrow" ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Borrow {borrowAmount || "0"} ETH
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="repay" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Repay Amount (ETH)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={repayAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepayAmount(e.target.value)}
                      max={formatEther(position.totalBorrowed)}
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>Available to repay: {formatEther(position.totalBorrowed)} ETH</span>
                      <button
                        type="button"
                        onClick={() => setRepayAmount(formatEther(position.totalBorrowed))}
                        className="text-blue-600 hover:underline"
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  {repayAmount && (
                    <div className={`p-3 rounded-lg ${getHealthFactorBg(projectedHealthFactor)}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Projected Health Factor</span>
                        <span className={`font-bold ${getHealthFactorColor(projectedHealthFactor)}`}>
                          {projectedHealthFactor === 999 ? "∞" : projectedHealthFactor.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Repaying will improve your health factor and reduce liquidation risk
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleRepay}
                    disabled={!repayAmount || Number(repayAmount) <= 0 || loading === "repay"}
                    className="w-full"
                  >
                    {loading === "repay" ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Repay {repayAmount || "0"} ETH
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Collateral Assets */}
          <Card>
            <CardHeader>
              <CardTitle>Collateral Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {position.collateralAssets.map((asset) => (
                  <div key={asset.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{asset.name}</h4>
                        <Badge variant="outline" size="sm">{asset.category}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatEther(asset.currentValue)} ETH</p>
                        <p className="text-xs text-muted-foreground">Current Value</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Borrowed</p>
                        <p className="font-medium">{formatEther(asset.borrowedAmount)} ETH</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Available</p>
                        <p className="font-medium">{formatEther(asset.availableCredit)} ETH</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Health Factor</p>
                        <p className={`font-medium ${
                          asset.borrowedAmount > 0 ? getHealthFactorColor(asset.healthFactor) : "text-muted-foreground"
                        }`}>
                          {asset.borrowedAmount > 0 ? asset.healthFactor.toFixed(2) : "N/A"}
                        </p>
                      </div>
                    </div>

                    {asset.borrowedAmount > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Liquidation Price: {formatEther(asset.liquidationPrice)} ETH</span>
                          <span>LTV: {asset.collateralRatio}%</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/portfolio/domain/${asset.id}`)}
                      >
                        View Details
                      </Button>
                      {asset.borrowedAmount === BigInt(0) && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setBorrowAmount("1")
                            setActiveTab("borrow")
                          }}
                        >
                          Use as Collateral
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Loan Terms */}
          {loanTerms && (
            <Card>
              <CardHeader>
                <CardTitle>Loan Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Interest Rate</span>
                  <span className="font-semibold">{loanTerms.interestRate}% APR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Liquidation Threshold</span>
                  <span className="font-semibold">{loanTerms.liquidationThreshold}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Borrow Fee</span>
                  <span className="font-semibold">{loanTerms.borrowFee}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Max LTV</span>
                  <span className="font-semibold">{loanTerms.maxLTV}%</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Warning */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                Risk Warning
              </CardTitle>
            </CardHeader>
            <CardContent className="text-yellow-700 text-sm space-y-2">
              <p>• Domain values can be volatile</p>
              <p>• Maintain health factor above 1.5</p>
              <p>• Monitor liquidation risk regularly</p>
              <p>• Interest accrues continuously</p>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        {tx.type === "borrow" ? (
                          <ArrowUpRight className="h-3 w-3 text-blue-600" />
                        ) : tx.type === "repay" ? (
                          <ArrowDownRight className="h-3 w-3 text-green-600" />
                        ) : (
                          <Clock className="h-3 w-3 text-orange-600" />
                        )}
                        <span className="capitalize">{tx.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(tx.timestamp, "MMM dd")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatEther(tx.amount)} ETH</p>
                      {tx.collateral && (
                        <p className="text-xs text-muted-foreground">{tx.collateral}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3">
                View All Transactions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}