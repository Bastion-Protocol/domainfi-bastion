import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'

interface WebSocketConfig {
  url: string
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
}

interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
}

export function useWebSocket(config: WebSocketConfig) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const { toast } = useToast()
  
  const ws = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const messageHandlersRef = useRef<Map<string, ((data: any) => void)[]>>(new Map())

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    setConnectionState('connecting')
    
    try {
      ws.current = new WebSocket(config.url)

      ws.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionState('connected')
        reconnectAttemptsRef.current = 0

        // Start heartbeat
        if (config.heartbeatInterval) {
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
            }
          }, config.heartbeatInterval)
        }

        toast({
          title: "Connected",
          description: "Real-time updates are now active.",
        })
      }

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)

          // Handle heartbeat response
          if (message.type === 'pong') return

          // Call registered handlers
          const handlers = messageHandlersRef.current.get(message.type) || []
          handlers.forEach(handler => handler(message.data))
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setConnectionState('disconnected')
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }

        // Attempt reconnection
        if (!event.wasClean && reconnectAttemptsRef.current < (config.reconnectAttempts || 5)) {
          reconnectAttemptsRef.current++
          const delay = (config.reconnectDelay || 3000) * Math.pow(2, reconnectAttemptsRef.current - 1)
          
          toast({
            title: "Connection Lost",
            description: `Attempting to reconnect... (${reconnectAttemptsRef.current}/${config.reconnectAttempts || 5})`,
            variant: "destructive"
          })

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, Math.min(delay, 30000)) // Cap at 30 seconds
        } else if (reconnectAttemptsRef.current >= (config.reconnectAttempts || 5)) {
          setConnectionState('error')
          toast({
            title: "Connection Failed",
            description: "Unable to establish real-time connection. Please refresh the page.",
            variant: "destructive"
          })
        }
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionState('error')
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setConnectionState('error')
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }

    if (ws.current) {
      ws.current.close(1000, 'User disconnected')
      ws.current = null
    }
    
    setIsConnected(false)
    setConnectionState('disconnected')
    reconnectAttemptsRef.current = 0
  }

  const sendMessage = (type: string, data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data,
        timestamp: Date.now()
      }
      ws.current.send(JSON.stringify(message))
      return true
    }
    return false
  }

  const subscribe = (messageType: string, handler: (data: any) => void) => {
    const handlers = messageHandlersRef.current.get(messageType) || []
    handlers.push(handler)
    messageHandlersRef.current.set(messageType, handlers)

    // Return unsubscribe function
    return () => {
      const currentHandlers = messageHandlersRef.current.get(messageType) || []
      const filteredHandlers = currentHandlers.filter(h => h !== handler)
      if (filteredHandlers.length === 0) {
        messageHandlersRef.current.delete(messageType)
      } else {
        messageHandlersRef.current.set(messageType, filteredHandlers)
      }
    }
  }

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [config.url])

  return {
    isConnected,
    connectionState,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    subscribe
  }
}

// Hook for auction-specific WebSocket connection
export function useAuctionWebSocket() {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
  
  return useWebSocket({
    url: `${wsUrl}/auctions`,
    reconnectAttempts: 5,
    reconnectDelay: 3000,
    heartbeatInterval: 30000
  })
}

// Hook for Circle-specific WebSocket connection
export function useCircleWebSocket(circleId?: string) {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
  const url = circleId ? `${wsUrl}/circles/${circleId}` : `${wsUrl}/circles`
  
  return useWebSocket({
    url,
    reconnectAttempts: 5,
    reconnectDelay: 3000,
    heartbeatInterval: 30000
  })
}