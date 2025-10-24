import React, { createContext, useContext, ReactNode } from 'react'
import { useCommunication, CommunicationEvent, CommunicationStats, ConnectionStatus } from '@/hooks/useCommunication'

interface CommunicationContextType {
  events: CommunicationEvent[]
  isConnected: boolean
  connectionStatus: ConnectionStatus
  stats: CommunicationStats
  addEvent: (event: Omit<CommunicationEvent, 'id' | 'timestamp'>) => void
  clearEvents: () => void
  clearInactiveEvents: () => void
}

const CommunicationContext = createContext<CommunicationContextType | undefined>(undefined)

interface CommunicationProviderProps {
  children: ReactNode
}

export const CommunicationProvider: React.FC<CommunicationProviderProps> = ({ children }) => {
  const communication = useCommunication()

  return (
    <CommunicationContext.Provider value={communication}>
      {children}
    </CommunicationContext.Provider>
  )
}

export const useCommunicationContext = (): CommunicationContextType => {
  const context = useContext(CommunicationContext)
  if (context === undefined) {
    throw new Error('useCommunicationContext must be used within a CommunicationProvider')
  }
  return context
}
