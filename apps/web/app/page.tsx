'use client'

import React from 'react'
import { WalletConnectButton, ChainSwitcher, WalletStatus } from '@/components/wallet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAccount } from 'wagmi'
import { useChainValidation } from '@/components/wallet/chain-switcher'
import { 
  Coins, 
  Globe, 
  Shield, 
  Zap, 
  ArrowRight, 
  CheckCircle, 
  Users, 
  BarChart3,
  ExternalLink 
} from 'lucide-react'

export default function HomePage() {
  const { isConnected } = useAccount()
  const { isSupported } = useChainValidation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">Bastion Protocol</span>
          </div>
          
          <div className="flex items-center gap-4">
            {isConnected && <ChainSwitcher />}
            <WalletConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Cross-Chain Domain Management
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Manage your domains across multiple blockchains with advanced custody solutions, 
            real-time valuations, and seamless cross-chain operations.
          </p>
          
          {!isConnected ? (
            <WalletConnectButton size="lg" className="mb-8" />
          ) : !isSupported ? (
            <div className="mb-8">
              <ChainSwitcher className="mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">
                Switch to a supported network to continue
              </p>
            </div>
          ) : (
            <div className="flex gap-4 justify-center mb-8">
              <Button size="lg">
                Manage Domains
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg">
                Create Circle
                <Users className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>

        {/* Wallet Status Card */}
        {isConnected && (
          <div className="mb-12">
            <WalletStatus className="max-w-md mx-auto" />
          </div>
        )}

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <Globe className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Cross-Chain Support</CardTitle>
              <CardDescription>
                Manage domains across Doma and Avalanche networks seamlessly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Doma Testnet</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Avalanche Fuji</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Secure Custody</CardTitle>
              <CardDescription>
                Advanced custody management with HSM integration and multi-sig support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">HSM Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Multi-sig Wallets</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Real-time Valuations</CardTitle>
              <CardDescription>
                Professional domain valuations with ML algorithms and market analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">ML Algorithms</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Market Analysis</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Domain Circles</CardTitle>
              <CardDescription>
                Collaborative domain management with shared custody and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Shared Management</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Role-based Access</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Automated Relayer</CardTitle>
              <CardDescription>
                Automated cross-chain operations with failover and retry mechanisms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Auto-sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Failover Support</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Coins className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Portfolio Analytics</CardTitle>
              <CardDescription>
                Comprehensive portfolio tracking with historical data and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Portfolio Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Historical Charts</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Network Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Doma Testnet</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Avalanche Fuji</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Relayer Service</span>
                  <Badge variant="default">Running</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Valuation API</span>
                  <Badge variant="default">Online</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Platform Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Total Domains</span>
                  <span className="font-semibold">1,234</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Circles</span>
                  <span className="font-semibold">567</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Value</span>
                  <span className="font-semibold">$2.1M</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cross-chain Ops</span>
                  <span className="font-semibold">8,901</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        {!isConnected && (
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Ready to Get Started?</CardTitle>
              <CardDescription>
                Connect your wallet to start managing your domains across multiple blockchains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletConnectButton size="lg" />
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-semibold">Bastion Protocol</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Documentation
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Discord
              </a>
              <a href="#" className="hover:text-foreground transition-colors flex items-center gap-1">
                API
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground mt-4 pt-4 border-t">
            © 2024 Bastion Protocol. Built for the decentralized web.
          </div>
        </div>
      </footer>
    </div>
  )
}