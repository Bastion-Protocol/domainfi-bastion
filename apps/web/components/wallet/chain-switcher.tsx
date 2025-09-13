'use client'

import React from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { domaTestnet } from '@/lib/wagmi'
import { avalancheFuji } from 'wagmi/chains'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, Network, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/store'

interface ChainSwitcherProps {
  className?: string
}

const supportedChains = [domaTestnet, avalancheFuji]

export function ChainSwitcher({ className }: ChainSwitcherProps) {
  const { chain, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const { showError, showSuccess } = useNotifications()

  const handleChainSwitch = async (chainId: number) => {
    try {
      await switchChain({ chainId })
      const targetChain = supportedChains.find(c => c.id === chainId)
      showSuccess(
        'Network Switched',
        `Successfully switched to ${targetChain?.name || 'Unknown Network'}`
      )
    } catch (error) {
      console.error('Failed to switch chain:', error)
      showError(
        'Network Switch Failed',
        'Failed to switch network. Please try again or switch manually in your wallet.'
      )
    }
  }

  const getCurrentChainInfo = () => {
    if (!chain) return null
    
    const isSupported = supportedChains.some(c => c.id === chain.id)
    return {
      ...chain,
      isSupported,
    }
  }

  const chainInfo = getCurrentChainInfo()

  if (!isConnected) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("flex items-center gap-2", className)}
          disabled={isPending}
        >
          <Network className="w-4 h-4" />
          {chainInfo ? (
            <>
              <span className="hidden sm:inline">{chainInfo.name}</span>
              <Badge 
                variant={chainInfo.isSupported ? "default" : "destructive"}
                className="hidden sm:inline-flex"
              >
                {chainInfo.isSupported ? "Supported" : "Unsupported"}
              </Badge>
            </>
          ) : (
            <span>Unknown Network</span>
          )}
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        {!chainInfo?.isSupported && (
          <div className="px-2 py-1.5 mb-2 bg-destructive/10 rounded-md">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Unsupported Network</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Please switch to a supported network to use all features.
            </p>
          </div>
        )}
        
        <div className="px-2 py-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Supported Networks
          </p>
        </div>
        
        {supportedChains.map((supportedChain) => (
          <DropdownMenuItem
            key={supportedChain.id}
            onClick={() => handleChainSwitch(supportedChain.id)}
            className={cn(
              "flex items-center justify-between",
              chain?.id === supportedChain.id && "bg-accent"
            )}
            disabled={isPending || chain?.id === supportedChain.id}
          >
            <div className="flex items-center gap-2">
              <div 
                className={cn(
                  "w-2 h-2 rounded-full",
                  chain?.id === supportedChain.id 
                    ? "bg-green-500" 
                    : "bg-gray-300"
                )}
              />
              <span>{supportedChain.name}</span>
            </div>
            
            {chain?.id === supportedChain.id && (
              <Badge variant="secondary" className="text-xs">
                Current
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
        
        {chainInfo && !chainInfo.isSupported && (
          <>
            <div className="px-2 py-1 mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Current Network
              </p>
            </div>
            
            <DropdownMenuItem disabled className="opacity-50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>{chainInfo.name}</span>
              </div>
              <Badge variant="destructive" className="text-xs ml-auto">
                Unsupported
              </Badge>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Hook for chain-specific logic
export function useChainValidation() {
  const { chain } = useAccount()
  
  const isSupported = React.useMemo(() => {
    if (!chain) return false
    return supportedChains.some(c => c.id === chain.id)
  }, [chain])
  
  const isDoma = chain?.id === domaTestnet.id
  const isAvalanche = chain?.id === avalancheFuji.id
  
  return {
    chain,
    isSupported,
    isDoma,
    isAvalanche,
    supportedChains,
  }
}