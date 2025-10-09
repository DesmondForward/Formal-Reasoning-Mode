// Runtime type guards and validation helpers
//
// This module provides comprehensive runtime type checking utilities for the FRM schema,
// ensuring type safety and providing detailed validation feedback.

import type { 
  FRMData, 
  DomainOption, 
  ModelClassOption, 
  VariableRoleOption,
  QuantityUncertaintyOption,
  ConstraintTypeOption,
  ObjectiveSenseOption,
  ProblemTypeOption,
  SolutionRequestOption,
  SensitivityTypeOption,
  UncertaintyMethodOption,
  OptimizationSolverOption,
  InferenceSamplerOption,
  MathNotationOption,
  NumberFormatOption
} from '@/data/schema'
import { 
  DOMAIN_OPTIONS,
  MODEL_CLASS_OPTIONS,
  VARIABLE_ROLE_OPTIONS,
  QUANTITY_UNCERTAINTY_OPTIONS,
  CONSTRAINT_TYPE_OPTIONS,
  OBJECTIVE_SENSE_OPTIONS,
  PROBLEM_TYPE_OPTIONS,
  SOLUTION_REQUEST_OPTIONS,
  SENSITIVITY_TYPE_OPTIONS,
  UNCERTAINTY_METHOD_OPTIONS,
  OPTIMIZATION_SOLVER_OPTIONS,
  INFERENCE_SAMPLER_OPTIONS,
  MATH_NOTATION_OPTIONS,
  NUMBER_FORMAT_OPTIONS
} from '@/data/schema'

export interface TypeGuardResult<T = unknown> {
  isValid: boolean
  value: T
  errors: string[]
  warnings: string[]
}

// Basic type guards
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value)
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Enum type guards
export function isDomainOption(value: unknown): value is DomainOption {
  return isString(value) && DOMAIN_OPTIONS.includes(value as DomainOption)
}

export function isModelClassOption(value: unknown): value is ModelClassOption {
  return isString(value) && MODEL_CLASS_OPTIONS.includes(value as ModelClassOption)
}

export function isVariableRoleOption(value: unknown): value is VariableRoleOption {
  return isString(value) && VARIABLE_ROLE_OPTIONS.includes(value as VariableRoleOption)
}

export function isQuantityUncertaintyOption(value: unknown): value is QuantityUncertaintyOption {
  return isString(value) && QUANTITY_UNCERTAINTY_OPTIONS.includes(value as QuantityUncertaintyOption)
}

export function isConstraintTypeOption(value: unknown): value is ConstraintTypeOption {
  return isString(value) && CONSTRAINT_TYPE_OPTIONS.includes(value as ConstraintTypeOption)
}

export function isObjectiveSenseOption(value: unknown): value is ObjectiveSenseOption {
  return isString(value) && OBJECTIVE_SENSE_OPTIONS.includes(value as ObjectiveSenseOption)
}

export function isProblemTypeOption(value: unknown): value is ProblemTypeOption {
  return isString(value) && PROBLEM_TYPE_OPTIONS.includes(value as ProblemTypeOption)
}

export function isSolutionRequestOption(value: unknown): value is SolutionRequestOption {
  return isString(value) && SOLUTION_REQUEST_OPTIONS.includes(value as SolutionRequestOption)
}

export function isSensitivityTypeOption(value: unknown): value is SensitivityTypeOption {
  return isString(value) && SENSITIVITY_TYPE_OPTIONS.includes(value as SensitivityTypeOption)
}

export function isUncertaintyMethodOption(value: unknown): value is UncertaintyMethodOption {
  return isString(value) && UNCERTAINTY_METHOD_OPTIONS.includes(value as UncertaintyMethodOption)
}

export function isOptimizationSolverOption(value: unknown): value is OptimizationSolverOption {
  return isString(value) && OPTIMIZATION_SOLVER_OPTIONS.includes(value as OptimizationSolverOption)
}

export function isInferenceSamplerOption(value: unknown): value is InferenceSamplerOption {
  return isString(value) && INFERENCE_SAMPLER_OPTIONS.includes(value as InferenceSamplerOption)
}

export function isMathNotationOption(value: unknown): value is MathNotationOption {
  return isString(value) && MATH_NOTATION_OPTIONS.includes(value as MathNotationOption)
}

export function isNumberFormatOption(value: unknown): value is NumberFormatOption {
  return isString(value) && NUMBER_FORMAT_OPTIONS.includes(value as NumberFormatOption)
}

// Complex type guards for FRMData sections
export function isMetadata(value: unknown): value is FRMData['metadata'] {
  if (!isObject(value)) return false
  
  const metadata = value as Record<string, unknown>
  
  return (
    isString(metadata.problem_id) &&
    isDomainOption(metadata.domain) &&
    isString(metadata.version) &&
    (metadata.notes === undefined || isString(metadata.notes)) &&
    (metadata.novelty_context === undefined || isNoveltyContext(metadata.novelty_context))
  )
}

export function isNoveltyContext(value: unknown): value is FRMData['metadata']['novelty_context'] {
  if (!isObject(value)) return false
  
  const context = value as Record<string, unknown>
  
  return (
    (context.problem_lineage_note === undefined || isString(context.problem_lineage_note)) &&
    (context.known_baselines === undefined || isArray<string>(context.known_baselines)) &&
    (context.intended_contribution_type === undefined || 
     (isString(context.intended_contribution_type) &&
     ['model', 'equation', 'method', 'problem', 'analysis', 'dataset', 'system', 'other'].includes(context.intended_contribution_type))) &&
    (context.domains_involved === undefined ||
      (isArray(context.domains_involved) && (context.domains_involved as unknown[]).every(isDomainOption)))
  )
}

export function isQuantity(value: unknown): value is FRMData['input']['known_quantities'][0] {
  if (!isObject(value)) return false
  
  const quantity = value as Record<string, unknown>
  
  return (
    isString(quantity.symbol) &&
    (isNumber(quantity.value) || isArray<number>(quantity.value)) &&
    isString(quantity.units) &&
    isString(quantity.description) &&
    (quantity.uncertainty === undefined || isUncertainty(quantity.uncertainty))
  )
}

export function isUncertainty(value: unknown): value is FRMData['input']['known_quantities'][0]['uncertainty'] {
  if (!isObject(value)) return false
  
  const uncertainty = value as Record<string, unknown>
  
  return (
    isQuantityUncertaintyOption(uncertainty.type) &&
    isNumber(uncertainty.value) &&
    (uncertainty.units === undefined || isString(uncertainty.units))
  )
}

export function isVariable(value: unknown): value is FRMData['input']['unknowns'][0] {
  if (!isObject(value)) return false
  
  const variable = value as Record<string, unknown>
  
  return (
    isString(variable.symbol) &&
    isString(variable.description) &&
    isVariableRoleOption(variable.role) &&
    isString(variable.units) &&
    (variable.bounds === undefined || isBounds(variable.bounds))
  )
}

export function isBounds(value: unknown): value is FRMData['input']['unknowns'][0]['bounds'] {
  if (!isObject(value)) return false
  
  const bounds = value as Record<string, unknown>
  
  return (
    (isNumber(bounds.lower) || isString(bounds.lower)) &&
    (isNumber(bounds.upper) || isString(bounds.upper)) &&
    (bounds.units === undefined || isString(bounds.units))
  )
}

export function isConstraint(value: unknown): value is FRMData['input']['constraints_goals']['hard_constraints'][0] {
  if (!isObject(value)) return false
  
  const constraint = value as Record<string, unknown>
  
  return (
    isString(constraint.expression) &&
    isConstraintTypeOption(constraint.type)
  )
}

export function isObjective(value: unknown): value is FRMData['input']['constraints_goals']['objective'] {
  if (!isObject(value)) return false
  
  const objective = value as Record<string, unknown>
  
  return (
    isString(objective.expression) &&
    isObjectiveSenseOption(objective.sense)
  )
}

export function isEquation(value: unknown): value is FRMData['modeling']['equations'][0] {
  if (!isObject(value)) return false
  
  const equation = value as Record<string, unknown>
  
  return (
    isString(equation.id) &&
    isString(equation.lhs) &&
    isString(equation.rhs) &&
    isString(equation.mechanism_link) &&
    isString(equation.novelty_tag) &&
    ['new', 'variant', 'borrowed', 'baseline'].includes(equation.novelty_tag) &&
    (equation.prior_art_citations === undefined || isArray<string>(equation.prior_art_citations)) &&
    (equation.divergence_note === undefined || isString(equation.divergence_note))
  )
}

export function isCitation(value: unknown): value is FRMData['novelty_assurance']['citations'][0] {
  if (!isObject(value)) return false
  
  const citation = value as Record<string, unknown>
  
  return (
    isString(citation.id) &&
    isString(citation.title) &&
    isArray<string>(citation.authors) &&
    isNumber(citation.year) &&
    (citation.venue === undefined || isString(citation.venue)) &&
    (citation.doi === undefined || isString(citation.doi)) &&
    (citation.url === undefined || isString(citation.url))
  )
}

// Comprehensive FRMData validation
function validateFRMDataStructure(value: unknown): TypeGuardResult<FRMData> {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!isObject(value)) {
    return {
      isValid: false,
      value: value as FRMData,
      errors: ['Value is not an object'],
      warnings: []
    }
  }
  
  const data = value as Record<string, unknown>
  
  // Check required sections
  const requiredSections = [
    'metadata', 'input', 'modeling', 'method_selection',
    'solution_and_analysis', 'validation', 'output_contract', 'novelty_assurance'
  ]
  
  for (const section of requiredSections) {
    if (!(section in data)) {
      errors.push(`Missing required section: ${section}`)
    } else if (!isObject(data[section])) {
      errors.push(`Section ${section} is not an object`)
    }
  }
  
  // Validate metadata
  if (data.metadata && !isMetadata(data.metadata)) {
    errors.push('Invalid metadata structure')
  }
  
  // Validate input section
  if (data.input && isObject(data.input)) {
    const input = data.input as Record<string, unknown>
    
    if (!isString(input.problem_summary)) {
      errors.push('input.problem_summary must be a string')
    }
    
    if (!isString(input.scope_objective)) {
      errors.push('input.scope_objective must be a string')
    }
    
    if (!isArray(input.known_quantities)) {
      errors.push('input.known_quantities must be an array')
    } else {
      const quantities = input.known_quantities as unknown[]
      quantities.forEach((q, i) => {
        if (!isQuantity(q)) {
          errors.push(`input.known_quantities[${i}] is not a valid quantity`)
        }
      })
    }
    
    if (!isArray(input.unknowns)) {
      errors.push('input.unknowns must be an array')
    } else {
      const unknowns = input.unknowns as unknown[]
      if (unknowns.length === 0) {
        warnings.push('input.unknowns should have at least one variable')
      }
      unknowns.forEach((u, i) => {
        if (!isVariable(u)) {
          errors.push(`input.unknowns[${i}] is not a valid variable`)
        }
      })
    }
  }
  
  // Validate modeling section
  if (data.modeling && isObject(data.modeling)) {
    const modeling = data.modeling as Record<string, unknown>
    
    if (!isModelClassOption(modeling.model_class)) {
      errors.push('modeling.model_class must be a valid model class option')
    }
    
    if (!isArray(modeling.equations)) {
      errors.push('modeling.equations must be an array')
    } else {
      const equations = modeling.equations as unknown[]
      if (equations.length === 0) {
        warnings.push('modeling.equations should have at least one equation')
      }
      equations.forEach((e, i) => {
        if (!isEquation(e)) {
          errors.push(`modeling.equations[${i}] is not a valid equation`)
        }
      })
    }
  }
  
  // Validate novelty assurance section
  if (data.novelty_assurance && isObject(data.novelty_assurance)) {
    const novelty = data.novelty_assurance as Record<string, unknown>
    
    if (!isArray(novelty.citations)) {
      errors.push('novelty_assurance.citations must be an array')
    } else {
      const citations = novelty.citations as unknown[]
      if (citations.length < 3) {
        warnings.push('novelty_assurance.citations should have at least 3 citations')
      }
      citations.forEach((c, i) => {
        if (!isCitation(c)) {
          errors.push(`novelty_assurance.citations[${i}] is not a valid citation`)
        }
      })
    }
  }
  
  return {
    isValid: errors.length === 0,
    value: value as FRMData,
    errors,
    warnings
  }
}

// Type-safe property accessors
export function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] | undefined {
  if (obj && typeof obj === 'object' && key in obj) {
    return obj[key]
  }
  return undefined
}

export function getNestedProperty<T>(obj: unknown, path: string): T | undefined {
  if (!isObject(obj)) return undefined
  
  const keys = path.split('.')
  let current: unknown = obj
  
  for (const key of keys) {
    if (isObject(current) && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  
  return current as T
}

// Safe array operations
export function safeArrayAccess<T>(array: T[] | undefined, index: number): T | undefined {
  if (!isArray(array) || index < 0 || index >= array.length) {
    return undefined
  }
  return array[index]
}

export function safeArrayMap<T, U>(
  array: T[] | undefined, 
  mapper: (item: T, index: number) => U
): U[] {
  if (!isArray(array)) return []
  return array.map(mapper)
}

export function safeArrayFilter<T>(
  array: T[] | undefined, 
  predicate: (item: T, index: number) => boolean
): T[] {
  if (!isArray(array)) return []
  return array.filter(predicate)
}

// Export all type guards and utilities
export { validateFRMDataStructure }
