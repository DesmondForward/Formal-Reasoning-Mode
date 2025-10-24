export interface GenerationLogEntry {
  timestamp: string
  model: string
  domain: string
  subDomain?: string
  duration: number
  success: boolean
  errorMessage?: string
  source: 'ai' | 'fallback'
}

export class GenerationLogger {
  private static instance: GenerationLogger
  private logEntries: GenerationLogEntry[] = []

  private constructor() {}

  public static getInstance(): GenerationLogger {
    if (!GenerationLogger.instance) {
      GenerationLogger.instance = new GenerationLogger()
    }
    return GenerationLogger.instance
  }

  public logGeneration(entry: Omit<GenerationLogEntry, 'timestamp'>): void {
    const logEntry: GenerationLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    }

    this.logEntries.push(logEntry)
    this.writeToFile(logEntry)
  }

  private writeToFile(entry: GenerationLogEntry): void {
    try {
      // Format the log entry for file output
      const logLine = this.formatLogEntry(entry)
      
      // Use the existing debug.log file for now, but we could create a separate file
      if (window?.electronAPI?.logGeneration) {
        window.electronAPI.logGeneration(logLine)
      } else {
        // Fallback to console for web version
        console.log('Generation Log:', logLine)
      }
    } catch (error) {
      console.error('Failed to write generation log:', error)
    }
  }

  private formatLogEntry(entry: GenerationLogEntry): string {
    const duration = this.formatDuration(entry.duration)
    const subDomainText = entry.subDomain ? ` | Sub-domain: ${entry.subDomain}` : ''
    const errorText = entry.errorMessage ? ` | Error: ${entry.errorMessage}` : ''
    
    return `[${entry.timestamp}] ${entry.source.toUpperCase()} Generation | Model: ${entry.model} | Domain: ${entry.domain}${subDomainText} | Duration: ${duration} | Success: ${entry.success}${errorText}`
  }

  private formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const centiseconds = Math.floor((milliseconds % 1000) / 10)
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
    }
    
    return `${seconds}.${centiseconds.toString().padStart(2, '0')}s`
  }

  public getLogEntries(): GenerationLogEntry[] {
    return [...this.logEntries]
  }

  public clearLogs(): void {
    this.logEntries = []
  }
}

// Export singleton instance
export const generationLogger = GenerationLogger.getInstance()
