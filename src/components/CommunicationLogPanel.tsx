import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Send,
  MessageSquare,
  Database,
  Search,
  Download,
  Pause,
  Play,
  Zap,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  TrendingUp
} from 'lucide-react'
import { useCommunication, CommunicationEvent } from '@/hooks/useCommunication'
import { copyToClipboard as copyToClipboardUtil } from '@/utils/clipboard'

const CommunicationLogPanel: React.FC = () => {
  const { events, isConnected, connectionStatus, stats, clearEvents, clearInactiveEvents, addEvent } = useCommunication()
  const [isExpanded, setIsExpanded] = useState(true)
  const [filter, setFilter] = useState<'all' | 'FRM' | 'MCP' | 'GPT-5'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'request' | 'response' | 'error' | 'info'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [showDataDetails] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [focusedEventIndex, setFocusedEventIndex] = useState<number>(-1)

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events, autoScroll, isPaused])

  // Enhanced filtering with search
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const sourceMatch = filter === 'all' || event.source === filter
      const typeMatch = typeFilter === 'all' || event.type === typeFilter
      const searchMatch = !searchQuery || 
        event.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.data && JSON.stringify(event.data).toLowerCase().includes(searchQuery.toLowerCase()))
      
      return sourceMatch && typeMatch && searchMatch
    })
  }, [events, filter, typeFilter, searchQuery])

  const handleCopyToClipboard = async (text: string) => {
    const result = await copyToClipboardUtil(text)
    if (result.success) {
      // Could add a toast notification here
      console.log('Text copied to clipboard successfully')
    } else {
      console.error('Failed to copy text:', result.error)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExpanded) return

      // Don't interfere with typing in input fields, textareas, or contenteditable elements
      const target = e.target as HTMLElement
      if (target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true' ||
        target.isContentEditable
      )) {
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedEventIndex(prev => 
            Math.min(prev + 1, filteredEvents.length - 1)
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedEventIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedEventIndex >= 0 && focusedEventIndex < filteredEvents.length) {
            const event = filteredEvents[focusedEventIndex]
            setSelectedEvent(selectedEvent === event.id ? null : event.id)
          }
          break
        case 'Escape':
          e.preventDefault()
          setSelectedEvent(null)
          setFocusedEventIndex(-1)
          break
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (focusedEventIndex >= 0 && focusedEventIndex < filteredEvents.length) {
              const event = filteredEvents[focusedEventIndex]
              handleCopyToClipboard(JSON.stringify(event, null, 2))
            }
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded, focusedEventIndex, filteredEvents, selectedEvent, handleCopyToClipboard])


  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const responseEvents = events.filter(e => e.type === 'response' && e.duration)
    const errorEvents = events.filter(e => e.type === 'error')
    const avgResponseTime = responseEvents.length > 0 
      ? responseEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / responseEvents.length
      : 0
    
    const successRate = events.length > 0 
      ? ((events.length - errorEvents.length) / events.length) * 100
      : 100

    return {
      avgResponseTime,
      successRate,
      totalRequests: events.filter(e => e.type === 'request').length,
      totalResponses: responseEvents.length,
      errorRate: events.length > 0 ? (errorEvents.length / events.length) * 100 : 0
    }
  }, [events])

  const getEventIcon = (event: CommunicationEvent) => {
    switch (event.type) {
      case 'request':
        return <Send className="h-3 w-3" />
      case 'response':
        return <CheckCircle className="h-3 w-3" />
      case 'error':
        return <AlertCircle className="h-3 w-3" />
      case 'info':
        return <MessageSquare className="h-3 w-3" />
      default:
        return <Activity className="h-3 w-3" />
    }
  }

  const getEventColor = (event: CommunicationEvent) => {
    switch (event.type) {
      case 'request':
        return 'text-blue-600'
      case 'response':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      case 'info':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'FRM':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'MCP':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'GPT-5':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    }) + '.' + timestamp.getMilliseconds().toString().padStart(3, '0')
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return null
    return duration < 1000 ? `${duration.toFixed(0)}ms` : `${(duration / 1000).toFixed(2)}s`
  }

  const exportEvents = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `communication-log-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getEventPriority = (event: CommunicationEvent) => {
    switch (event.type) {
      case 'error': return 'high'
      case 'request': return 'medium'
      case 'response': return 'low'
      case 'info': return 'low'
      default: return 'low'
    }
  }

  const getEventStatus = (event: CommunicationEvent) => {
    if (event.type === 'error') return 'error'
    if (event.type === 'response' && event.duration) {
      if (event.duration > 5000) return 'slow'
      if (event.duration < 500) return 'fast'
      return 'normal'
    }
    return 'normal'
  }

  return (
    <Card 
      className="flex flex-col bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/50 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50"
      role="region"
      aria-label="Live Communication Panel"
    >
      <CardHeader className="pb-3 space-y-3">
        {/* Main Header */}
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center space-x-2">
            <div className="relative" aria-hidden="true">
              <Activity className="h-4 w-4" />
              {!isPaused && events.length > 0 && (
                <motion.div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  aria-label="Activity indicator"
                />
              )}
            </div>
            <span>Live Communication</span>
            <div className="flex items-center space-x-1" role="status" aria-live="polite">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-green-600" aria-label="Connected" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-600" aria-label="Disconnected" />
              )}
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {isConnected && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    connectionStatus.connectionQuality === 'excellent' 
                      ? 'text-green-600 border-green-600' 
                      : connectionStatus.connectionQuality === 'good'
                      ? 'text-yellow-600 border-yellow-600'
                      : 'text-orange-600 border-orange-600'
                  }`}
                  aria-label={`Connection quality: ${connectionStatus.connectionQuality}`}
                >
                  {connectionStatus.connectionQuality}
                </Badge>
              )}
            </div>
          </CardTitle>
          <div className="flex items-center space-x-1" role="toolbar" aria-label="Communication controls">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="h-6 px-2 text-xs"
              aria-label={isPaused ? 'Resume live updates' : 'Pause live updates'}
              aria-pressed={isPaused}
            >
              {isPaused ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="h-6 px-2 text-xs"
              aria-label={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
              aria-pressed={autoScroll}
            >
              {autoScroll ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 px-2"
              aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Performance Indicators */}
        {isExpanded && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded">
              <span className="text-slate-600 dark:text-slate-400">Success Rate:</span>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="font-mono text-green-600">{performanceMetrics.successRate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded">
              <span className="text-slate-600 dark:text-slate-400">Avg Response:</span>
              <span className="font-mono">{performanceMetrics.avgResponseTime.toFixed(0)}ms</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded">
              <span className="text-slate-600 dark:text-slate-400">Latency:</span>
              <span className="font-mono">{connectionStatus.latency.toFixed(0)}ms</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded">
              <span className="text-slate-600 dark:text-slate-400">Total Events:</span>
              <span className="font-mono">{stats.totalEvents}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded">
              <span className="text-slate-600 dark:text-slate-400">Errors:</span>
              <span className="font-mono text-red-600">{stats.errorCount}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded">
              <span className="text-slate-600 dark:text-slate-400">Activity:</span>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${stats.recentActivity ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-xs">{stats.recentActivity ? 'Active' : 'Idle'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Search and Controls */}
        {isExpanded && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-slate-400" aria-hidden="true" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
                aria-label="Search communication events"
                role="searchbox"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by source">
                {['all', 'FRM', 'MCP', 'GPT-5'].map((source) => (
                  <Button
                    key={source}
                    variant={filter === source ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(source as any)}
                    className="h-6 px-2 text-xs flex-shrink-0"
                    aria-pressed={filter === source}
                    aria-label={`Filter by ${source} source`}
                  >
                    {source}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by event type">
                {['all', 'request', 'response', 'error', 'info'].map((type) => (
                  <Button
                    key={type}
                    variant={typeFilter === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTypeFilter(type as any)}
                    className="h-6 px-2 text-xs capitalize flex-shrink-0"
                    aria-pressed={typeFilter === type}
                    aria-label={`Filter by ${type} events`}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1" role="group" aria-label="Event actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const testEvents = [
                      {
                        source: 'FRM' as const,
                        target: 'GPT-5' as const,
                        type: 'request' as const,
                        message: 'Test request to GPT-5',
                        data: { test: true }
                      },
                      {
                        source: 'GPT-5' as const,
                        target: 'FRM' as const,
                        type: 'response' as const,
                        message: 'Test response from GPT-5',
                        data: { test: true },
                        duration: Math.random() * 2000 + 500
                      }
                    ]
                    
                    testEvents.forEach((event, index) => {
                      setTimeout(() => {
                        addEvent(event)
                      }, index * 1000)
                    })
                  }}
                  className="h-6 px-2 text-xs flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
                  aria-label="Generate test events"
                >
                  <Zap className="h-3 w-3 mr-1" aria-hidden="true" />
                  Test
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportEvents}
                  className="h-6 px-2 text-xs flex-shrink-0"
                  aria-label="Export events to JSON file"
                >
                  <Download className="h-3 w-3 mr-1" aria-hidden="true" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearInactiveEvents}
                  className="h-6 px-2 text-xs flex-shrink-0"
                  aria-label="Clear old events (older than 5 minutes)"
                >
                  <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                  Clear Old
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearEvents}
                  className="h-6 px-2 text-xs flex-shrink-0"
                  aria-label="Clear all events"
                >
                  <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        )}

      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          <div className="p-3">
            {/* Keyboard shortcuts help */}
            <div className="mb-2 text-xs text-slate-500 dark:text-slate-400 text-center">
              <span>Use ↑↓ to navigate, Enter to select, Esc to deselect, Ctrl+C to copy</span>
            </div>
            
            {filteredEvents.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                  <p className="text-sm">
                    {searchQuery ? 'No events match your search' : 'No communication events'}
                  </p>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-xs"
                      aria-label="Clear search query"
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div 
                role="listbox" 
                aria-label="Communication events list"
                aria-activedescendant={focusedEventIndex >= 0 ? filteredEvents[focusedEventIndex]?.id : undefined}
                className="space-y-2"
              >
                {filteredEvents.map((event) => {
                  const priority = getEventPriority(event)
                  const status = getEventStatus(event)
                  const isSelected = selectedEvent === event.id
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                          : 'bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'
                      } ${
                        priority === 'high' ? 'border-l-4 border-l-red-500' : ''
                      }`}
                      onClick={() => setSelectedEvent(isSelected ? null : event.id)}
                    >
                      {/* Event Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`${getEventColor(event)} ${status === 'slow' ? 'animate-pulse' : ''}`}>
                            {getEventIcon(event)}
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getSourceColor(event.source)}`}
                          >
                            {event.source}
                          </Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            →
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getSourceColor(event.target)}`}
                          >
                            {event.target}
                          </Badge>
                          {status === 'slow' && (
                            <Badge variant="destructive" className="text-xs">
                              Slow
                            </Badge>
                          )}
                          {status === 'fast' && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              Fast
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimestamp(event.timestamp)}</span>
                          </div>
                          {event.duration && (
                            <div className="flex items-center space-x-1">
                              <span className="text-xs font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">
                                {formatDuration(event.duration)}
                              </span>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyToClipboard(JSON.stringify(event, null, 2))
                            }}
                            className="h-5 w-5 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Event Message */}
                      <div className="text-sm text-slate-700 dark:text-slate-300 mb-2 line-clamp-2">
                        {event.message}
                      </div>
                      
                      {/* Event Data */}
                      {event.data && showDataDetails && (
                        <div className="mt-2">
                          <details open={isSelected}>
                            <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer mb-2 flex items-center space-x-1">
                              <span>View Data</span>
                              <ExternalLink className="h-3 w-3" />
                            </summary>
                            <div className="relative">
                              <pre className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded overflow-x-auto border max-h-32">
                                {JSON.stringify(event.data, null, 2)}
                              </pre>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopyToClipboard(JSON.stringify(event.data, null, 2))
                                }}
                                className="absolute top-1 right-1 h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </details>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default CommunicationLogPanel
