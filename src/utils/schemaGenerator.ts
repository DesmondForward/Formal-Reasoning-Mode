import type { FRMData } from '@/data/schema'

export interface SchemaGenerationOptions {
  domain?: string
  scenarioHint?: string
}

export type GenerateSchemaSource = 'ai' | 'fallback'

export interface GenerateSchemaResult {
  data: FRMData
  source: GenerateSchemaSource
  errorMessage?: string
}

const clone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

// Lazy load fallback example to reduce initial bundle size
const getFallbackExample = async (): Promise<FRMData> => {
  const { FALLBACK_EXAMPLE } = await import('@/data/fallbackExample')
  return clone(FALLBACK_EXAMPLE)
}

export const generateSchemaProblem = async (
  options?: SchemaGenerationOptions,
): Promise<GenerateSchemaResult> => {
  if (window?.electronAPI?.generateAISchema) {
    try {
      // Safely validate and prepare options
      const safeOptions: Record<string, unknown> = {}
      if (options) {
        if (typeof options.domain === 'string') {
          safeOptions.domain = options.domain
        }
        if (typeof options.scenarioHint === 'string') {
          safeOptions.scenarioHint = options.scenarioHint
        }
      }
      
      const generated = await window.electronAPI.generateAISchema(safeOptions)
      if (generated && typeof generated === 'object') {
        return {
          data: generated as FRMData,
          source: 'ai',
        }
      }

      const fallbackData = await getFallbackExample()
      return {
        data: fallbackData,
        source: 'fallback',
        errorMessage: 'AI generator returned an unexpected payload shape.',
      }
    } catch (error) {
      console.error('AI schema generation failed. Falling back to bundled schema.', error)
      const message = error instanceof Error ? error.message : String(error)
      const fallbackData = await getFallbackExample()
      return {
        data: fallbackData,
        source: 'fallback',
        errorMessage: message,
      }
    }
  }

  const fallbackData = await getFallbackExample()
  return {
    data: fallbackData,
    source: 'fallback',
  }
}

export const getFallbackExampleSync = async (): Promise<FRMData> => getFallbackExample()
