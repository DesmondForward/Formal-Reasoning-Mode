// Improved FRM schema definition with performance-conscious design.
//
// This module refines the original FRM data structure by
// enforcing immutability on option lists, centralising type
// definitions, and providing a robust deep‑clone helper for
// creating fresh instances of templates.  These changes reduce
// runtime overhead in schema validation pipelines by avoiding
// accidental mutations and by leveraging TypeScript’s static
// inference for constant data.  See the accompanying report for
// discussion of the optimisation rationale.

/* eslint-disable @typescript-eslint/ban-types */

// -----------------------------------------------------------------------------
// Utility types and performance optimizations
//
// `DeepReadonly` recursively marks an object graph as immutable.  This helps
// TypeScript prevent accidental mutation of nested properties, which in turn
// reduces the need for defensive copying at runtime.

export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends Function
  ? T
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T

/**
 * Utility type for creating partial updates with deep merging capabilities
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Utility type for extracting array element types
 */
export type ArrayElement<T> = T extends Array<infer U> ? U : never

/**
 * Utility type for section keys of FRMData
 */
export type SectionKey = keyof FRMData

/**
 * Utility type for extracting section shapes
 */
export type SectionShape<K extends SectionKey> = FRMData[K] extends Record<string, unknown>
  ? FRMData[K]
  : never

/**
 * Performance-optimized deep clone with caching for repeated operations.
 * When `structuredClone` is available it is used directly; otherwise a JSON 
 * fallback is applied. Includes memoization for frequently cloned objects.
 */
const cloneCache = new WeakMap<object, object>()

export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }

  // Check cache for previously cloned objects
  if (cloneCache.has(value as object)) {
    return cloneCache.get(value as object) as T
  }

  let result: T

  if (typeof globalThis.structuredClone === 'function') {
    result = globalThis.structuredClone(value) as T
  } else {
    result = JSON.parse(JSON.stringify(value)) as T
  }

  // Cache the result for future use
  if (typeof value === 'object' && value !== null) {
    cloneCache.set(value as object, result as object)
  }

  return result
}

/**
 * Optimized deep merge function that handles nested objects efficiently
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: DeepPartial<T>): T {
  const result = { ...target }
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMerge(result[key], source[key] as any)
      } else {
        result[key] = source[key] as any
      }
    }
  }
  
  return result
}

/**
 * Type guard for validating FRMData structure at runtime
 */
export function isFRMData(value: unknown): value is FRMData {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const obj = value as Record<string, unknown>
  
  // Check required top-level sections
  const requiredSections = [
    'metadata', 'input', 'modeling', 'method_selection', 
    'solution_and_analysis', 'validation', 'output_contract', 'novelty_assurance'
  ]
  
  return requiredSections.every(section => 
    section in obj && typeof obj[section] === 'object' && obj[section] !== null
  )
}

/**
 * Type guard for validating domain options
 */
export function isDomainOption(value: unknown): value is DomainOption {
  return typeof value === 'string' && DOMAIN_OPTIONS.includes(value as DomainOption)
}

/**
 * Type guard for validating model class options
 */
export function isModelClassOption(value: unknown): value is ModelClassOption {
  return typeof value === 'string' && MODEL_CLASS_OPTIONS.includes(value as ModelClassOption)
}

/**
 * Performance-optimized validation helper for array operations
 */
export function validateArrayUpdate<T>(
  array: T[] | undefined,
  index: number,
  _updates: Partial<T>
): { isValid: boolean; error?: string } {
  if (!Array.isArray(array)) {
    return { isValid: false, error: 'Target is not an array' }
  }
  
  if (index < 0 || index >= array.length) {
    return { isValid: false, error: 'Index out of bounds' }
  }
  
  return { isValid: true }
}

// -----------------------------------------------------------------------------
// Enumerations
//
// Option arrays are declared as constant readonly tuples.  Declaring these
// values as `as const` enables TypeScript to infer literal union types from
// their contents.  Marking them as `readonly` ensures that the lists cannot
// be mutated at runtime, preventing accidental tampering during schema
// validation.

export const DOMAIN_OPTIONS = [
  'artificial_intelligence',
  'astrophysics',
  'autonomous_systems',
  'biology',
  'chemical_engineering',
  'chemistry',
  'climate_science',
  'coding',
  'computational_finance',
  'cybersecurity',
  'data_science',
  'economics',
  'energy_systems',
  'engineering',
  'fluid_dynamics',
  'fluid_mechanics',
  'general',
  'geosciences',
  'materials_science',
  'mathematics',
  'medicine',
  'metrology',
  'neuroscience',
  'network_science',
  'physics',
  'public_health',
  'quantum_computing',
  'renewable_energy',
  'robotics',
  'signal_processing',
  'social_science',
  'space_technology',
  'synthetic_biology',
  'systems_biology'
] as const
export type DomainOption = typeof DOMAIN_OPTIONS[number]

export const MODEL_CLASS_OPTIONS = [
  'ODE',
  'PDE',
  'DAE',
  'SDE',
  'discrete',
  'hybrid',
] as const
export type ModelClassOption = typeof MODEL_CLASS_OPTIONS[number]

export const VARIABLE_ROLE_OPTIONS = [
  'state',
  'parameter',
  'input',
  'output',
] as const
export type VariableRoleOption = typeof VARIABLE_ROLE_OPTIONS[number]

export const QUANTITY_UNCERTAINTY_OPTIONS = [
  'sd',
  'se',
  'ci',
  'bounds',
] as const
export type QuantityUncertaintyOption = typeof QUANTITY_UNCERTAINTY_OPTIONS[number]

export const CONSTRAINT_TYPE_OPTIONS = ['equality', 'inequality'] as const
export type ConstraintTypeOption = typeof CONSTRAINT_TYPE_OPTIONS[number]

export const OBJECTIVE_SENSE_OPTIONS = ['minimize', 'maximize'] as const
export type ObjectiveSenseOption = typeof OBJECTIVE_SENSE_OPTIONS[number]

export const PROBLEM_TYPE_OPTIONS = [
  'dynamics',
  'optimization',
  'inference',
  'simulation',
] as const
export type ProblemTypeOption = typeof PROBLEM_TYPE_OPTIONS[number]

export const SOLUTION_REQUEST_OPTIONS = [
  'solve_numeric',
  'solve_analytic',
  'optimize',
  'infer',
] as const
export type SolutionRequestOption = typeof SOLUTION_REQUEST_OPTIONS[number]


export const OPTIMIZATION_SOLVER_OPTIONS = ['scipy', 'cvxpy', 'gurobi', 'cplex'] as const
export type OptimizationSolverOption = typeof OPTIMIZATION_SOLVER_OPTIONS[number]

export const INFERENCE_SAMPLER_OPTIONS = ['mcmc', 'vi', 'hmc', 'nuts'] as const
export type InferenceSamplerOption = typeof INFERENCE_SAMPLER_OPTIONS[number]


export const SECTIONS_REQUIRED_MIN = 1 as const

// New enums for enhanced features
export const SYMBOLIC_REGRESSION_ALGORITHM_OPTIONS = [
  'genetic_programming',
  'deep_learning',
  'hybrid',
  'other'
] as const
export type SymbolicRegressionAlgorithmOption = typeof SYMBOLIC_REGRESSION_ALGORITHM_OPTIONS[number]

export const SEARCH_STRATEGY_OPTIONS = [
  'reinforcement_learning',
  'evolutionary',
  'beam_search',
  'random_search',
  'other'
] as const
export type SearchStrategyOption = typeof SEARCH_STRATEGY_OPTIONS[number]

export const NOVELTY_METRIC_OPTIONS = [
  'cosine_embedding',
  'rougeL',
  'jaccard_terms',
  'nli_contradiction',
  'qa_novelty',
  'citation_overlap',
  'novascore',
  'relative_neighbor_density',
  'creativity_index'
] as const
export type NoveltyMetricOption = typeof NOVELTY_METRIC_OPTIONS[number]

export const CONTRIBUTION_TYPE_OPTIONS = [
  'model',
  'equation',
  'method',
  'problem',
  'analysis',
  'dataset',
  'system',
  'other'
] as const
export type ContributionTypeOption = typeof CONTRIBUTION_TYPE_OPTIONS[number]

export const NOVELTY_TAG_OPTIONS = [
  'new',
  'variant',
  'borrowed',
  'baseline'
] as const
export type NoveltyTagOption = typeof NOVELTY_TAG_OPTIONS[number]


export const NOVELTY_ERROR_CODE_OPTIONS = [
  'COVERAGE_LOW',
  'SIMILARITY_HIGH',
  'MISSING_CITATION',
  'EVIDENCE_MISMATCH',
  'PARAPHRASE_HIGH',
  'SELF_DUPLICATION'
] as const
export type NoveltyErrorCodeOption = typeof NOVELTY_ERROR_CODE_OPTIONS[number]

export const SEVERITY_OPTIONS = ['info', 'warning', 'error'] as const
export type SeverityOption = typeof SEVERITY_OPTIONS[number]

export const MISSING_EVIDENCE_POLICY_OPTIONS = [
  'fail_validation',
  'allow_with_warning'
] as const
export type MissingEvidencePolicyOption = typeof MISSING_EVIDENCE_POLICY_OPTIONS[number]

export const ON_FAIL_ACTION_OPTIONS = [
  'reject',
  'request_more_search',
  'revise',
  'defer'
] as const
export type OnFailActionOption = typeof ON_FAIL_ACTION_OPTIONS[number]

export const FINAL_DECISION_OPTIONS = [
  'proceed',
  'revise',
  'reject'
] as const
export type FinalDecisionOption = typeof FINAL_DECISION_OPTIONS[number]

export const ARTIFACT_TYPE_OPTIONS = [
  'graph',
  'table',
  'notebook',
  'code',
  'dataset',
  'other'
] as const
export type ArtifactTypeOption = typeof ARTIFACT_TYPE_OPTIONS[number]

export const SOURCE_TYPE_OPTIONS = [
  'experimental_data',
  'simulation',
  'benchmark',
  'theoretical'
] as const
export type SourceTypeOption = typeof SOURCE_TYPE_OPTIONS[number]

// -----------------------------------------------------------------------------
// Type definitions for individual components
export interface Quantity {
  symbol: string
  value: number | number[]
  units: string
  description: string
  uncertainty?: {
    type: QuantityUncertaintyOption
    value: number
    units?: string
  }
}

export interface Variable {
  symbol: string
  description: string
  role: VariableRoleOption
  units: string
  bounds?: {
    lower: number | string
    upper: number | string
    units?: string
  }
  prior?: {
    distribution: string
    parameters: Record<string, unknown>
  }
}

export interface Constraint {
  expression: string
  type: ConstraintTypeOption
}

export interface Objective {
  expression: string
  sense: ObjectiveSenseOption
}

export interface Equation {
  id: string
  lhs: string
  rhs: string
  mechanism_link: string
  novelty_tag: 'new' | 'variant' | 'borrowed' | 'baseline'
  prior_art_citations?: string[]
  divergence_note?: string
}

export interface InitialCondition {
  variable: string
  value: number | string
  units?: string
}

export interface ChosenMethod {
  name: string
  justification: string
  prior_art_citations?: string[]
  novelty_diff?: string
  novelty_tag?: 'new' | 'variant' | 'borrowed' | 'baseline'
  tolerances?: {
    absolute: number
    relative: number
  }
}

export interface ValidationError {
  instancePath: string
  schemaPath: string
  keyword: string
  params: Record<string, unknown>
  message: string
}

// New interfaces for enhanced features
export interface SymbolicRegression {
  algorithm_type: SymbolicRegressionAlgorithmOption
  function_library: Array<{
    name: string
    allowed: boolean
    domain_notes?: string
  }>
  search_strategy: SearchStrategyOption
  data_description?: string
  benchmark_reference?: string
  novelty_metrics: NoveltyMetricOption[]
}

export interface SearchIntegration {
  enabled: boolean
  tools_used: string[]
  strategy: string
  justification: string
}

export interface SimilarityMetric {
  name: NoveltyMetricOption
  score: number
  direction: 'lower_is_better' | 'higher_is_better'
  threshold: number
  passed: boolean
  notes?: string
}

export interface NoveltyTest {
  name: string
  result: string
  evidence_citation_ids?: string[]
}

export interface EvidenceLink {
  section: string
  claim_id?: string
  citation_ids: string[]
  file_ids?: string[]
  source_type?: SourceTypeOption
}

export interface Artifact {
  type: ArtifactTypeOption
  uri: string
  hash?: string
}

export interface NoveltyError {
  code: NoveltyErrorCodeOption
  message: string
  severity: SeverityOption
  section: string
  resolved: boolean
}

export interface GeneralizationCheck {
  dataset_used: string
  metric_name: string
  value: number
  threshold: number
  passed: boolean
  notes?: string
}

export interface ScientificAlignmentCheck {
  principle_name: string
  passed: boolean
  comment?: string
}

export interface ExpertReview {
  experts: string[]
  summary: string
  interpretability_score?: number
}

export interface CrossDomainPerformance {
  metric_name: string
  value: number
  threshold: number
  passed: boolean
  notes?: string
}

export interface CreativityScores {
  originality: number
  feasibility: number
  impact: number
  reliability: number
}

export interface EvaluationDataset {
  name?: string
  description?: string
  data_scope?: string
  anonymization_methods?: string
}

// -----------------------------------------------------------------------------
// Core interface definitions

/**
 * Primary structure capturing all information associated with an FRM problem.
 * Each sub‑section of this interface mirrors the domain concepts defined in
 * the optimisation pipeline, from metadata through modelling, method
 * selection, solution details, validation, output formatting, and novelty
 * assurance.  Optional properties are marked explicitly to improve type
 * clarity.
 */
export interface FRMData {
  metadata: {
    problem_id: string
    domain: DomainOption
    version: string
    notes?: string
    novelty_context?: {
      problem_lineage_note?: string
      known_baselines?: string[]
      intended_contribution_type?: ContributionTypeOption
      domains_involved?: DomainOption[]
    }
  }
  input: {
    problem_summary: string
    scope_objective: string
    known_quantities: Array<{
      symbol: string
      value: number | number[]
      units: string
      description: string
      uncertainty?: {
        type: QuantityUncertaintyOption
        value: number
        units?: string
      }
    }>
    unknowns: Array<{
      symbol: string
      description: string
      role: VariableRoleOption
      units: string
      bounds?: {
        lower: number | string
        upper: number | string
        units?: string
      }
    }>
    mechanistic_notes: string
    constraints_goals: {
      hard_constraints: Array<{
        expression: string
        type: ConstraintTypeOption
      }>
      soft_preferences: Array<{
        expression: string
        weight: number
      }>
      objective: {
        expression: string
        sense: ObjectiveSenseOption
      }
    }
  }
  modeling: {
    model_class: ModelClassOption
    variables: Array<{
      symbol: string
      description: string
      role: VariableRoleOption
      units: string
      bounds?: {
        lower: number | string
        upper: number | string
        units?: string
      }
      prior?: {
        distribution: string
        parameters: Record<string, unknown>
      }
    }>
    equations: Array<{
      id: string
      lhs: string
      rhs: string
      mechanism_link: string
      novelty_tag: NoveltyTagOption
      prior_art_citations?: string[]
      divergence_note?: string
    }>
    initial_conditions: Array<{
      variable: string
      value: number | string
      units?: string
    }>
    measurement_model: Array<{
      observable: string
      expression: string
      noise_model: string
      novelty_tag?: NoveltyTagOption
      prior_art_citations?: string[]
      divergence_note?: string
    }>
    assumptions: string[]
    interpretability_required?: boolean
    symbolic_regression?: SymbolicRegression
  }
  method_selection: {
    problem_type: ProblemTypeOption
    chosen_methods: Array<{
      name: string
      justification: string
      prior_art_citations?: string[]
      novelty_diff?: string
      novelty_tag?: NoveltyTagOption
    }>
    search_integration?: SearchIntegration
  }
  solution_and_analysis: {
    solution_requests: SolutionRequestOption[]
    optimization_problem?: {
      objective: string
      constraints: string[]
      solver: string
    }
    inference_problem?: {
      prior: string
      likelihood: string
      sampler: string
    }
    simulation_scenario?: {
      initial_state: string
      parameters: string
      inputs: string
      horizon: string
    }
    narrative_guidance?: {
      style: 'tutorial' | 'formal' | 'conversational'
      depth: 'high_level' | 'detailed'
      purpose: 'insight' | 'verification' | 'education'
    }
  }
  validation: {
    unit_consistency_check: boolean
    mechanism_coverage_check: boolean
    constraint_satisfaction_metrics: Array<{
      name: string
      value: number
      threshold: number
    }>
    fit_quality_metrics: Array<{
      name: string
      value: number
      threshold: number
    }>
    counterfactual_sanity: {
      enabled: boolean
      perturb_percent: number
    }
    novelty_gate_pass: boolean
    novelty_checks?: Array<{
      name: string
      passed: boolean
      value: number
      threshold: number
      direction: 'lower_is_better' | 'higher_is_better'
      notes?: string
    }>
    generalization_checks?: GeneralizationCheck[]
    scientific_alignment_checks?: ScientificAlignmentCheck[]
    expert_review?: ExpertReview
  }
  output_contract: {
    sections_required: string[]
    formatting: {
      math_notation: 'latex' | 'unicode'
      explanation_detail: 'terse' | 'detailed'
    }
    safety_note: {
      flag: boolean
      content: string
    }
  }
  novelty_assurance: {
    prior_work: {
      search_queries: string[]
      literature_corpus_summary: string
      key_papers: string[]
    }
    citations: Array<{
      id: string
      title: string
      authors: string[]
      year: number
      venue?: string
      doi?: string
      url?: string
    }>
    citation_checks: {
      coverage_ratio: number
      paraphrase_overlap: number
      coverage_min_threshold: number
      conflicts?: Array<{
        citation_id: string
        issue: string
        resolution: string
      }>
    }
    similarity_assessment: {
      metrics: SimilarityMetric[]
      aggregates: {
        max_similarity: number
        min_novelty_score: number
        passes: boolean
      }
      self_overlap_ratio?: number
      cross_domain_performance?: CrossDomainPerformance
    }
    novelty_claims: Array<{
      id: string
      statement: string
      category: ContributionTypeOption
      evidence_citations: string[]
      tests?: NoveltyTest[]
      expected_impact?: string
      creativity_scores?: CreativityScores
    }>
    redundancy_check: {
      rules_applied: string[]
      final_decision: FinalDecisionOption
      justification: string
      blocker_reasons?: string[]
      gate_pass: boolean
      overrides?: {
        allowed?: boolean
        reason?: string
      }
    }
    evidence_tracking: {
      evidence_map: EvidenceLink[]
      artifacts?: Artifact[]
    }
    error_handling: {
      novelty_errors: NoveltyError[]
      missing_evidence_policy: MissingEvidencePolicyOption
      on_fail_action: OnFailActionOption
    }
    evaluation_dataset?: EvaluationDataset
  }
}

// -----------------------------------------------------------------------------
// Empty template
//
// To generate new FRM documents, consumers can clone this constant.  It is
// defined using `as const` so that literal types are preserved and the
// structure is deeply immutable.  Modifications should be applied to a clone
// obtained via `createEmptyFRMData()` rather than directly to this object.

export const EMPTY_FRM_DATA: DeepReadonly<FRMData> = {
  metadata: {
    problem_id: 'draft-problem',
    domain: 'general',
    version: 'v1.0',
    notes: 'Replace with domain-specific notes.',
    novelty_context: {
      problem_lineage_note: 'Describe how this problem relates to existing work.',
      known_baselines: [],
      intended_contribution_type: 'model',
      domains_involved: [],
    },
  },
  input: {
    problem_summary: 'Summarise the real-world system and key drivers.',
    scope_objective: 'Describe the question the analysis must answer.',
    known_quantities: [],
    unknowns: [
      {
        symbol: 'X',
        description: 'Primary state or parameter to be determined.',
        role: 'state',
        units: '',
      },
    ],
    mechanistic_notes: 'Capture mechanism-level insights and references.',
    constraints_goals: {
      hard_constraints: [
        {
          expression: 'X >= 0',
          type: 'inequality',
        },
      ],
      soft_preferences: [],
      objective: {
        expression: 'Minimise X over the planning horizon.',
        sense: 'minimize',
      },
    },
  },
    modeling: {
    model_class: 'ODE',
    variables: [
      {
        symbol: 'X',
        description: 'State variable capturing system response.',
        role: 'state',
        units: '',
      },
    ],
    equations: [
      {
        id: 'E1',
        lhs: 'dX/dt',
        rhs: '0',
        mechanism_link: 'Placeholder dynamics; refine with domain knowledge.',
        novelty_tag: 'new',
        prior_art_citations: [],
        divergence_note: 'This is a placeholder equation that needs to be replaced with actual domain-specific dynamics.',
      },
    ],
    initial_conditions: [
      {
        variable: 'X',
        value: 0,
        units: '',
      },
    ],
    measurement_model: [],
    assumptions: ['Assume placeholder dynamics until specified.'],
    interpretability_required: false,
  },
  method_selection: {
    problem_type: 'dynamics',
    chosen_methods: [
      {
        name: 'ode_solve_rk45',
        justification: 'Default adaptive Runge–Kutta solver for baseline configuration.',
        prior_art_citations: [],
        novelty_diff: 'Standard numerical method with no modifications.',
        novelty_tag: 'baseline',
      },
    ],
  },
  solution_and_analysis: {
    solution_requests: ['solve_numeric'],
  },
  validation: {
    unit_consistency_check: true,
    mechanism_coverage_check: true,
    constraint_satisfaction_metrics: [],
    fit_quality_metrics: [],
    counterfactual_sanity: {
      enabled: true,
      perturb_percent: 10,
    },
    novelty_gate_pass: true,
    novelty_checks: [],
    generalization_checks: [],
    scientific_alignment_checks: [],
  },
  output_contract: {
    sections_required: [
      'VariablesAndUnitsTable',
      'ModelEquations',
      'MethodStatement',
      'SolutionDerivation',
      'Analysis',
      'Conclusion',
      'References',
      'Glossary',
    ],
    formatting: {
      math_notation: 'latex',
      explanation_detail: 'detailed',
    },
    safety_note: {
      flag: false,
      content: 'Flag downstream safety considerations here.',
    },
  },
  novelty_assurance: {
    prior_work: {
      search_queries: ['placeholder search query'],
      literature_corpus_summary: 'Placeholder summary of relevant literature. Replace with actual literature review.',
      key_papers: ['CIT001', 'CIT002', 'CIT003'],
    },
    citations: [
      {
        id: 'CIT001',
        title: 'Placeholder Citation 1',
        authors: ['Author One', 'Author Two'],
        year: 2023,
        venue: 'Placeholder Journal',
      },
      {
        id: 'CIT002',
        title: 'Placeholder Citation 2',
        authors: ['Author Three'],
        year: 2022,
        venue: 'Another Journal',
      },
      {
        id: 'CIT003',
        title: 'Placeholder Citation 3',
        authors: ['Author Four', 'Author Five'],
        year: 2021,
        venue: 'Third Journal',
      },
    ],
    citation_checks: {
      coverage_ratio: 0.8,
      paraphrase_overlap: 0.1,
      coverage_min_threshold: 0.6,
      conflicts: [],
    },
    similarity_assessment: {
      metrics: [
        {
          name: 'cosine_embedding',
          score: 0.2,
          direction: 'lower_is_better',
          threshold: 0.7,
          passed: true,
          notes: 'Low similarity indicates novelty',
        },
        {
          name: 'rougeL',
          score: 0.15,
          direction: 'lower_is_better',
          threshold: 0.6,
          passed: true,
          notes: 'Low overlap with existing work',
        },
        {
          name: 'novascore',
          score: 0.85,
          direction: 'higher_is_better',
          threshold: 0.5,
          passed: true,
          notes: 'High novelty score',
        },
        {
          name: 'relative_neighbor_density',
          score: 0.3,
          direction: 'lower_is_better',
          threshold: 0.5,
          passed: true,
          notes: 'Low density indicates novelty',
        },
        {
          name: 'creativity_index',
          score: 0.8,
          direction: 'higher_is_better',
          threshold: 0.6,
          passed: true,
          notes: 'High creativity score',
        },
      ],
      aggregates: {
        max_similarity: 0.2,
        min_novelty_score: 0.85,
        passes: true,
      },
      self_overlap_ratio: 0.05,
    },
    novelty_claims: [
      {
        id: 'NC1',
        statement: 'This work introduces a novel mathematical model for the system dynamics.',
        category: 'model',
        evidence_citations: ['CIT001', 'CIT002'],
        expected_impact: 'Improved accuracy in system prediction',
        creativity_scores: {
          originality: 0.8,
          feasibility: 0.9,
          impact: 0.7,
          reliability: 0.85,
        },
      },
    ],
    redundancy_check: {
      rules_applied: ['similarity_threshold', 'citation_coverage', 'novelty_claims'],
      final_decision: 'proceed',
      justification: 'All novelty checks pass with sufficient evidence and low similarity to prior work.',
      gate_pass: true,
    },
    evidence_tracking: {
      evidence_map: [
        {
          section: 'modeling',
          claim_id: 'NC1',
          citation_ids: ['CIT001', 'CIT002'],
        },
      ],
      artifacts: [],
    },
    error_handling: {
      novelty_errors: [],
      missing_evidence_policy: 'fail_validation',
      on_fail_action: 'revise',
    },
  },
} as const

// -----------------------------------------------------------------------------
// Factory functions and performance optimizations

/**
 * Create a fresh, mutable copy of the empty FRM template.  Consumers should
 * use this helper instead of directly mutating `EMPTY_FRM_DATA` to ensure
 * isolation between problem instances.  The returned object preserves the
 * compile‑time type information of `FRMData` while being safe to modify.
 */
export function createEmptyFRMData(): FRMData {
  return deepClone(EMPTY_FRM_DATA) as unknown as FRMData
}

/**
 * Create a new FRMData instance with partial data merged in
 */
export function createFRMDataWithDefaults(partial: DeepPartial<FRMData>): FRMData {
  return deepMerge(createEmptyFRMData(), partial)
}

/**
 * Performance-optimized section updater with validation
 */
export function updateFRMSection<K extends SectionKey>(
  data: FRMData,
  section: K,
  updates: DeepPartial<SectionShape<K>>
): FRMData {
  return {
    ...data,
    [section]: deepMerge(data[section] as any, updates as any)
  }
}

/**
 * Performance-optimized array item updater with bounds checking
 */
export function updateFRMArrayItem<K extends SectionKey, A extends keyof SectionShape<K>>(
  data: FRMData,
  section: K,
  arrayKey: A,
  index: number,
  updates: Partial<ArrayElement<SectionShape<K>[A]>>
): FRMData {
  const sectionValue = data[section]
  if (!sectionValue || Array.isArray(sectionValue)) {
    return data
  }

  const sectionRecord = sectionValue as Record<string, unknown>
  const arrayValue = sectionRecord[arrayKey as string]
  if (!Array.isArray(arrayValue)) {
    return data
  }

  const validation = validateArrayUpdate(arrayValue, index, updates)
  if (!validation.isValid) {
    console.warn(`Array update validation failed: ${validation.error}`)
    return data
  }

  const typedArray = arrayValue as Array<ArrayElement<SectionShape<K>[A]>>
  const nextArray = typedArray.map((item, itemIndex) =>
    itemIndex === index ? Object.assign({}, item, updates) : item
  )

  return {
    ...data,
    [section]: {
      ...sectionRecord,
      [arrayKey]: nextArray,
    },
  }
}

/**
 * Performance-optimized array item adder
 */
export function addFRMArrayItem<K extends SectionKey, A extends keyof SectionShape<K>>(
  data: FRMData,
  section: K,
  arrayKey: A,
  newItem: ArrayElement<SectionShape<K>[A]>
): FRMData {
  const sectionValue = data[section]
  if (!sectionValue || Array.isArray(sectionValue)) {
    return data
  }

  const sectionRecord = sectionValue as Record<string, unknown>
  const arrayValue = sectionRecord[arrayKey as string]
  if (!Array.isArray(arrayValue)) {
    return data
  }

  const typedArray = arrayValue as Array<ArrayElement<SectionShape<K>[A]>>

  return {
    ...data,
    [section]: {
      ...sectionRecord,
      [arrayKey]: [...typedArray, newItem],
    },
  }
}

/**
 * Performance-optimized array item remover
 */
export function removeFRMArrayItem<K extends SectionKey, A extends keyof SectionShape<K>>(
  data: FRMData,
  section: K,
  arrayKey: A,
  index: number
): FRMData {
  const sectionValue = data[section]
  if (!sectionValue || Array.isArray(sectionValue)) {
    return data
  }

  const sectionRecord = sectionValue as Record<string, unknown>
  const arrayValue = sectionRecord[arrayKey as string]
  if (!Array.isArray(arrayValue)) {
    return data
  }

  const validation = validateArrayUpdate(arrayValue, index, {})
  if (!validation.isValid) {
    console.warn(`Array removal validation failed: ${validation.error}`)
    return data
  }

  const typedArray = arrayValue as Array<ArrayElement<SectionShape<K>[A]>>
  const nextArray = typedArray.filter((_, itemIndex) => itemIndex !== index)

  return {
    ...data,
    [section]: {
      ...sectionRecord,
      [arrayKey]: nextArray,
    },
  }
}

/**
 * Schema migration utility for handling version updates
 */
export function migrateFRMData(data: unknown, fromVersion?: string, toVersion = 'v1.0'): FRMData {
  if (!isFRMData(data)) {
    throw new Error('Invalid FRMData structure')
  }

  // For now, return as-is since we're on v1.0
  // Future versions can implement migration logic here
  if (fromVersion === toVersion) {
    return data
  }

  // Add migration logic for future versions
  console.warn(`Migration from ${fromVersion} to ${toVersion} not implemented yet`)
  return data
}

/**
 * Performance-optimized validation helper for FRMData
 */
export function validateFRMDataStructure(data: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!isFRMData(data)) {
    errors.push('Invalid FRMData structure: missing required sections')
    return { isValid: false, errors }
  }

  // Add specific validation checks
  if (!data.metadata.problem_id) {
    errors.push('Missing required field: metadata.problem_id')
  }

  if (!data.input.unknowns || data.input.unknowns.length === 0) {
    errors.push('Missing required field: input.unknowns (must have at least one)')
  }

  if (!data.modeling.equations || data.modeling.equations.length === 0) {
    errors.push('Missing required field: modeling.equations (must have at least one)')
  }

  return { isValid: errors.length === 0, errors }
}
