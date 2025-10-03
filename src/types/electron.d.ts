export interface CommunicationEvent {
  id: string
  timestamp: Date
  source: 'FRM' | 'MCP' | 'GPT-5'
  target: 'FRM' | 'MCP' | 'GPT-5'
  type: 'request' | 'response' | 'error' | 'info'
  message: string
  data?: any
  duration?: number
}

export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  showMessageBox: (options: any) => Promise<any>
  generateAISchema: (options?: Record<string, unknown>) => Promise<unknown>
  onMenuNewProblem: (callback: () => void) => void
  onMenuOpen: (callback: () => void) => void
  onMenuSave: (callback: () => void) => void
  onMenuValidate: (callback: () => void) => void
  onMenuGenerateExample: (callback: () => void) => void
  onMenuAbout: (callback: () => void) => void
  onMenuDocs: (callback: () => void) => void
  onCommunicationEvent: (callback: (event: CommunicationEvent) => void) => void
  onConnectionStatus: (callback: (connected: boolean) => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
