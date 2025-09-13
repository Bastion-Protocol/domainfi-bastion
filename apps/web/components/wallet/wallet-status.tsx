'use client'

import React from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { WalletConnectButton } from './wallet-connect-button'
import { ChainSwitcher } from './chain-switcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Wallet, Network, X } from 'lucide-react'
import { useChainValidation } from './chain-switcher'
import { useWalletStore, useNotifications } from '@/store'

interface WalletStatusProps {
  className?: string
}

export function WalletStatus({ className }: WalletStatusProps) {
  const { isConnected, isConnecting, isReconnecting } = useAccount()
  const { isSupported, chain } = useChainValidation()
  const { disconnect } = useDisconnect()
  const { showSuccess } = useNotifications()

  const handleDisconnect = () => {
    disconnect()
    showSuccess('Wallet Disconnected', 'Your wallet has been disconnected successfully.')
  }

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Connection
          </CardTitle>
          <CardDescription>
            Connect your wallet to interact with Bastion Protocol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Wallet not connected
            </div>
            <WalletConnectButton />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isConnecting || isReconnecting) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">
              {isConnecting ? 'Connecting wallet...' : 'Reconnecting wallet...'}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Connected
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium">Connected</span>
          <Badge variant="secondary" className="ml-auto">
            Active
          </Badge>
        </div>

        {/* Network Status */}
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4" />
          <span className="text-sm font-medium">Network</span>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant={isSupported ? "default" : "destructive"}>
              {chain?.name || 'Unknown'}
            </Badge>
            {!isSupported && (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
          </div>
        </div>

        {/* Warning for unsupported network */}
        {!isSupported && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-300">
                  Unsupported Network
                </p>
                <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                  Switch to Doma Testnet or Avalanche Fuji to access all features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <WalletConnectButton variant="outline" size="sm" className="flex-1" />
          <ChainSwitcher className="flex-1" />
        </div>
      </CardContent>
    </Card>
  )
}

// Simplified status indicator for navigation bars
export function WalletStatusIndicator() {
  const { isConnected } = useAccount()
  const { isSupported } = useChainValidation()

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full" />
        <span className="text-sm text-muted-foreground">Disconnected</span>
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
        <span className="text-sm text-muted-foreground">Wrong Network</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-green-500 rounded-full" />
      <span className="text-sm text-muted-foreground">Connected</span>
    </div>
  )
}