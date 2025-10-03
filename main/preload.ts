const electron = require('electron') as typeof import('electron')
const { contextBridge, ipcRenderer } = electron

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  showMessageBox: (options: any) => ipcRenderer.invoke('show-message-box', options),
  generateAISchema: (options?: Record<string, unknown>) =>
    ipcRenderer.invoke('generate-ai-example', options ?? {}),

  // Menu event listeners
  onMenuNewProblem: (callback: () => void) => {
    ipcRenderer.on('menu-new-problem', callback)
  },
  onMenuOpen: (callback: () => void) => {
    ipcRenderer.on('menu-open', callback)
  },
  onMenuSave: (callback: () => void) => {
    ipcRenderer.on('menu-save', callback)
  },
  onMenuValidate: (callback: () => void) => {
    ipcRenderer.on('menu-validate', callback)
  },
  onMenuGenerateExample: (callback: () => void) => {
    ipcRenderer.on('menu-generate-example', callback)
  },
  onMenuAbout: (callback: () => void) => {
    ipcRenderer.on('menu-about', callback)
  },
  onMenuDocs: (callback: () => void) => {
    ipcRenderer.on('menu-docs', callback)
  },

  // Communication event listeners
  onCommunicationEvent: (callback: (event: any) => void) => {
    ipcRenderer.on('communication-event', (_event, data) => callback(data))
  },
  onConnectionStatus: (callback: (connected: boolean) => void) => {
    ipcRenderer.on('connection-status', (_event, connected) => callback(connected))
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
})