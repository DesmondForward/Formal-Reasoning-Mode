import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock,
  AlertCircle,
  CheckCircle,
  Send,
  MessageSquare,
  Copy,
  ExternalLink
} from 'lucide-react'
import { CommunicationEvent } from '@/hooks/useCommunication'

interface VirtualizedEventListProps {
  events: CommunicationEvent[]
  onEventSelect: (eventId: string | null) => void
  selectedEventId: string | null
  showDataDetails: boolean
  onCopyEvent: (event: CommunicationEvent) => void
  onCopyData: (data: any) => void
  getEventIcon: (event: CommunicationEvent) => React.ReactNode
  getEventColor: (event: CommunicationEvent) => string
  getSourceColor: (source: string) => string
  getEventPriority: (event: CommunicationEvent) => string
  getEventStatus: (event: CommunicationEvent) => string
  formatTimestamp: (timestamp: Date) => string
  formatDuration: (duration?: number) => string | null
}

const ITEM_HEIGHT = 120 // Estimated height of each event item
const CONTAINER_HEIGHT = 400 // Height of the visible container
const OVERSCAN = 5 // Number of items to render outside visible area

export const VirtualizedEventList: React.FC<VirtualizedEventListProps> = ({
  events,
  onEventSelect,
  selectedEventId,
  showDataDetails,
  onCopyEvent,
  onCopyData,
  getEventIcon,
  getEventColor,
  getSourceColor,
  getEventPriority,
  getEventStatus,
  formatTimestamp,
  formatDuration
}) => {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN)
    const endIndex = Math.min(
      events.length - 1,
      Math.ceil((scrollTop + CONTAINER_HEIGHT) / ITEM_HEIGHT) + OVERSCAN
    )
    return { startIndex, endIndex }
  }, [scrollTop, events.length])

  const visibleEvents = useMemo(() => {
    return events.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [events, visibleRange])

  const totalHeight = events.length * ITEM_HEIGHT
  const offsetY = visibleRange.startIndex * ITEM_HEIGHT

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [events.length])

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
        <div className="text-center">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No communication events</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          <AnimatePresence>
            {visibleEvents.map((event, index) => {
              const actualIndex = visibleRange.startIndex + index
              const priority = getEventPriority(event)
              const status = getEventStatus(event)
              const isSelected = selectedEventId === event.id
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 mb-2 ${
                    isSelected 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                      : 'bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'
                  } ${
                    priority === 'high' ? 'border-l-4 border-l-red-500' : ''
                  }`}
                  onClick={() => onEventSelect(isSelected ? null : event.id)}
                  style={{ height: ITEM_HEIGHT }}
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
                          onCopyEvent(event)
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
                              onCopyData(event.data)
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
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
