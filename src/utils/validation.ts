import { FRMData } from '@/data/schema'

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export const validateRequiredFields = (data: Partial<FRMData>): ValidationResult => {
  const errors: ValidationError[] = []

  // Validate metadata
  if (!data.metadata?.problem_id?.trim()) {
    errors.push({
      field: 'metadata.problem_id',
      message: 'Problem ID is required',
      severity: 'error'
    })
  }

  if (!data.metadata?.domain) {
    errors.push({
      field: 'metadata.domain',
      message: 'Domain is required',
      severity: 'error'
    })
  }

  if (!data.metadata?.version?.trim()) {
    errors.push({
      field: 'metadata.version',
      message: 'Version is required',
      severity: 'error'
    })
  }

  // Validate input
  if (!data.input?.problem_summary?.trim()) {
    errors.push({
      field: 'input.problem_summary',
      message: 'Problem summary is required',
      severity: 'error'
    })
  }

  if (!data.input?.scope_objective?.trim()) {
    errors.push({
      field: 'input.scope_objective',
      message: 'Scope and objective is required',
      severity: 'error'
    })
  }

  if (!data.input?.mechanistic_notes?.trim()) {
    errors.push({
      field: 'input.mechanistic_notes',
      message: 'Mechanistic notes are required',
      severity: 'error'
    })
  }

  // Validate unknowns
  if (!data.input?.unknowns || data.input.unknowns.length === 0) {
    errors.push({
      field: 'input.unknowns',
      message: 'At least one unknown variable is required',
      severity: 'error'
    })
  } else {
    data.input.unknowns.forEach((unknown, index) => {
      if (!unknown.symbol?.trim()) {
        errors.push({
          field: `input.unknowns[${index}].symbol`,
          message: 'Variable symbol is required',
          severity: 'error'
        })
      }
      if (!unknown.description?.trim()) {
        errors.push({
          field: `input.unknowns[${index}].description`,
          message: 'Variable description is required',
          severity: 'error'
        })
      }
      if (!unknown.role) {
        errors.push({
          field: `input.unknowns[${index}].role`,
          message: 'Variable role is required',
          severity: 'error'
        })
      }
    })
  }

  // Validate modeling
  if (!data.modeling?.model_class) {
    errors.push({
      field: 'modeling.model_class',
      message: 'Model class is required',
      severity: 'error'
    })
  }

  if (!data.modeling?.variables || data.modeling.variables.length === 0) {
    errors.push({
      field: 'modeling.variables',
      message: 'At least one variable is required',
      severity: 'error'
    })
  } else {
    data.modeling.variables.forEach((variable, index) => {
      if (!variable.symbol?.trim()) {
        errors.push({
          field: `modeling.variables[${index}].symbol`,
          message: 'Variable symbol is required',
          severity: 'error'
        })
      }
      if (!variable.description?.trim()) {
        errors.push({
          field: `modeling.variables[${index}].description`,
          message: 'Variable description is required',
          severity: 'error'
        })
      }
      if (!variable.role) {
        errors.push({
          field: `modeling.variables[${index}].role`,
          message: 'Variable role is required',
          severity: 'error'
        })
      }
    })
  }

  if (!data.modeling?.equations || data.modeling.equations.length === 0) {
    errors.push({
      field: 'modeling.equations',
      message: 'At least one equation is required',
      severity: 'error'
    })
  } else {
    data.modeling.equations.forEach((equation, index) => {
      if (!equation.id?.trim()) {
        errors.push({
          field: `modeling.equations[${index}].id`,
          message: 'Equation ID is required',
          severity: 'error'
        })
      }
      if (!equation.lhs?.trim()) {
        errors.push({
          field: `modeling.equations[${index}].lhs`,
          message: 'Left-hand side is required',
          severity: 'error'
        })
      }
      if (!equation.rhs?.trim()) {
        errors.push({
          field: `modeling.equations[${index}].rhs`,
          message: 'Right-hand side is required',
          severity: 'error'
        })
      }
      if (!equation.mechanism_link?.trim()) {
        errors.push({
          field: `modeling.equations[${index}].mechanism_link`,
          message: 'Mechanism link is required',
          severity: 'error'
        })
      }
      if (!equation.novelty_tag) {
        errors.push({
          field: `modeling.equations[${index}].novelty_tag`,
          message: 'Novelty tag is required',
          severity: 'error'
        })
      }
    })
  }

  // Validate method selection
  if (!data.method_selection?.problem_type) {
    errors.push({
      field: 'method_selection.problem_type',
      message: 'Problem type is required',
      severity: 'error'
    })
  }

  if (!data.method_selection?.chosen_methods || data.method_selection.chosen_methods.length === 0) {
    errors.push({
      field: 'method_selection.chosen_methods',
      message: 'At least one chosen method is required',
      severity: 'error'
    })
  } else {
    data.method_selection.chosen_methods.forEach((method, index) => {
      if (!method.name?.trim()) {
        errors.push({
          field: `method_selection.chosen_methods[${index}].name`,
          message: 'Method name is required',
          severity: 'error'
        })
      }
      if (!method.justification?.trim()) {
        errors.push({
          field: `method_selection.chosen_methods[${index}].justification`,
          message: 'Method justification is required',
          severity: 'error'
        })
      }
    })
  }

  // Validate constraints and goals
  if (!data.input?.constraints_goals?.objective?.expression?.trim()) {
    errors.push({
      field: 'input.constraints_goals.objective.expression',
      message: 'Objective expression is required',
      severity: 'error'
    })
  }

  if (!data.input?.constraints_goals?.objective?.sense) {
    errors.push({
      field: 'input.constraints_goals.objective.sense',
      message: 'Objective sense is required',
      severity: 'error'
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export const getFieldError = (field: string, errors: ValidationError[]): ValidationError | undefined => {
  return errors.find(error => error.field === field)
}

export const hasFieldError = (field: string, errors: ValidationError[]): boolean => {
  return errors.some(error => error.field === field)
}
