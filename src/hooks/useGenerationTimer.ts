import { useState, useEffect, useRef } from 'react'

export interface GenerationTimerState {
  isRunning: boolean
  elapsedTime: number
  startTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
}

export const useGenerationTimer = (): GenerationTimerState => {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const startTimer = () => {
    if (isRunning) return
    
    setIsRunning(true)
    setElapsedTime(0)
    startTimeRef.current = Date.now()
    
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current)
      }
    }, 100) // Update every 100ms for smooth display
  }

  const stopTimer = () => {
    if (!isRunning) return
    
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const resetTimer = () => {
    setIsRunning(false)
    setElapsedTime(0)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    startTimeRef.current = null
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    isRunning,
    elapsedTime,
    startTimer,
    stopTimer,
    resetTimer,
  }
}

export const formatElapsedTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const centiseconds = Math.floor((milliseconds % 1000) / 10)
  
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }
  
  return `${seconds}.${centiseconds.toString().padStart(2, '0')}s`
}
