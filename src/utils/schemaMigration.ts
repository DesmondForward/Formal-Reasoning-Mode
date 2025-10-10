// Schema migration utilities for seamless updates
//
// This module provides comprehensive migration tools for handling schema version
// updates, ensuring backward compatibility and data integrity during transitions.

import type { FRMData } from '@/data/schema'
import { isFRMData, createEmptyFRMData } from '@/data/schema'
import { schemaDebugger } from './schemaDebug'

export interface MigrationResult {
  success: boolean
  data: FRMData
  warnings: string[]
  errors: string[]
  migrationSteps: string[]
}

export interface MigrationStep {
  version: string
  description: string
  migrate: (data: any) => any
  validate: (data: any) => boolean
}

export interface SchemaVersion {
  version: string
  supportedVersions: string[]
  migrationSteps: MigrationStep[]
}

// Current schema version
const CURRENT_SCHEMA_VERSION = 'v1.0.3'

// Version detection utilities
export function detectSchemaVersion(data: unknown): string | null {
  if (!isFRMData(data)) {
    return null
  }

  const frmData = data as FRMData
  
  // Check metadata version
  if (frmData.metadata?.version) {
    return frmData.metadata.version
  }

  // Check for version indicators in the data structure
  if (frmData.novelty_assurance?.citations && frmData.novelty_assurance.citations.length > 0) {
    const firstCitation = frmData.novelty_assurance.citations[0]
    if (typeof firstCitation.authors === 'string' && typeof firstCitation.source === 'string') {
      return 'v1.0.3' // New Citation structure
    } else if (Array.isArray(firstCitation.authors)) {
      return 'v1.0' // Old Citation structure
    }
  }
  
  if (frmData.novelty_assurance?.redundancy_check?.gate_pass !== undefined) {
    return 'v1.0' // This field was added in v1.0
  }

  // Check for legacy structure indicators
  if (frmData.input && !frmData.input.known_quantities) {
    return 'v0.9' // Legacy version without known_quantities
  }

  return 'unknown'
}

// Migration steps for different versions
const migrationSteps: Record<string, MigrationStep[]> = {
  'v0.9': [
    {
      version: 'v1.0',
      description: 'Add known_quantities field to input section',
      migrate: (data: any) => {
        if (!data.input) {
          data.input = {}
        }
        if (!data.input.known_quantities) {
          data.input.known_quantities = []
        }
        return data
      },
      validate: (data: any) => {
        return data.input && Array.isArray(data.input.known_quantities)
      }
    },
    {
      version: 'v1.0',
      description: 'Add novelty_assurance section with required fields',
      migrate: (data: any) => {
        if (!data.novelty_assurance) {
          data.novelty_assurance = {
            prior_work: {
              search_queries: [],
              literature_corpus_summary: '',
              key_papers: []
            },
            citations: [],
            citation_checks: {
              coverage_ratio: 0,
              paraphrase_overlap: 0,
              coverage_min_threshold: 0.6,
              conflicts: []
            },
            similarity_assessment: {
              metrics: [],
              aggregates: {
                max_similarity: 0,
                min_novelty_score: 0,
                passes: false
              }
            },
            novelty_claims: [],
            redundancy_check: {
              rules_applied: [],
              final_decision: 'proceed',
              justification: '',
              gate_pass: true
            },
            evidence_tracking: {
              evidence_map: []
            },
            error_handling: {
              novelty_errors: [],
              missing_evidence_policy: 'fail_validation',
              on_fail_action: 'revise'
            }
          }
        }
        return data
      },
      validate: (data: any) => {
        return data.novelty_assurance && 
               data.novelty_assurance.redundancy_check &&
               typeof data.novelty_assurance.redundancy_check.gate_pass === 'boolean'
      }
    }
  ],
  'v1.0': [
    // Migration step for Citation authors field change (array to string)
    {
      version: 'v1.0.1',
      description: 'Convert Citation authors from array to string format',
      migrate: (data: any) => {
        if (data.novelty_assurance?.citations) {
          data.novelty_assurance.citations = data.novelty_assurance.citations.map((citation: any) => {
            if (Array.isArray(citation.authors)) {
              citation.authors = citation.authors.join(', ')
            }
            // Add source field if missing
            if (!citation.source && citation.venue) {
              citation.source = citation.venue
            }
            return citation
          })
        }
        return data
      },
      validate: (data: any) => {
        if (data.novelty_assurance?.citations) {
          return data.novelty_assurance.citations.every((citation: any) => 
            typeof citation.authors === 'string' && 
            typeof citation.source === 'string'
          )
        }
        return true
      }
    },
    // Migration step for symbolic regression algorithm options
    {
      version: 'v1.0.2',
      description: 'Update symbolic regression algorithm options',
      migrate: (data: any) => {
        if (data.modeling?.symbolic_regression?.algorithm_type) {
          const oldValue = data.modeling.symbolic_regression.algorithm_type
          // Map old values to new ones if needed
          if (oldValue === 'enumerative' || oldValue === 'LLM_based') {
            // These are already valid, no change needed
          }
        }
        return data
      },
      validate: (data: any) => {
        if (data.modeling?.symbolic_regression?.algorithm_type) {
          const validOptions = ['genetic_programming', 'deep_learning', 'enumerative', 'LLM_based', 'hybrid', 'other']
          return validOptions.includes(data.modeling.symbolic_regression.algorithm_type)
        }
        return true
      }
    },
    // Migration step for novelty metrics options
    {
      version: 'v1.0.3',
      description: 'Update novelty metrics options',
      migrate: (data: any) => {
        if (data.modeling?.symbolic_regression?.novelty_metrics) {
          // Remove any invalid metrics and add temporal_novelty if not present
          const validMetrics = ['cosine_embedding', 'rougeL', 'jaccard_terms', 'nli_contradiction', 'qa_novelty', 'citation_overlap', 'novascore', 'relative_neighbor_density', 'creativity_index', 'temporal_novelty']
          data.modeling.symbolic_regression.novelty_metrics = data.modeling.symbolic_regression.novelty_metrics.filter((metric: string) => validMetrics.includes(metric))
        }
        return data
      },
      validate: (data: any) => {
        if (data.modeling?.symbolic_regression?.novelty_metrics) {
          const validMetrics = ['cosine_embedding', 'rougeL', 'jaccard_terms', 'nli_contradiction', 'qa_novelty', 'citation_overlap', 'novascore', 'relative_neighbor_density', 'creativity_index', 'temporal_novelty']
          return data.modeling.symbolic_regression.novelty_metrics.every((metric: string) => validMetrics.includes(metric))
        }
        return true
      }
    }
  ]
}

// Main migration function
export function migrateSchema(
  data: unknown, 
  fromVersion?: string, 
  toVersion: string = CURRENT_SCHEMA_VERSION
): MigrationResult {
  const startTime = performance.now()
  
  try {
    const detectedVersion = fromVersion || detectSchemaVersion(data)
    
    if (!detectedVersion) {
      return {
        success: false,
        data: createEmptyFRMData(),
        warnings: [],
        errors: ['Unable to detect schema version'],
        migrationSteps: []
      }
    }

    if (detectedVersion === toVersion) {
      return {
        success: true,
        data: data as FRMData,
        warnings: [],
        errors: [],
        migrationSteps: ['No migration needed - already at target version']
      }
    }

    const warnings: string[] = []
    const errors: string[] = []
    const migrationSteps: string[] = []
    let currentData = JSON.parse(JSON.stringify(data)) // Deep clone

    // Get migration path
    const steps = getMigrationPath(detectedVersion, toVersion)
    
    if (steps.length === 0) {
      warnings.push(`No migration path found from ${detectedVersion} to ${toVersion}`)
    }

    // Apply migration steps
    for (const step of steps) {
      try {
        migrationSteps.push(`Migrating ${step.version}: ${step.description}`)
        currentData = step.migrate(currentData)
        
        if (!step.validate(currentData)) {
          errors.push(`Migration step validation failed: ${step.description}`)
        }
      } catch (error) {
        errors.push(`Migration step failed: ${step.description} - ${error}`)
      }
    }

    // Update version in metadata
    if (currentData.metadata) {
      currentData.metadata.version = toVersion
    }

    // Final validation
    const isValid = isFRMData(currentData)
    if (!isValid) {
      errors.push('Final validation failed - migrated data is not valid FRMData')
    }

    const result: MigrationResult = {
      success: errors.length === 0,
      data: currentData as FRMData,
      warnings,
      errors,
      migrationSteps
    }

    schemaDebugger.logOperation('migrateSchema', currentData as FRMData, startTime)
    
    return result

  } catch (error) {
    schemaDebugger.logError(error as Error, 'migrateSchema', data as FRMData)
    
    return {
      success: false,
      data: createEmptyFRMData(),
      warnings: [],
      errors: [`Migration failed: ${error}`],
      migrationSteps: []
    }
  }
}

// Get migration path between versions
function getMigrationPath(fromVersion: string, toVersion: string): MigrationStep[] {
  const path: MigrationStep[] = []
  
  // Simple linear migration for now
  // In a more complex system, this would use a graph-based approach
  const versions = ['v0.9', 'v1.0']
  const fromIndex = versions.indexOf(fromVersion)
  const toIndex = versions.indexOf(toVersion)
  
  if (fromIndex === -1 || toIndex === -1) {
    return path
  }
  
  for (let i = fromIndex; i < toIndex; i++) {
    const currentVersion = versions[i]
    const nextVersion = versions[i + 1]
    
    if (migrationSteps[currentVersion]) {
      const steps = migrationSteps[currentVersion].filter(step => step.version === nextVersion)
      path.push(...steps)
    }
  }
  
  return path
}

// Safe migration with rollback capability
export function migrateSchemaWithRollback(
  data: unknown,
  fromVersion?: string,
  toVersion: string = CURRENT_SCHEMA_VERSION
): MigrationResult & { rollbackData?: unknown } {
  const originalData = JSON.parse(JSON.stringify(data)) // Deep clone for rollback
  
  try {
    const result = migrateSchema(data, fromVersion, toVersion)
    
    if (!result.success) {
      return {
        ...result,
        rollbackData: originalData
      }
    }
    
    return result
  } catch (error) {
    return {
      success: false,
      data: createEmptyFRMData(),
      warnings: [],
      errors: [`Migration with rollback failed: ${error}`],
      migrationSteps: [],
      rollbackData: originalData
    }
  }
}

// Batch migration for multiple documents
export function migrateSchemaBatch(
  documents: unknown[],
  fromVersion?: string,
  toVersion: string = CURRENT_SCHEMA_VERSION
): {
  results: MigrationResult[]
  summary: {
    total: number
    successful: number
    failed: number
    warnings: number
  }
} {
  const results: MigrationResult[] = []
  let successful = 0
  let failed = 0
  let warnings = 0

  for (const doc of documents) {
    const result = migrateSchema(doc, fromVersion, toVersion)
    results.push(result)
    
    if (result.success) {
      successful++
    } else {
      failed++
    }
    
    warnings += result.warnings.length
  }

  return {
    results,
    summary: {
      total: documents.length,
      successful,
      failed,
      warnings
    }
  }
}

// Schema compatibility checker
export function checkSchemaCompatibility(
  data: unknown,
  targetVersion: string = CURRENT_SCHEMA_VERSION
): {
  compatible: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  
  const detectedVersion = detectSchemaVersion(data)
  
  if (!detectedVersion) {
    issues.push('Unable to detect schema version')
    recommendations.push('Ensure data follows FRMData structure')
    return { compatible: false, issues, recommendations }
  }
  
  if (detectedVersion === targetVersion) {
    return { compatible: true, issues, recommendations }
  }
  
  // Check if migration is possible
  const migrationPath = getMigrationPath(detectedVersion, targetVersion)
  
  if (migrationPath.length === 0) {
    issues.push(`No migration path available from ${detectedVersion} to ${targetVersion}`)
    recommendations.push('Contact support for migration assistance')
  } else {
    recommendations.push(`Migration available: ${migrationPath.length} steps required`)
  }
  
  return {
    compatible: migrationPath.length > 0,
    issues,
    recommendations
  }
}

// Export migration utilities
export { CURRENT_SCHEMA_VERSION }
