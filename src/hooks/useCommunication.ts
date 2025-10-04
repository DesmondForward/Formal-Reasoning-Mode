import { useState, useEffect, useCallback, useRef } from 'react'

export interface CommunicationEvent {
  id: string
  timestamp: Date
  source: 'FRM' | 'MCP' | 'GPT-5'
  target: 'FRM' | 'MCP' | 'GPT-5'
  type: 'request' | 'response' | 'error' | 'info'
  message: string
  data?: any
  duration?: number
  priority?: 'low' | 'medium' | 'high'
  status?: 'pending' | 'completed' | 'failed'
}

export interface CommunicationStats {
  totalEvents: number
  eventsBySource: Record<string, number>
  eventsByType: Record<string, number>
  averageResponseTime: number
  errorCount: number
  successRate: number
  recentActivity: boolean
  peakResponseTime: number
  minResponseTime: number
}

export interface ConnectionStatus {
  isConnected: boolean
  lastHeartbeat: Date
  connectionQuality: 'excellent' | 'good' | 'poor' | 'standby'
  latency: number
}

export const useCommunication = () => {
  const [events, setEvents] = useState<CommunicationEvent[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: true,
    lastHeartbeat: new Date(),
    connectionQuality: 'excellent',
    latency: 0
  })
  const [stats, setStats] = useState<CommunicationStats>({
    totalEvents: 0,
    eventsBySource: {},
    eventsByType: {},
    averageResponseTime: 0,
    errorCount: 0,
    successRate: 100,
    recentActivity: false,
    peakResponseTime: 0,
    minResponseTime: 0
  })
  
  // Performance tracking
  const eventBatchRef = useRef<CommunicationEvent[]>([])
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxEvents = 1000 // Maximum events to keep in memory
  const batchDelay = 100 // Batch events for 100ms before processing

  const addEvent = useCallback((event: Omit<CommunicationEvent, 'id' | 'timestamp'>) => {
    const newEvent: CommunicationEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${performance.now()}`,
      timestamp: new Date(),
      priority: event.priority || (event.type === 'error' ? 'high' : event.type === 'request' ? 'medium' : 'low'),
      status: event.status || (event.type === 'request' ? 'pending' : 'completed')
    }
    
    // Add to batch
    eventBatchRef.current.push(newEvent)
    
    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
    }
    
    // Set new timeout to process batch
    batchTimeoutRef.current = setTimeout(() => {
      const eventsToAdd = [...eventBatchRef.current]
      eventBatchRef.current = []
      
      setEvents(prev => {
        const updated = [...prev, ...eventsToAdd].slice(-maxEvents)
        return updated
      })
    }, batchDelay)
  }, [maxEvents, batchDelay])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  const clearInactiveEvents = useCallback(() => {
    const now = Date.now()
    const inactiveThreshold = 5 * 60 * 1000 // 5 minutes in milliseconds
    
    setEvents(prev => prev.filter(event => {
      const eventAge = now - event.timestamp.getTime()
      return eventAge < inactiveThreshold
    }))
  }, [])

  const updateStats = useCallback((events: CommunicationEvent[]) => {
    const totalEvents = events.length
    const eventsBySource = events.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const responseEvents = events.filter(e => e.type === 'response' && e.duration)
    const errorEvents = events.filter(e => e.type === 'error')
    
    const responseTimes = responseEvents.map(e => e.duration || 0)
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0
    
    const peakResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0
    
    const errorCount = errorEvents.length
    const successRate = totalEvents > 0 ? ((totalEvents - errorCount) / totalEvents) * 100 : 100
    
    // Check for recent activity (events in last 30 seconds)
    const now = Date.now()
    const recentThreshold = 30 * 1000 // 30 seconds
    const recentActivity = events.some(e => (now - e.timestamp.getTime()) < recentThreshold)

    setStats({
      totalEvents,
      eventsBySource,
      eventsByType,
      averageResponseTime,
      errorCount,
      successRate,
      recentActivity,
      peakResponseTime,
      minResponseTime
    })
  }, [])

  // Update stats whenever events change
  useEffect(() => {
    updateStats(events)
  }, [events, updateStats])

  // Monitor connection heartbeat and quality
  useEffect(() => {
    const checkConnection = () => {
      const now = Date.now()
      const timeSinceLastHeartbeat = now - connectionStatus.lastHeartbeat.getTime()
      
      let connectionQuality: 'excellent' | 'good' | 'poor' | 'standby' = 'excellent'
      let isConnected = true
      
      if (timeSinceLastHeartbeat > 10000) {
        isConnected = false
        connectionQuality = 'standby'
      } else if (timeSinceLastHeartbeat > 5000) {
        connectionQuality = 'poor'
      } else if (timeSinceLastHeartbeat > 2000) {
        connectionQuality = 'good'
      }
      
      // Calculate latency based on recent events
      const recentEvents = events.filter(e => (now - e.timestamp.getTime()) < 5000)
      const avgLatency = recentEvents.length > 0 
        ? recentEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / recentEvents.length
        : 0
      
      setConnectionStatus(prev => ({
        ...prev,
        isConnected,
        connectionQuality,
        latency: avgLatency
      }))
      
      setIsConnected(isConnected)
    }

    const interval = setInterval(checkConnection, 2000) // Check every 2 seconds
    
    return () => clearInterval(interval)
  }, [connectionStatus.lastHeartbeat, events])

  // Listen for communication events from main process
  useEffect(() => {
    const handleCommunicationEvent = (event: CommunicationEvent) => {
      addEvent(event)
      // Update heartbeat on any communication event
      setConnectionStatus(prev => ({
        ...prev,
        lastHeartbeat: new Date()
      }))
    }

    const handleConnectionStatus = (connected: boolean) => {
      setIsConnected(connected)
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: connected,
        lastHeartbeat: new Date(),
        connectionQuality: connected ? 'excellent' : 'standby'
      }))
    }

    const cleanup = () => {
      if (window.electronAPI) {
        // Properly remove event listeners if they exist
        if (typeof window.electronAPI.removeAllListeners === 'function') {
          window.electronAPI.removeAllListeners('communication-event')
          window.electronAPI.removeAllListeners('connection-status')
        }
      }
    }

    // Check if electronAPI is available
    const setupListeners = () => {
      if (window.electronAPI) {
        console.log('Setting up IPC listeners')
        try {
          window.electronAPI.onCommunicationEvent?.(handleCommunicationEvent)
          window.electronAPI.onConnectionStatus?.(handleConnectionStatus)
          console.log('IPC listeners set up successfully')
          return true
        } catch (error) {
          console.error('Failed to set up IPC listeners:', error)
          return false
        }
      }
      console.log('electronAPI not available yet')
      return false
    }

    // Try to setup listeners immediately
    if (!setupListeners()) {
      // If not available, try again after a short delay
      const timeoutId = setTimeout(() => {
        console.log('Retrying to set up IPC listeners...')
        if (setupListeners()) {
          console.log('IPC listeners set up successfully on retry')
        } else {
          console.warn('Failed to set up IPC listeners on retry')
        }
      }, 100)

      return () => {
        clearTimeout(timeoutId)
        cleanup()
      }
    }

    return cleanup
  }, [addEvent])

  return {
    events,
    isConnected,
    connectionStatus,
    stats,
    addEvent,
    clearEvents,
    clearInactiveEvents
  }
}
