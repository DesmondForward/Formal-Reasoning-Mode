const isDebugLoggingEnabled = () => {
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return false
  }

  return import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true'
}

export const debugLog = (...args: unknown[]) => {
  if (isDebugLoggingEnabled()) {
    console.log(...args)
  }
}
