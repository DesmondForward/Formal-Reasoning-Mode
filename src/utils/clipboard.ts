/**
 * Enhanced clipboard utilities for better cross-platform compatibility
 * Works in both web browsers and Electron environments
 */

export interface CopyResult {
  success: boolean
  error?: string
}

/**
 * Copy text to clipboard with fallback methods
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return { success: true }
    }
  } catch (error) {
    console.warn('Modern clipboard API failed:', error)
  }

  // Fallback method for older browsers or non-secure contexts
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.setAttribute('readonly', '')
    document.body.appendChild(textArea)
    
    // Select and copy
    textArea.focus()
    textArea.select()
    textArea.setSelectionRange(0, 99999) // For mobile devices
    
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    
    if (successful) {
      return { success: true }
    } else {
      return { success: false, error: 'execCommand copy failed' }
    }
  } catch (error) {
    console.error('Fallback copy method failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Copy JSON data to clipboard with formatting
 */
export async function copyJsonToClipboard(data: any, indent: number = 2): Promise<CopyResult> {
  try {
    const jsonString = JSON.stringify(data, null, indent)
    return await copyToClipboard(jsonString)
  } catch (error) {
    console.error('JSON stringify failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'JSON stringify failed' 
    }
  }
}

/**
 * Check if clipboard API is available
 */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard && window.isSecureContext)
}

/**
 * Get clipboard text (read-only operation)
 */
export async function getClipboardText(): Promise<string | null> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      return await navigator.clipboard.readText()
    }
  } catch (error) {
    console.warn('Failed to read from clipboard:', error)
  }
  return null
}
