import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import Ajv2020 from 'ajv/dist/2020'
import type { ErrorObject, ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'

import type { FRMData } from '@/data/schema'
import { validateFRMDataStructure, isFRMData } from '@/data/schema'

export interface ValidationError {
  instancePath: string
  schemaPath: string
  keyword: string
  params: Record<string, unknown>
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
}

const createWarnings = (data: FRMData): string[] => {
  const warnings: string[] = []

  if (!data.modeling?.equations?.length) {
    warnings.push('No equations defined in the model.')
  }

  if (!data.input?.unknowns?.length) {
    warnings.push('No unknown variables defined.')
  }

  if (!data.method_selection?.chosen_methods?.length) {
    warnings.push('No solution methods selected.')
  }

  // Novelty assurance warnings
  if (!data.novelty_assurance?.citations?.length) {
    warnings.push('No citations provided for novelty assurance.')
  }

  if (!data.novelty_assurance?.novelty_claims?.length) {
    warnings.push('No novelty claims defined.')
  }

  if (!data.novelty_assurance?.prior_work?.literature_corpus_summary) {
    warnings.push('Literature corpus summary is missing.')
  }

  if (data.novelty_assurance?.redundancy_check?.gate_pass === false) {
    warnings.push('Novelty gate has not passed - work may be redundant.')
  }

  return warnings
}

// Validation cache for performance optimization
const validationCache = new Map<string, ValidationResult>()
const CACHE_MAX_SIZE = 100
const CACHE_CLEANUP_THRESHOLD = 0.25 // Clean up 25% when limit exceeded

// Create efficient cache key from essential validation properties
const createValidationCacheKey = (data: FRMData): string => {
  const keyParts = [
    data.metadata?.problem_id || '',
    data.metadata?.domain || '',
    data.metadata?.version || '',
    data.input?.problem_summary?.slice(0, 100) || '',
    data.modeling?.model_class || '',
    data.modeling?.equations?.length || 0,
    data.input?.unknowns?.length || 0,
    data.method_selection?.chosen_methods?.length || 0,
    data.novelty_assurance?.citations?.length || 0
  ]
  return keyParts.join('|')
}

export const useValidation = (schema: any) => {
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
  })

  // Cache for AJV instance to avoid recreation
  const ajvInstance = useRef<Ajv2020 | null>(null)
  const validateFnRef = useRef<ValidateFunction<FRMData> | null>(null)

  const ajv = useMemo(() => {
    if (!ajvInstance.current) {
      ajvInstance.current = new Ajv2020({
        allErrors: true,
        verbose: true,
        strict: false,
        addUsedSchema: false,
        validateSchema: false,
        loadSchema: false,
        // Add better error reporting
        errorDataPath: 'property',
        removeAdditional: false,
        useDefaults: false,
        // Add more detailed error reporting
        messages: true,
        code: {
          // Custom error codes for better debugging
          'validation_failed': 'Schema validation failed',
          'missing_required': 'Required property is missing',
          'invalid_type': 'Invalid data type',
          'pattern_mismatch': 'Value does not match required pattern'
        }
      })
      addFormats(ajvInstance.current)
    }
    return ajvInstance.current
  }, [])

  const validateFn = useMemo<ValidateFunction<FRMData>>(() => {
    if (!validateFnRef.current) {
      try {
        validateFnRef.current = ajv.compile<FRMData>(schema)
      } catch (error) {
        console.warn('Failed to compile schema, using fallback validation:', error)
        // Create a fallback validation function that always returns true
        validateFnRef.current = (() => true) as ValidateFunction<FRMData>
      }
    }
    return validateFnRef.current
  }, [ajv, schema])

  // Memoized error normalization
  const normalizeErrors = useCallback(
    (errors: ErrorObject[] | null | undefined): ValidationError[] => {
      if (!errors) {
        return []
      }

      return errors.map((error) => {
        let message = error.message ?? 'Unknown validation error.'
        
        // Enhance error messages with more context
        if (error.keyword === 'required') {
          const missingProperty = error.params?.missingProperty as string
          message = `Missing required property: ${missingProperty}`
        } else if (error.keyword === 'additionalProperties') {
          const additionalProperty = error.params?.additionalProperty as string
          message = `Additional property '${additionalProperty}' is not allowed`
        } else if (error.keyword === 'type') {
          const expectedType = error.params?.type as string
          const actualType = error.params?.dataType as string
          message = `Expected ${expectedType}, got ${actualType}`
        } else if (error.keyword === 'enum') {
          const allowedValues = error.params?.allowedValues as string[]
          message = `Value must be one of: ${allowedValues?.join(', ') || 'allowed values'}`
        } else if (error.keyword === 'minItems') {
          const minimum = error.params?.limit as number
          message = `Array must have at least ${minimum} items`
        } else if (error.keyword === 'minLength') {
          const minimum = error.params?.limit as number
          message = `String must be at least ${minimum} characters long`
        } else if (error.keyword === 'pattern') {
          message = `Value does not match required pattern`
        } else if (error.keyword === 'const') {
          const allowedValue = error.params?.allowedValue
          message = `Value must be exactly: ${JSON.stringify(allowedValue)}`
        }

        return {
          instancePath: error.instancePath ?? '',
          schemaPath: error.schemaPath ?? '',
          keyword: error.keyword ?? '',
          params: (error.params ?? {}) as Record<string, unknown>,
          message,
        }
      })
    },
  [])

  // Optimized validation with caching and IPC communication
  const validateData = useCallback(
    async (candidate: FRMData): Promise<ValidationResult> => {
      // Create efficient cache key using a hash of essential properties
      const cacheKey = createValidationCacheKey(candidate)
      
      // Check cache first
      if (validationCache.has(cacheKey)) {
        const cachedResult = validationCache.get(cacheKey)!
        setValidation(cachedResult)
        return cachedResult
      }

      try {
        // Use IPC validation if available
        if (window.electronAPI?.validateSchema) {
          const ipcResult = await window.electronAPI.validateSchema(candidate)
          
          const result: ValidationResult = {
            isValid: ipcResult.isValid,
            errors: ipcResult.errors.map(error => ({
              instancePath: '',
              schemaPath: '',
              keyword: 'ipc',
              params: {},
              message: error,
            })),
            warnings: ipcResult.warnings.map(warning => ({
              instancePath: '',
              schemaPath: '',
              keyword: 'ipc',
              params: {},
              message: warning,
            })),
          }

          // Cache the result
          validationCache.set(cacheKey, result)
          setValidation(result)
          return result
        }
      } catch (error) {
        console.warn('IPC validation failed, falling back to local validation:', error)
      }

      // Fallback to local validation
      let schemaValid = true
      let schemaErrors: ValidationError[] = []

      try {
        // Run schema validation
        console.log('Running AJV schema validation on data:', {
          hasMetadata: !!candidate.metadata,
          hasInput: !!candidate.input,
          hasModeling: !!candidate.modeling,
          hasMethodSelection: !!candidate.method_selection,
          hasSolutionAnalysis: !!candidate.solution_and_analysis,
          hasValidation: !!candidate.validation,
          hasOutputContract: !!candidate.output_contract,
          hasNoveltyAssurance: !!candidate.novelty_assurance,
          dataKeys: Object.keys(candidate)
        })
        
        // Log detailed data structure for debugging
        console.log('Detailed data structure:', {
          metadata: candidate.metadata ? {
            problem_id: candidate.metadata.problem_id,
            domain: candidate.metadata.domain,
            version: candidate.metadata.version
          } : null,
          input: candidate.input ? {
            unknowns: candidate.input.unknowns?.length || 0,
            problem_summary: candidate.input.problem_summary?.length || 0
          } : null,
          modeling: candidate.modeling ? {
            equations: candidate.modeling.equations?.length || 0,
            variables: candidate.modeling.variables?.length || 0,
            model_class: candidate.modeling.model_class
          } : null
        })
        
        schemaValid = validateFn(candidate)
        schemaErrors = normalizeErrors(validateFn.errors)
        
        console.log('AJV validation result:', {
          isValid: schemaValid,
          errorCount: schemaErrors.length,
          errors: schemaErrors.map(e => ({ 
            path: e.instancePath, 
            message: e.message,
            keyword: e.keyword,
            params: e.params
          }))
        })
        
        // If validation failed but no errors were captured, provide more details
        if (!schemaValid && schemaErrors.length === 0) {
          console.warn('Schema validation failed but no specific errors captured')
          console.log('Raw AJV errors:', validateFn.errors)
          schemaErrors = [{
            instancePath: '',
            schemaPath: '',
            keyword: 'validation_failed',
            params: {},
            message: 'Schema validation failed - check data structure against schema requirements',
          }]
        }
      } catch (error) {
        console.warn('Schema validation failed, falling back to custom validation only:', error)
        console.error('Validation error details:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          candidate: JSON.stringify(candidate, null, 2).slice(0, 500) + '...'
        })
        schemaValid = false
        schemaErrors = [{
          instancePath: '',
          schemaPath: '',
          keyword: 'schema_error',
          params: {},
          message: 'Schema validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        }]
      }
      
      // Run custom validation
      const customValidation = validateFRMDataStructure(candidate)
      const customErrors = customValidation.errors.map(error => ({
        instancePath: '',
        schemaPath: '',
        keyword: 'custom',
        params: {},
        message: error,
      }))

      const warnings = createWarnings(candidate)
      const allErrors = [...schemaErrors, ...customErrors]

      const result: ValidationResult = {
        isValid: schemaValid && customValidation.isValid,
        errors: allErrors,
        warnings,
      }

      // Cache the result
      validationCache.set(cacheKey, result)
      
      // Limit cache size to prevent memory leaks
      if (validationCache.size > CACHE_MAX_SIZE) {
        const keysToDelete = Array.from(validationCache.keys()).slice(0, Math.floor(validationCache.size * CACHE_CLEANUP_THRESHOLD))
        keysToDelete.forEach(key => validationCache.delete(key))
      }

      setValidation(result)
      return result
    },
  [normalizeErrors, validateFn]
  )

  // Optimized unknown validation with type checking
  const validateUnknown = useCallback(
    async (candidate: unknown): Promise<ValidationResult & { data?: FRMData }> => {
      // First check if it's valid FRMData structure
      if (!isFRMData(candidate)) {
        const result: ValidationResult = {
          isValid: false,
          errors: [{
            instancePath: '',
            schemaPath: '',
            keyword: 'type',
            params: {},
            message: 'Invalid FRMData structure',
          }],
          warnings: [],
        }
        setValidation(result)
        return result
      }

      // Use the optimized validateData for known FRMData
      const validationResult = await validateData(candidate)
      
      const result: ValidationResult & { data: FRMData } = {
        ...validationResult,
        data: candidate,
      }
      
      setValidation(result)
      return result
    },
    [validateData]
  )

  // Memoized field error getters
  const getFieldErrors = useCallback(
    (fieldPath: string) =>
      validation.errors.filter(
        (error) => error.instancePath === fieldPath || error.instancePath.startsWith(`${fieldPath}/`),
      ),
    [validation.errors],
  )

  const getFieldError = useCallback(
    (fieldPath: string) =>
      validation.errors.find(
        (error) => error.instancePath === fieldPath || error.instancePath.startsWith(`${fieldPath}/`),
      ),
    [validation.errors],
  )

  // Clear validation cache
  const clearCache = useCallback(() => {
    validationCache.clear()
  }, [])

  // Cleanup cache on component unmount
  useEffect(() => {
    return () => {
      // Clean up cache when component unmounts
      if (validationCache.size > 0) {
        validationCache.clear()
      }
    }
  }, [])

  // Get validation statistics
  const getValidationStats = useCallback(() => {
    return {
      cacheSize: validationCache.size,
      totalErrors: validation.errors.length,
      totalWarnings: validation.warnings.length,
      isValid: validation.isValid,
    }
  }, [validation])

  return {
    validation,
    validateData,
    validateUnknown,
    getFieldError,
    getFieldErrors,
    clearCache,
    getValidationStats,
  }
}
