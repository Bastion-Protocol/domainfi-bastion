import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Address } from 'viem'

// Domain interfaces
export interface Domain {
  tokenId: string
  name: string
  owner: Address
  custodian: Address
  chain: 'doma' | 'avalanche'
  registrationDate: Date
  expirationDate: Date
  isActive: boolean
  metadata?: {
    description?: string
    image?: string
    attributes?: Array<{
      trait_type: string
      value: string | number
    }>
  }
}

export interface Circle {
  address: Address
  name: string
  creator: Address
  members: Address[]
  domains: Domain[]
  createdAt: Date
  totalValue?: number
}

export interface ValuationData {
  domainTokenId: string
  estimatedValue: number
  confidenceScore: number
  methodology: string
  timestamp: Date
  expiresAt: Date
}

// UI State interfaces
export interface UIState {
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean
  activeModal: string | null
  notifications: Notification[]
  loading: {
    wallet: boolean
    domains: boolean
    circles: boolean
    valuations: boolean
  }
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
  autoHide?: boolean
}

// Store interfaces
interface DomainStore {
  domains: Domain[]
  selectedDomain: Domain | null
  valuations: Record<string, ValuationData>
  
  // Actions
  setDomains: (domains: Domain[]) => void
  addDomain: (domain: Domain) => void
  updateDomain: (tokenId: string, updates: Partial<Domain>) => void
  removeDomain: (tokenId: string) => void
  setSelectedDomain: (domain: Domain | null) => void
  setValuation: (tokenId: string, valuation: ValuationData) => void
  getValuation: (tokenId: string) => ValuationData | undefined
}

interface CircleStore {
  circles: Circle[]
  selectedCircle: Circle | null
  userCircles: Address[]
  
  // Actions
  setCircles: (circles: Circle[]) => void
  addCircle: (circle: Circle) => void
  updateCircle: (address: Address, updates: Partial<Circle>) => void
  removeCircle: (address: Address) => void
  setSelectedCircle: (circle: Circle | null) => void
  setUserCircles: (addresses: Address[]) => void
}

interface WalletStore {
  isConnected: boolean
  address: Address | null
  chainId: number | null
  balance: string | null
  ensName: string | null
  
  // Actions
  setWalletState: (state: Partial<WalletStore>) => void
  disconnect: () => void
}

interface UIStore extends UIState {
  // Actions
  setTheme: (theme: UIState['theme']) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setActiveModal: (modal: string | null) => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
  setLoading: (key: keyof UIState['loading'], loading: boolean) => void
}

// Create stores
export const useDomainStore = create<DomainStore>()(
  devtools(
    persist(
      (set, get) => ({
        domains: [],
        selectedDomain: null,
        valuations: {},

        setDomains: (domains) => set({ domains }),
        
        addDomain: (domain) => set((state) => ({
          domains: [...state.domains, domain]
        })),
        
        updateDomain: (tokenId, updates) => set((state) => ({
          domains: state.domains.map(domain =>
            domain.tokenId === tokenId ? { ...domain, ...updates } : domain
          )
        })),
        
        removeDomain: (tokenId) => set((state) => ({
          domains: state.domains.filter(domain => domain.tokenId !== tokenId),
          selectedDomain: state.selectedDomain?.tokenId === tokenId ? null : state.selectedDomain
        })),
        
        setSelectedDomain: (domain) => set({ selectedDomain: domain }),
        
        setValuation: (tokenId, valuation) => set((state) => ({
          valuations: { ...state.valuations, [tokenId]: valuation }
        })),
        
        getValuation: (tokenId) => get().valuations[tokenId],
      }),
      {
        name: 'bastion-domains',
        partialize: (state) => ({
          domains: state.domains,
          valuations: state.valuations,
        }),
      }
    ),
    { name: 'domain-store' }
  )
)

export const useCircleStore = create<CircleStore>()(
  devtools(
    persist(
      (set) => ({
        circles: [],
        selectedCircle: null,
        userCircles: [],

        setCircles: (circles) => set({ circles }),
        
        addCircle: (circle) => set((state) => ({
          circles: [...state.circles, circle]
        })),
        
        updateCircle: (address, updates) => set((state) => ({
          circles: state.circles.map(circle =>
            circle.address === address ? { ...circle, ...updates } : circle
          )
        })),
        
        removeCircle: (address) => set((state) => ({
          circles: state.circles.filter(circle => circle.address !== address),
          selectedCircle: state.selectedCircle?.address === address ? null : state.selectedCircle
        })),
        
        setSelectedCircle: (circle) => set({ selectedCircle: circle }),
        
        setUserCircles: (addresses) => set({ userCircles: addresses }),
      }),
      {
        name: 'bastion-circles',
        partialize: (state) => ({
          circles: state.circles,
          userCircles: state.userCircles,
        }),
      }
    ),
    { name: 'circle-store' }
  )
)

export const useWalletStore = create<WalletStore>()(
  devtools(
    (set) => ({
      isConnected: false,
      address: null,
      chainId: null,
      balance: null,
      ensName: null,

      setWalletState: (state) => set((current) => ({ ...current, ...state })),
      
      disconnect: () => set({
        isConnected: false,
        address: null,
        chainId: null,
        balance: null,
        ensName: null,
      }),
    }),
    { name: 'wallet-store' }
  )
)

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'system',
        sidebarOpen: true,
        activeModal: null,
        notifications: [],
        loading: {
          wallet: false,
          domains: false,
          circles: false,
          valuations: false,
        },

        setTheme: (theme) => set({ theme }),
        
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        
        setActiveModal: (modal) => set({ activeModal: modal }),
        
        addNotification: (notification) => {
          const id = Math.random().toString(36).substring(2, 9)
          const newNotification: Notification = {
            ...notification,
            id,
            timestamp: new Date(),
            read: false,
          }
          
          set((state) => ({
            notifications: [newNotification, ...state.notifications]
          }))
          
          // Auto-hide notification after 5 seconds if specified
          if (notification.autoHide !== false) {
            setTimeout(() => {
              get().removeNotification(id)
            }, 5000)
          }
        },
        
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
        
        markNotificationRead: (id) => set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          )
        })),
        
        clearNotifications: () => set({ notifications: [] }),
        
        setLoading: (key, loading) => set((state) => ({
          loading: { ...state.loading, [key]: loading }
        })),
      }),
      {
        name: 'bastion-ui',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    { name: 'ui-store' }
  )
)

// Utility hooks for complex operations
export const useNotifications = () => {
  const { notifications, addNotification, removeNotification, markNotificationRead, clearNotifications } = useUIStore()
  
  const showSuccess = (title: string, message: string) => {
    addNotification({ type: 'success', title, message })
  }
  
  const showError = (title: string, message: string) => {
    addNotification({ type: 'error', title, message, autoHide: false })
  }
  
  const showWarning = (title: string, message: string) => {
    addNotification({ type: 'warning', title, message })
  }
  
  const showInfo = (title: string, message: string) => {
    addNotification({ type: 'info', title, message })
  }
  
  return {
    notifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    markNotificationRead,
    clearNotifications,
  }
}

export const useLoading = () => {
  const { loading, setLoading } = useUIStore()
  
  const setDomainLoading = (loading: boolean) => setLoading('domains', loading)
  const setCircleLoading = (loading: boolean) => setLoading('circles', loading)
  const setValuationLoading = (loading: boolean) => setLoading('valuations', loading)
  const setWalletLoading = (loading: boolean) => setLoading('wallet', loading)
  
  return {
    loading,
    setDomainLoading,
    setCircleLoading,
    setValuationLoading,
    setWalletLoading,
  }
}