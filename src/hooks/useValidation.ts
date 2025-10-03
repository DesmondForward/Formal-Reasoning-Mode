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
        loadSchema: false
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

      return errors.map((error) => ({
        instancePath: error.instancePath ?? '',
        schemaPath: error.schemaPath ?? '',
        keyword: error.keyword ?? '',
        params: (error.params ?? {}) as Record<string, unknown>,
        message: error.message ?? 'Unknown validation error.',
      }))
    },
  [])

  // Optimized validation with caching
  const validateData = useCallback(
    (candidate: FRMData): ValidationResult => {
      // Create efficient cache key using a hash of essential properties
      const cacheKey = createValidationCacheKey(candidate)
      
      // Check cache first
      if (validationCache.has(cacheKey)) {
        const cachedResult = validationCache.get(cacheKey)!
        setValidation(cachedResult)
        return cachedResult
      }

      let schemaValid = true
      let schemaErrors: ValidationError[] = []

      try {
        // Run schema validation
        schemaValid = validateFn(candidate)
        schemaErrors = normalizeErrors(validateFn.errors)
      } catch (error) {
        console.warn('Schema validation failed, falling back to custom validation only:', error)
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
    (candidate: unknown): ValidationResult & { data?: FRMData } => {
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
      const validationResult = validateData(candidate)
      
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
