'use client'

import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance, useEnsName } from 'wagmi'
import { useWalletStore } from '@/store'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Copy, ExternalLink, LogOut, Settings, User, Wallet } from 'lucide-react'
import { formatEther } from 'viem'
import { cn } from '@/lib/utils'

interface WalletConnectButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function WalletConnectButton({ 
  className,
  variant = 'default',
  size = 'md'
}: WalletConnectButtonProps) {
  const { address, isConnected, chain } = useAccount()
  const { data: balance } = useBalance({ address })
  const { data: ensName } = useEnsName({ address })
  const { setWalletState, disconnect } = useWalletStore()

  // Sync wallet state with Zustand store
  React.useEffect(() => {
    setWalletState({
      isConnected,
      address: address || null,
      chainId: chain?.id || null,
      balance: balance ? formatEther(balance.value) : null,
      ensName: ensName || null,
    })
  }, [isConnected, address, chain, balance, ensName, setWalletState])

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      // TODO: Add toast notification
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'h-8 px-3 text-sm'
      case 'lg': return 'h-11 px-8'
      default: return 'h-10 px-4'
    }
  }

  if (!isConnected) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal, connectModalOpen }) => (
          <Button
            onClick={openConnectModal}
            className={cn(getButtonSize(), className)}
            variant={variant}
            disabled={connectModalOpen}
          >
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet
          </Button>
        )}
      </ConnectButton.Custom>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-2 min-w-[200px] justify-start",
            getButtonSize(),
            className
          )}
        >
          <Avatar className="w-6 h-6">
            <AvatarImage src={`https://avatar.vercel.sh/${address}`} />
            <AvatarFallback>
              {ensName ? ensName[0].toUpperCase() : address?.slice(2, 4).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">
              {ensName || truncateAddress(address!)}
            </span>
            {balance && (
              <span className="text-xs text-muted-foreground">
                {parseFloat(formatEther(balance.value)).toFixed(4)} {balance.symbol}
              </span>
            )}
          </div>
          
          {chain && (
            <Badge variant="secondary" className="ml-auto">
              {chain.name}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={`https://avatar.vercel.sh/${address}`} />
              <AvatarFallback>
                {ensName ? ensName[0].toUpperCase() : address?.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {ensName || truncateAddress(address!)}
              </span>
              <span className="text-xs text-muted-foreground">
                {truncateAddress(address!)}
              </span>
            </div>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="w-4 h-4 mr-2" />
          Copy Address
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <ExternalLink className="w-4 h-4 mr-2" />
          View on Explorer
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem>
          <User className="w-4 h-4 mr-2" />
          Profile
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <ConnectButton.Custom>
          {({ openChainModal }) => (
            <DropdownMenuItem onClick={openChainModal}>
              <Wallet className="w-4 h-4 mr-2" />
              Switch Network
            </DropdownMenuItem>
          )}
        </ConnectButton.Custom>
        
        <DropdownMenuItem 
          onClick={handleDisconnect}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}