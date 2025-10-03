// Schema debugging and error handling utilities
//
// This module provides comprehensive debugging tools for the FRM schema system,
// including error tracking, performance monitoring, and development helpers.

import type { FRMData, ValidationError } from '@/data/schema'

export interface DebugInfo {
  timestamp: number
  operation: string
  dataSize: number
  performance: {
    duration: number
    memoryUsage?: number
  }
  errors: ValidationError[]
  warnings: string[]
}

export interface SchemaDebugger {
  logOperation: (operation: string, data: FRMData, startTime: number) => void
  logError: (error: Error, context: string, data?: FRMData) => void
  logWarning: (message: string, context: string, data?: FRMData) => void
  getDebugHistory: () => DebugInfo[]
  clearHistory: () => void
  getPerformanceStats: () => PerformanceStats
  exportDebugData: () => string
}

export interface PerformanceStats {
  totalOperations: number
  averageOperationTime: number
  totalErrors: number
  totalWarnings: number
  memoryUsage: number
  cacheHitRate: number
}

class SchemaDebuggerImpl implements SchemaDebugger {
  private debugHistory: DebugInfo[] = []
  private errorCount = 0
  private warningCount = 0
  private totalOperationTime = 0
  private operationCount = 0
  private cacheHits = 0
  private cacheMisses = 0

  logOperation(operation: string, data: FRMData, startTime: number): void {
    const endTime = performance.now()
    const duration = endTime - startTime
    const dataSize = JSON.stringify(data).length

    const debugInfo: DebugInfo = {
      timestamp: Date.now(),
      operation,
      dataSize,
      performance: {
        duration,
        memoryUsage: this.getMemoryUsage(),
      },
      errors: [],
      warnings: [],
    }

    this.debugHistory.push(debugInfo)
    this.operationCount++
    this.totalOperationTime += duration

    // Keep only last 100 operations to prevent memory leaks
    if (this.debugHistory.length > 100) {
      this.debugHistory.shift()
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Schema Debug] ${operation} completed in ${duration.toFixed(2)}ms`, {
        dataSize,
        memoryUsage: debugInfo.performance.memoryUsage,
      })
    }
  }

  logError(error: Error, context: string, data?: FRMData): void {
    this.errorCount++
    
    const errorInfo: DebugInfo = {
      timestamp: Date.now(),
      operation: `ERROR: ${context}`,
      dataSize: data ? JSON.stringify(data).length : 0,
      performance: {
        duration: 0,
        memoryUsage: this.getMemoryUsage(),
      },
      errors: [{
        instancePath: '',
        schemaPath: '',
        keyword: 'error',
        params: {},
        message: error.message,
      }],
      warnings: [],
    }

    this.debugHistory.push(errorInfo)

    if (process.env.NODE_ENV === 'development') {
      console.error(`[Schema Debug] Error in ${context}:`, error, data)
    }
  }

  logWarning(message: string, context: string, data?: FRMData): void {
    this.warningCount++
    
    const warningInfo: DebugInfo = {
      timestamp: Date.now(),
      operation: `WARNING: ${context}`,
      dataSize: data ? JSON.stringify(data).length : 0,
      performance: {
        duration: 0,
        memoryUsage: this.getMemoryUsage(),
      },
      errors: [],
      warnings: [message],
    }

    this.debugHistory.push(warningInfo)

    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Schema Debug] Warning in ${context}:`, message, data)
    }
  }

  getDebugHistory(): DebugInfo[] {
    return [...this.debugHistory]
  }

  clearHistory(): void {
    this.debugHistory = []
    this.errorCount = 0
    this.warningCount = 0
    this.totalOperationTime = 0
    this.operationCount = 0
    this.cacheHits = 0
    this.cacheMisses = 0
  }

  getPerformanceStats(): PerformanceStats {
    return {
      totalOperations: this.operationCount,
      averageOperationTime: this.operationCount > 0 ? this.totalOperationTime / this.operationCount : 0,
      totalErrors: this.errorCount,
      totalWarnings: this.warningCount,
      memoryUsage: this.getMemoryUsage(),
      cacheHitRate: this.cacheHits + this.cacheMisses > 0 ? this.cacheHits / (this.cacheHits + this.cacheMisses) : 0,
    }
  }

  exportDebugData(): string {
    return JSON.stringify({
      debugHistory: this.debugHistory,
      performanceStats: this.getPerformanceStats(),
      timestamp: Date.now(),
    }, null, 2)
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  recordCacheHit(): void {
    this.cacheHits++
  }

  recordCacheMiss(): void {
    this.cacheMisses++
  }
}

// Global debugger instance
export const schemaDebugger = new SchemaDebuggerImpl()

// Performance monitoring decorator
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  operationName: string
): T {
  return ((...args: any[]) => {
    const startTime = performance.now()
    try {
      const result = fn(...args)
      
      // If result is a Promise, handle it
      if (result && typeof result.then === 'function') {
        return result.then((res: any) => {
          schemaDebugger.logOperation(operationName, args[0], startTime)
          return res
        }).catch((error: Error) => {
          schemaDebugger.logError(error, operationName, args[0])
          throw error
        })
      }
      
      schemaDebugger.logOperation(operationName, args[0], startTime)
      return result
    } catch (error) {
      schemaDebugger.logError(error as Error, operationName, args[0])
      throw error
    }
  }) as T
}

// Error boundary for schema operations
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  context: string
): T {
  return ((...args: any[]) => {
    try {
      return fn(...args)
    } catch (error) {
      schemaDebugger.logError(error as Error, context, args[0])
      
      // Return a safe fallback or re-throw based on error type
      if (error instanceof TypeError) {
        console.warn(`[Schema Debug] Type error in ${context}, returning safe fallback`)
        return null
      }
      
      throw error
    }
  }) as T
}

// Development-only schema validator with detailed output
export function validateSchemaWithDebug(data: unknown, schema: any): {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
  debugInfo: DebugInfo[]
} {
  const startTime = performance.now()
  
  try {
    // This would integrate with your actual validation logic
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
    }
    
    schemaDebugger.logOperation('validateSchemaWithDebug', data as FRMData, startTime)
    
    return {
      ...validation,
      debugInfo: schemaDebugger.getDebugHistory(),
    }
  } catch (error) {
    schemaDebugger.logError(error as Error, 'validateSchemaWithDebug', data as FRMData)
    throw error
  }
}

// Schema data integrity checker
export function checkDataIntegrity(data: FRMData): {
  isValid: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Check for empty required fields
  if (!data.metadata.problem_id || data.metadata.problem_id === 'draft-problem') {
    issues.push('Problem ID is not set or using default value')
    recommendations.push('Set a unique problem ID')
  }

  if (!data.input.unknowns || data.input.unknowns.length === 0) {
    issues.push('No unknown variables defined')
    recommendations.push('Define at least one unknown variable')
  }

  if (!data.modeling.equations || data.modeling.equations.length === 0) {
    issues.push('No equations defined')
    recommendations.push('Define at least one equation')
  }

  // Check for placeholder values
  if (data.input.problem_summary === 'Summarise the real-world system and key drivers.') {
    issues.push('Using placeholder problem summary')
    recommendations.push('Replace with actual problem description')
  }

  if (data.modeling.equations.some(eq => eq.rhs === '0')) {
    issues.push('Found placeholder equations with rhs = "0"')
    recommendations.push('Replace placeholder equations with actual dynamics')
  }

  // Check novelty assurance completeness
  if (!data.novelty_assurance.citations || data.novelty_assurance.citations.length < 3) {
    issues.push('Insufficient citations for novelty assurance')
    recommendations.push('Add at least 3 relevant citations')
  }

  if (!data.novelty_assurance.novelty_claims || data.novelty_assurance.novelty_claims.length === 0) {
    issues.push('No novelty claims defined')
    recommendations.push('Define at least one novelty claim')
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations,
  }
}

// Export debug utilities
export { schemaDebugger as default }
