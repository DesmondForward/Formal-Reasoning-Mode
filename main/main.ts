import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

import { callValidateTool } from './mcp/frmMcpServer.js'

// Communication event tracking
interface CommunicationEvent {
  id: string
  timestamp: Date
  source: 'FRM' | 'MCP' | 'GPT-5'
  target: 'FRM' | 'MCP' | 'GPT-5'
  type: 'request' | 'response' | 'error' | 'info'
  message: string
  data?: any
  duration?: number
}

let communicationStartTime: number | null = null

// Communication tracking functions
const sendCommunicationEvent = (event: Omit<CommunicationEvent, 'id' | 'timestamp'>) => {
  const fullEvent: CommunicationEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date()
  }
  
  if (mainWindow) {
    console.log('Sending communication event:', fullEvent)
    mainWindow.webContents.send('communication-event', fullEvent)
  } else {
    console.warn('Cannot send communication event - mainWindow is null')
  }
}

const startCommunicationTracking = (source: 'FRM' | 'MCP' | 'GPT-5', target: 'FRM' | 'MCP' | 'GPT-5', message: string, data?: any) => {
  communicationStartTime = Date.now()
  sendCommunicationEvent({
    source,
    target,
    type: 'request',
    message,
    data
  })
}

const endCommunicationTracking = (source: 'FRM' | 'MCP' | 'GPT-5', target: 'FRM' | 'MCP' | 'GPT-5', message: string, data?: any, isError = false) => {
  const duration = communicationStartTime ? Date.now() - communicationStartTime : undefined
  communicationStartTime = null
  
  sendCommunicationEvent({
    source,
    target,
    type: isError ? 'error' : 'response',
    message,
    data,
    duration
  })
}

if (process.env.ELECTRON_RUN_AS_NODE === '1') {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE

  const child = spawn(process.execPath, process.argv.slice(1), { env, stdio: 'inherit' })
  const exitCode = await new Promise<number>((resolve, reject) => {
    child.once('error', (error) => reject(error))
    child.once('exit', (code) => resolve(code ?? 0))
  }).catch((error) => {
    console.error('Failed to relaunch Electron without ELECTRON_RUN_AS_NODE', error)
    return 1
  })

  process.exit(exitCode)
}

const electronModule = (await import('electron')) as typeof import('electron')

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = electronModule

type BrowserWindowInstance = InstanceType<typeof BrowserWindow>
let mainWindow: BrowserWindowInstance | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const loadEnvIfPresent = () => {
  const searchRoots = [process.cwd(), join(__dirname, '..')]
  const filenames = ['.env.local', '.env']

  for (const root of searchRoots) {
    if (!root) {
      continue
    }

    for (const name of filenames) {
      const candidate = join(root, name)
      if (!existsSync(candidate)) {
        continue
      }

      try {
        const lines = readFileSync(candidate, 'utf-8').split(/\r?\n/)
        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line || line.startsWith('#')) {
            continue
          }

          const equalsIndex = line.indexOf('=')
          if (equalsIndex === -1) {
            continue
          }

          const key = line.slice(0, equalsIndex).trim()
          if (!key || key in process.env) {
            continue
          }

          const value = line.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, '')
          process.env[key] = value
        }
      } catch (error) {
        console.warn(`Failed to load environment file at ${candidate}:`, error)
      }
    }
  }
}

loadEnvIfPresent()

const getOpenAIConfig = () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL ?? 'gpt-5-2025-08-07',
  apiUrl: process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1/responses',
})

const DEFAULT_SYSTEM_PROMPT = `You are an assistant that creates Formal Reasoning Mode (FRM) problem JSON documents.
Each response must be a single JSON object conforming to the FRM schema with the top-level keys: metadata, input, modeling, method_selection, solution_and_analysis, validation, output_contract, novelty_assurance.

CRITICAL SCHEMA REQUIREMENTS:
- The "input" section MUST include: problem_summary, scope_objective, known_quantities (array), unknowns (array), mechanistic_notes (string), constraints_goals (object)
- The "modeling" section MUST include: model_class (string), variables (array), equations (array)
- Each equation in the "modeling.equations" array MUST include: id, lhs, rhs, mechanism_link, novelty_tag ("new", "variant", "borrowed", or "baseline")
- CRITICAL: Every equation MUST have a novelty_tag property - this is REQUIRED and will cause validation failure if missing
- The "validation" section MUST include: unit_consistency_check (boolean), mechanism_coverage_check (boolean), constraint_satisfaction_metrics (array), fit_quality_metrics (array), counterfactual_sanity (object), novelty_gate_pass (boolean)
- CRITICAL: The validation section MUST include novelty_gate_pass: true - this is REQUIRED and will cause validation failure if missing
- The "output_contract" section MUST include: sections_required (array with specific constants), formatting (object), safety_note (string)
- The "output_contract.sections_required" array MUST contain these exact strings: "VariablesAndUnitsTable", "ModelEquations", "MethodStatement", "Results", "Validation", "ActionableRecommendation", "RefinementHooks", "Novelty Statement", "Prior Work Comparison", "Redundancy Check", "Evidence & Citations"
- The "novelty_assurance" section MUST include: prior_work, citations, citation_checks, similarity_assessment, novelty_claims, redundancy_check, evidence_tracking, error_handling
- Each item in "novelty_claims" MUST include: id (pattern ^NC[0-9]+$), statement (min 20 chars), category (one of: "model", "equation", "method", "problem", "analysis", "dataset", "system"), evidence_citations (array)
- The "solution_and_analysis" section MUST include: solution_requests (array), sensitivity_analysis (object), uncertainty_propagation (object)
- solution_requests array items MUST be exactly one of: "solve_numeric", "solve_analytic", "optimize", "infer" (NO other values allowed)
- sensitivity_analysis object MUST have exactly: type ("local", "sobol", or "bootstrap"), parameters (array of strings), perturbation_fraction (number >= 0)
- uncertainty_propagation object MUST have exactly: method ("delta_method", "sampling", or "bayesian"), n_samples (integer >= 1)
- All arrays must have at least the minimum required items as specified in the schema
- All required string fields must be non-empty
- All required object fields must be present and properly structured
- NO additional properties allowed beyond what the schema defines (additionalProperties: false)

ABSOLUTELY CRITICAL - NO EXTRA PROPERTIES:
- DO NOT add any properties ending with "_extra" (like method_selection_extra, solution_and_analysis_extra, etc.)
- DO NOT add any properties not explicitly defined in the schema
- The schema has "additionalProperties": false which means ANY extra property will cause validation to fail
- Only include the exact properties defined in the schema for each section

EXAMPLE STRUCTURE (use as template):
{
  "metadata": {
    "problem_id": "unique-problem-id",
    "domain": "medicine",
    "version": "v1.0",
    "notes": "Brief description",
    "novelty_context": {
      "problem_lineage_note": "How this relates to existing work",
      "known_baselines": ["baseline1", "baseline2"],
      "intended_contribution_type": "model"
    }
  },
  "input": {
    "problem_summary": "Detailed problem description",
    "scope_objective": "What needs to be determined",
    "known_quantities": [
      {"symbol": "k1", "value": 0.5, "units": "1/day", "description": "Rate constant"}
    ],
    "unknowns": [
      {"symbol": "X", "description": "State variable", "role": "state", "units": "mg/L"}
    ],
    "mechanistic_notes": "Biological/physical mechanisms",
    "constraints_goals": {
      "hard_constraints": [{"expression": "X >= 0", "type": "inequality"}],
      "soft_preferences": [],
      "objective": {"expression": "minimize X", "sense": "minimize"}
    }
  },
  "modeling": {
    "model_class": "ODE",
    "variables": [
      {"symbol": "X", "description": "State variable", "role": "state", "units": "mg/L"}
    ],
    "equations": [
      {
        "id": "E1",
        "lhs": "dX/dt",
        "rhs": "-k1*X",
        "mechanism_link": "First-order decay",
        "novelty_tag": "new"
      }
    ],
    "initial_conditions": [{"variable": "X", "value": 100, "units": "mg/L"}],
    "measurement_model": [],
    "assumptions": ["Constant rate parameters"]
  },
  "method_selection": {
    "problem_type": "dynamics",
    "chosen_methods": [
      {
        "name": "ode_solve_rk45",
        "justification": "Adaptive Runge-Kutta for ODEs",
        "novelty_tag": "baseline"
      }
    ]
  },
  "solution_and_analysis": {
    "solution_requests": ["solve_numeric"],
    "sensitivity_analysis": {
      "type": "local",
      "parameters": ["k1"],
      "perturbation_fraction": 0.1
    },
    "uncertainty_propagation": {
      "method": "delta_method",
      "n_samples": 500
    }
  },
  "validation": {
    "unit_consistency_check": true,
    "mechanism_coverage_check": true,
    "constraint_satisfaction_metrics": [],
    "fit_quality_metrics": [],
    "counterfactual_sanity": {"enabled": true, "perturb_percent": 10},
    "novelty_gate_pass": true
  },
  "output_contract": {
    "sections_required": [
      "VariablesAndUnitsTable",
      "ModelEquations",
      "MethodStatement",
      "Results",
      "Validation",
      "ActionableRecommendation",
      "RefinementHooks",
      "Novelty Statement",
      "Prior Work Comparison", 
      "Redundancy Check",
      "Evidence & Citations"
    ],
    "formatting": {
      "math_notation": "LaTeX",
      "number_format": "auto",
      "significant_figures": 4
    },
    "safety_note": "No safety concerns identified"
  },
  "novelty_assurance": {
    "prior_work": {
      "search_queries": ["pharmacokinetics", "drug clearance"],
      "literature_corpus_summary": "Review of existing PK models",
      "key_papers": ["CIT001", "CIT002", "CIT003"]
    },
    "citations": [
      {"id": "CIT001", "title": "Paper 1", "authors": ["Author A"], "year": 2023},
      {"id": "CIT002", "title": "Paper 2", "authors": ["Author B"], "year": 2022},
      {"id": "CIT003", "title": "Paper 3", "authors": ["Author C"], "year": 2021}
    ],
    "citation_checks": {
      "coverage_ratio": 0.8,
      "paraphrase_overlap": 0.1,
      "coverage_min_threshold": 0.6,
      "conflicts": []
    },
    "similarity_assessment": {
      "metrics": [
        {"name": "cosine_embedding", "score": 0.2, "direction": "lower_is_better", "threshold": 0.7, "passed": true},
        {"name": "rougeL", "score": 0.15, "direction": "lower_is_better", "threshold": 0.6, "passed": true},
        {"name": "novascore", "score": 0.85, "direction": "higher_is_better", "threshold": 0.5, "passed": true}
      ],
      "aggregates": {
        "max_similarity": 0.2,
        "min_novelty_score": 0.85,
        "passes": true
      }
    },
    "novelty_claims": [
      {
        "id": "NC1",
        "statement": "Novel mathematical model for drug clearance",
        "category": "model",
        "evidence_citations": ["CIT001", "CIT002"]
      }
    ],
    "redundancy_check": {
      "rules_applied": ["similarity_threshold", "citation_coverage"],
      "final_decision": "proceed",
      "justification": "Low similarity to prior work",
      "gate_pass": true
    },
    "evidence_tracking": {
      "evidence_map": [
        {"section": "modeling", "claim_id": "NC1", "citation_ids": ["CIT001", "CIT002"]}
      ],
      "artifacts": []
    },
    "error_handling": {
      "novelty_errors": [],
      "missing_evidence_policy": "fail_validation",
      "on_fail_action": "revise"
    }
  }
}

Use credible science, engineering, public policy, or quantitative modelling scenarios.
Never reuse previous examples; vary the domain, governing equations, parameters, and motivation every time.
Populate required arrays with at least three well-formed entries where applicable (e.g. known_quantities, unknowns, equations, chosen_methods).
All numeric fields should be realistic and include units where the schema expects them.
Return strictly JSON with no Markdown fences or commentary.`

type ExampleGenerationOptions = {
  domain?: string
  scenarioHint?: string
}

const buildUserPrompt = (options: ExampleGenerationOptions = {}): string => {
  const domainInstruction = options.domain
    ? `Focus on the ${options.domain} domain.`
    : 'Select an appropriate domain such as medicine, biology, public_health, chemistry, engineering, economics, or general, but rotate domains across runs.'
  const scenarioHint = options.scenarioHint ? `Incorporate this scenario guidance: ${options.scenarioHint}.` : ''

  return [
    'Generate a new Formal Reasoning Mode dataset.',
    domainInstruction,
    scenarioHint,
    'CRITICAL SCHEMA COMPLIANCE REQUIREMENTS:',
    '- The "input" section MUST include ALL required fields: problem_summary, scope_objective, known_quantities (array), unknowns (array), mechanistic_notes (string), constraints_goals (object)',
    '- The "modeling" section MUST include ALL required fields: model_class (string), variables (array), equations (array)',
    '- The "modeling" section MUST NOT include any additional properties beyond: model_class, variables, equations, initial_conditions, measurement_model, assumptions',
    '- model_class MUST be exactly one of: "ODE", "PDE", "DAE", "SDE", "discrete", "hybrid" (NO other values allowed)',
    '- constraints_goals must be an object with hard_constraints (array), soft_preferences (array), and objective (object)',
    '- All arrays must have at least the minimum required items as specified in the schema',
    '- All required string fields must be non-empty',
    '- JSON structure must be valid and parseable',
    '- All object properties must match the schema exactly - no extra properties, no missing required properties',
    '',
    'CONSTRAINTS_GOALS STRUCTURE (CRITICAL):',
    '- constraints_goals must be an object with exactly these 3 properties: hard_constraints, soft_preferences, objective',
    '- hard_constraints: array of objects, each with "expression" (string) and "type" (either "equality" or "inequality")',
    '- soft_preferences: array of objects, each with "expression" (string) and "weight" (number)',
    '- objective: object with "expression" (string) and "sense" (either "minimize" or "maximize")',
    '',
    'EXAMPLE of correct constraints_goals structure:',
    '{',
    '  "hard_constraints": [',
    '    {',
    '      "expression": "C_max <= C_tox",',
    '      "type": "inequality"',
    '    },',
    '    {',
    '      "expression": "x(0) = x0",',
    '      "type": "equality"',
    '    }',
    '  ],',
    '  "soft_preferences": [',
    '    {',
    '      "expression": "minimize ||u(t)||",',
    '      "weight": 0.8',
    '    }',
    '  ],',
    '  "objective": {',
    '    "expression": "minimize ∫ I(t)^2 dt + λ∫ u(t) dt",',
    '    "sense": "minimize"',
    '    }',
    '}',
    '',
    'UNKNOWNS ARRAY REQUIREMENTS (CRITICAL):',
    '- Each item in unknowns array MUST have exactly these 4 properties: symbol, description, role, units',
    '- symbol: string matching pattern ^[A-Za-z][A-Za-z0-9_]*$ (REQUIRED)',
    '- description: non-empty string describing the variable (REQUIRED)',
    '- role: exactly one of "state", "parameter", "input", "output" (REQUIRED)',
    '- units: string (can be empty but must be present) (REQUIRED)',
    '- NO additional properties allowed in unknowns items (additionalProperties: false)',
    '- NO missing required properties in unknowns items',
    '- Each unknowns item must be a valid JSON object with ONLY these 4 properties',
    '',
    'MODELING VARIABLES ARRAY REQUIREMENTS (CRITICAL):',
    '- Each item in modeling.variables array MUST have exactly these 4 properties: symbol, description, role, units',
    '- symbol: string matching pattern ^[A-Za-z][A-Za-z0-9_]*$ (REQUIRED)',
    '- description: non-empty string describing the variable (REQUIRED)',
    '- role: exactly one of "state", "parameter", "input", "output" (REQUIRED)',
    '- units: string (can be empty but must be present) (REQUIRED)',
    '- NO additional properties allowed in modeling.variables items (additionalProperties: false)',
    '- NO missing required properties in modeling.variables items',
    '- Each modeling.variables item must be a valid JSON object with ONLY these 4 properties',
    '',
    'METADATA STRUCTURE REQUIREMENTS (CRITICAL):',
    '- metadata must be an object with exactly these 3 required properties: problem_id, domain, version',
    '- problem_id: string (REQUIRED) - unique kebab-case identifier',
    '- domain: string (REQUIRED) - exactly one of: "medicine", "biology", "public_health", "chemistry", "engineering", "economics", "general"',
    '- version: string (REQUIRED) - must match pattern ^v?\\d+\\.\\d+(\\.\\d+)?$ (e.g., "v1.0", "1.0", "1.0.0")',
    '- notes: string (OPTIONAL) - additional notes',
    '- NO additional properties allowed in metadata (additionalProperties: false)',
    '',
    'EXAMPLE of correct metadata structure:',
    '{',
    '  "problem_id": "epidemic-vaccination-campaign",',
    '  "domain": "public_health",',
    '  "version": "v1.0"',
    '}',
    '',
    'INPUT STRUCTURE REQUIREMENTS (CRITICAL):',
    '- input must be an object with exactly these 6 required properties: problem_summary, scope_objective, known_quantities, unknowns, mechanistic_notes, constraints_goals',
    '- problem_summary: string (REQUIRED) - non-empty summary of the problem',
    '- scope_objective: string (REQUIRED) - non-empty description of scope and objectives',
    '- known_quantities: array (REQUIRED) - array of Quantity objects with symbol, value, units, description',
    '- unknowns: array (REQUIRED) - array of Variable objects with symbol, description, role, units (min 1 item)',
    '- mechanistic_notes: string (REQUIRED) - non-empty mechanistic description',
    '- constraints_goals: object (REQUIRED) - object with hard_constraints, soft_preferences, objective',
    '- NO additional properties allowed in input (additionalProperties: false)',
    '',
    'EXAMPLE of correct input structure:',
    '{',
    '  "problem_summary": "Model epidemic dynamics with vaccination",',
    '  "scope_objective": "Estimate parameters and simulate interventions",',
    '  "known_quantities": [',
    '    {"symbol": "N", "value": 1000000, "units": "people", "description": "Total population"}',
    '  ],',
    '  "unknowns": [',
    '    {"symbol": "beta", "description": "Transmission rate", "role": "parameter", "units": "1/day"}',
    '  ],',
    '  "mechanistic_notes": "SIR model with vaccination",',
    '  "constraints_goals": {',
    '    "hard_constraints": [',
    '      {"expression": "S + I + R = N", "type": "equality"}',
    '    ],',
    '    "soft_preferences": [',
    '      {"expression": "minimize I", "weight": 0.8}',
    '    ],',
    '    "objective": {',
    '      "expression": "minimize total cases",',
    '      "sense": "minimize"',
    '    }',
    '  }',
    '}',
    '',
    'MODELING STRUCTURE REQUIREMENTS (CRITICAL):',
    '- modeling must be an object with exactly these 3 required properties: model_class, variables, equations',
    '- model_class: string (REQUIRED) - exactly one of: "ODE", "PDE", "DAE", "SDE", "discrete", "hybrid"',
    '- variables: array (REQUIRED) - array of Variable objects with symbol, description, role, units (min 1 item)',
    '- equations: array (REQUIRED) - array of Equation objects with id, lhs, rhs (min 1 item)',
    '- initial_conditions: array (OPTIONAL) - array of InitialCondition objects',
    '- measurement_model: array (OPTIONAL) - array of measurement model objects',
    '- assumptions: array (OPTIONAL) - array of string assumptions',
    '- NO additional properties allowed in modeling (additionalProperties: false)',
    '',
    'EXAMPLE of correct modeling structure:',
    '{',
    '  "model_class": "ODE",',
    '  "variables": [',
    '    {"symbol": "S", "description": "Susceptible population", "role": "state", "units": "people"},',
    '    {"symbol": "beta", "description": "Transmission rate", "role": "parameter", "units": "1/day"}',
    '  ],',
    '  "equations": [',
    '    {"id": "E1", "lhs": "dS/dt", "rhs": "-beta*S*I/N", "mechanism_link": "Transmission dynamics"}',
    '  ],',
    '  "initial_conditions": [',
    '    {"variable": "S", "value": 999000, "units": "people"}',
    '  ],',
    '  "assumptions": ["Closed population", "Homogeneous mixing"]',
    '}',
    '',
    'MEASUREMENT_MODEL STRUCTURE REQUIREMENTS (CRITICAL):',
    '- Each measurement_model item MUST have exactly these 3 required properties: observable, expression, noise_model',
    '- observable: string (REQUIRED) - name of the observable variable',
    '- expression: string (REQUIRED) - mathematical expression for the measurement',
    '- noise_model: string (REQUIRED) - description of the noise model',
    '- NO additional properties allowed in measurement_model items (additionalProperties: false)',
    '- NO missing required properties in measurement_model items',
    '',
    'EXAMPLE of correct measurement_model structure:',
    '[',
    '  {',
    '    "observable": "y1",',
    '    "expression": "S + I",',
    '    "noise_model": "Gaussian with variance σ²"',
    '  },',
    '  {',
    '    "observable": "y2",',
    '    "expression": "I",',
    '    "noise_model": "Poisson with rate λ"',
    '  }',
    ']',
    '',
    'METHOD_SELECTION STRUCTURE REQUIREMENTS (CRITICAL):',
    '- method_selection must be an object with exactly these 2 required properties: problem_type, chosen_methods',
    '- problem_type: string (REQUIRED) - exactly one of: "dynamics", "optimization", "inference", "simulation"',
    '- chosen_methods: array (REQUIRED) - array of method objects with name, justification (min 1 item)',
    '- NO additional properties allowed in method_selection (additionalProperties: false)',
    '',
    'EXAMPLE of correct method_selection structure:',
    '{',
    '  "problem_type": "inference",',
    '  "chosen_methods": [',
    '    {',
    '      "name": "Bayesian MCMC",',
    '      "justification": "Handles uncertainty quantification and parameter estimation"',
    '    }',
    '  ]',
    '}',
    '',
    'VALIDATION STRUCTURE REQUIREMENTS (CRITICAL):',
    '- validation must be an object with exactly these 5 required properties: unit_consistency_check, mechanism_coverage_check, constraint_satisfaction_metrics, fit_quality_metrics, counterfactual_sanity',
    '- unit_consistency_check: boolean (REQUIRED)',
    '- mechanism_coverage_check: boolean (REQUIRED)',
    '- constraint_satisfaction_metrics: array (REQUIRED) - array of metric objects with name, value, threshold',
    '- fit_quality_metrics: array (REQUIRED) - array of metric objects with name, value, threshold',
    '- counterfactual_sanity: object (REQUIRED) - object with enabled, perturb_percent',
    '- NO additional properties allowed in validation (additionalProperties: false)',
    '',
    'EXAMPLE of correct validation structure:',
    '{',
    '  "unit_consistency_check": true,',
    '  "mechanism_coverage_check": true,',
    '  "constraint_satisfaction_metrics": [',
    '    {"name": "population_conservation", "value": 0.001, "threshold": 0.01}',
    '  ],',
    '  "fit_quality_metrics": [',
    '    {"name": "RMSE", "value": 0.05, "threshold": 0.1}',
    '  ],',
    '  "counterfactual_sanity": {',
    '    "enabled": true,',
    '    "perturb_percent": 0.1',
    '  }',
    '}',
    '',
    'OUTPUT_CONTRACT STRUCTURE REQUIREMENTS (CRITICAL):',
    '- output_contract must be an object with exactly these 3 required properties: sections_required, formatting, safety_note',
    '- sections_required: array (REQUIRED) - array of strings (min 1 item)',
    '- formatting: object (REQUIRED) - object with math_notation, number_format, significant_figures',
    '',
    'EXAMPLE of correct output_contract structure:',
    '{',
    '  "sections_required": [',
    '    "VariablesAndUnitsTable",',
    '    "ModelEquations",',
    '    "MethodStatement",',
    '    "Results",',
    '    "Validation",',
    '    "ActionableRecommendation",',
    '    "RefinementHooks",',
    '    "Novelty Statement",',
    '    "Prior Work Comparison",',
    '    "Redundancy Check",',
    '    "Evidence & Citations"',
    '  ],',
    '  "formatting": {',
    '    "math_notation": "LaTeX",',
    '    "number_format": "auto",',
    '    "significant_figures": 4',
    '  },',
    '  "safety_note": "Model intended for research purposes only"',
    '}',
    '- safety_note: string (REQUIRED)',
    '- NO additional properties allowed in output_contract (additionalProperties: false)',
    '',
    'Content Requirements:',
    '- metadata must contain problem_id, domain, and version (e.g., "v1.0"); omit any other keys unless permitted by the schema.',
    '- Use a unique kebab-case problem_id referencing the domain and scenario.',
    '- known_quantities must include at least four items with symbol, value, units, and description.',
    '- unknowns must describe at least four states or parameters with roles, bounds when meaningful, and units.',
    '- equations must capture the governing dynamics with clear ids, lhs, and rhs properties.',
    '- method_selection.chosen_methods must justify each method in one sentence.',
    '',
    'EXAMPLE of correct unknowns structure:',
    '[',
    '  {',
    '    "symbol": "S",',
    '    "description": "Susceptible population",',
    '    "role": "state",',
    '    "units": "people"',
    '  },',
    '  {',
    '    "symbol": "beta",',
    '    "description": "Transmission rate",',
    '    "role": "parameter",',
    '    "units": "1/day"',
    '  }',
    ']',
    '',
    'EXAMPLE of correct modeling.variables structure:',
    '[',
    '  {',
    '    "symbol": "S",',
    '    "description": "Susceptible population",',
    '    "role": "state",',
    '    "units": "people"',
    '  },',
    '  {',
    '    "symbol": "beta",',
    '    "description": "Transmission rate",',
    '    "role": "parameter",',
    '    "units": "1/day"',
    '  }',
    ']',
    '',
    'EQUATIONS ARRAY REQUIREMENTS (CRITICAL):',
    '- Each item in modeling.equations array MUST have exactly these 3 required properties: id, lhs, rhs',
    '- id: string matching pattern ^(E|M|H)[0-9]+$ (REQUIRED) - e.g., "E1", "M1", "H1"',
    '- lhs: string describing the left-hand side (REQUIRED) - e.g., "dS/dt"',
    '- rhs: string describing the right-hand side expression (REQUIRED) - e.g., "-beta*S*I/N"',
    '- mechanism_link: string describing the mechanism (OPTIONAL)',
    '- NO additional properties allowed in equations items (additionalProperties: false)',
    '- NO missing required properties in equations items',
    '',
    'EXAMPLE of correct modeling.equations structure:',
    '[',
    '  {',
    '    "id": "E1",',
    '    "lhs": "dS/dt",',
    '    "rhs": "-beta*S*I/N - v_eff*v(t)*S",',
    '    "mechanism_link": "Transmission dynamics with vaccination"',
    '  },',
    '  {',
    '    "id": "E2",',
    '    "lhs": "dI/dt",',
    '    "rhs": "beta*S*I/N - gamma*I",',
    '    "mechanism_link": "Infection and recovery dynamics"',
    '  }',
    ']',
    '',
    'INVALID examples that will cause validation errors:',
    '- Missing description: {"symbol": "X", "role": "state", "units": "mg/L"}',
    '- Invalid role: {"symbol": "Y", "description": "Test", "role": "invalid", "units": "mg/L"}',
    '- Extra properties: {"symbol": "Z", "description": "Test", "role": "state", "units": "mg/L", "extra": "bad"}',
    '- Missing symbol: {"description": "Test", "role": "state", "units": "mg/L"}',
    '- Missing lhs in equation: {"id": "E1", "rhs": "-beta*S*I/N"}',
    '- Missing rhs in equation: {"id": "E1", "lhs": "dS/dt"}',
    '- Invalid equation id: {"id": "equation1", "lhs": "dS/dt", "rhs": "-beta*S*I/N"}',
    '- Extra properties in equation: {"id": "E1", "lhs": "dS/dt", "rhs": "-beta*S*I/N", "extra": "bad"}',
    '- Missing observable in measurement_model: {"expression": "S + I", "noise_model": "Gaussian"}',
    '- Missing expression in measurement_model: {"observable": "y1", "noise_model": "Gaussian"}',
    '- Missing noise_model in measurement_model: {"observable": "y1", "expression": "S + I"}',
    '- Extra properties in measurement_model: {"observable": "y1", "expression": "S + I", "noise_model": "Gaussian", "extra": "bad"}',
    '',
    'SOLUTION_AND_ANALYSIS STRUCTURE REQUIREMENTS (CRITICAL):',
    '- solution_and_analysis must be an object with exactly these properties: solution_requests, sensitivity_analysis, uncertainty_propagation',
    '- solution_requests: array of strings (REQUIRED) - each item must be exactly one of: "solve_numeric", "solve_analytic", "optimize", "infer"',
    '- sensitivity_analysis: object (REQUIRED) - must have exactly these properties: type, parameters, perturbation_fraction',
    '  - type: string (REQUIRED) - exactly one of: "local", "sobol", "bootstrap"',
    '  - parameters: array of strings (REQUIRED) - parameter names to analyze',
    '  - perturbation_fraction: number (REQUIRED) - minimum 0',
    '  - NO additional properties allowed in sensitivity_analysis (additionalProperties: false)',
    '- uncertainty_propagation: object (REQUIRED) - must have exactly these properties: method, n_samples',
    '  - method: string (REQUIRED) - exactly one of: "delta_method", "sampling", "bayesian"',
    '  - n_samples: integer (REQUIRED) - minimum 1',
    '  - NO additional properties allowed in uncertainty_propagation (additionalProperties: false)',
    '',
    'EXAMPLE of correct solution_and_analysis structure:',
    '{',
    '  "solution_requests": ["solve_numeric", "optimize"],',
    '  "sensitivity_analysis": {',
    '    "type": "local",',
    '    "parameters": ["beta", "gamma"],',
    '    "perturbation_fraction": 0.1',
    '  },',
    '  "uncertainty_propagation": {',
    '    "method": "sampling",',
    '    "n_samples": 1000',
    '  }',
    '}',
    '',
    'INVALID examples that will cause validation errors:',
    '- Invalid solution_requests: ["solve", "optimize"] (must be exact enum values)',
    '- Extra properties in sensitivity_analysis: {"type": "local", "parameters": ["beta"], "perturbation_fraction": 0.1, "extra": "bad"}',
    '- Missing required properties in sensitivity_analysis: {"type": "local"} (missing parameters and perturbation_fraction)',
    '- Extra properties in uncertainty_propagation: {"method": "sampling", "n_samples": 1000, "extra": "bad"}',
    '- Missing required properties in uncertainty_propagation: {"method": "sampling"} (missing n_samples)',
    '',
    'Additional Requirements:',
    '- validation must include constraint_satisfaction_metrics, fit_quality_metrics, and counterfactual_sanity settings.',
    '- output_contract.sections_required must include EXACTLY these eleven required sections (no custom names): "VariablesAndUnitsTable", "ModelEquations", "MethodStatement", "Results", "Validation", "ActionableRecommendation", "RefinementHooks", "Novelty Statement", "Prior Work Comparison", "Redundancy Check", "Evidence & Citations".',
    '- Keep narrative text concise (<=40 words per description) to stay within the token budget.',
    '- Respect the FRM schema data types exactly (numbers for numeric fields, strings otherwise) and avoid additional properties not defined by the schema.',
    '',
    'CRITICAL: DO NOT ADD EXTRA PROPERTIES:',
    '- Do NOT add any properties ending with "_extra" (like method_selection_extra, solution_and_analysis_extra, validation_extra, output_contract_extra, novelty_assurance_extra)',
    '- Do NOT add any properties not explicitly defined in the schema',
    '- The schema has "additionalProperties": false which means ANY extra property will cause validation to fail',
    '- Only include the exact properties defined in the schema for each section',
  ]
    .filter(Boolean)
    .join('\n')
}

const sanitizeJsonText = (raw: string): string => {
  return raw.replace(/```json/gi, '').replace(/```/g, '').trim()
}

const extractResponseText = (payload: any): string => {
  if (!payload) {
    throw new Error('OpenAI responded with an empty payload.')
  }

  if (typeof payload.output_text === 'string') {
    return payload.output_text
  }

  if (Array.isArray(payload.output)) {
    for (const segment of payload.output) {
      if (!segment || !Array.isArray(segment.content)) {
        continue
      }
      for (const part of segment.content) {
        if (typeof part?.text === 'string') {
          return part.text
        }
        if (typeof part === 'string') {
          return part
        }
      }
    }
  }

  if (Array.isArray(payload.choices)) {
    for (const choice of payload.choices) {
      if (typeof choice?.text === 'string') {
        return choice.text
      }
      const messageContent = choice?.message?.content
      if (typeof messageContent === 'string') {
        return messageContent
      }
      if (Array.isArray(messageContent)) {
        return messageContent
          .map((part: any) => (typeof part === 'string' ? part : part?.text ?? ''))
          .join('')
      }
    }
  }

  if (typeof payload === 'string') {
    return payload
  }

  throw new Error('Unable to extract text from OpenAI response.')
}

// Function to remove extra properties that aren't defined in the schema
const removeExtraProperties = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj
  }

  const result: Record<string, unknown> = {}
  const objRecord = obj as Record<string, unknown>

  // Define the allowed top-level properties
  const allowedTopLevelProperties = new Set([
    'metadata',
    'input', 
    'modeling',
    'method_selection',
    'solution_and_analysis',
    'validation',
    'output_contract',
    'novelty_assurance'
  ])

  // Only include allowed top-level properties
  for (const [key, value] of Object.entries(objRecord)) {
    if (allowedTopLevelProperties.has(key)) {
      result[key] = value
    }
  }

  return result
}

const generateAIExample = async (options: ExampleGenerationOptions = {}) => {
  const { apiKey, model, apiUrl } = getOpenAIConfig()

  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not set. Provide a valid key to enable AI example generation.')
    sendCommunicationEvent({
      source: 'FRM',
      target: 'GPT-5',
      type: 'error',
      message: 'API key not configured',
      data: { error: error.message }
    })
    throw error
  }

  // Track request to GPT-5
  startCommunicationTracking('FRM', 'GPT-5', 'Generate AI schema', { options, model })

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(options) },
        ],
        text: {
          format: {
            type: 'json_object',
          },
        },
        reasoning: {
          effort: 'low',
        },
        max_output_tokens: 8192,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      const error = new Error(`OpenAI request failed (${response.status}): ${errorBody}`)
      endCommunicationTracking('FRM', 'GPT-5', 'Request failed', { status: response.status, error: errorBody }, true)
      throw error
    }

    const payload: any = await response.json()

    if (payload?.incomplete_details?.reason) {
      const error = new Error(`OpenAI response was incomplete: ${payload.incomplete_details.reason}`)
      endCommunicationTracking('FRM', 'GPT-5', 'Response incomplete', { reason: payload.incomplete_details.reason }, true)
      throw error
    }

    if (Array.isArray(payload?.output)) {
      const truncatedSegment = payload.output.find((segment: any) =>
        segment && typeof segment.status === 'string' && segment.status !== 'completed',
      )

      if (truncatedSegment) {
        const error = new Error('OpenAI response was truncated before completion.')
        endCommunicationTracking('FRM', 'GPT-5', 'Response truncated', { status: truncatedSegment.status }, true)
        throw error
      }
    }

    const rawText = extractResponseText(payload)
    const sanitized = sanitizeJsonText(rawText)

    let parsed: unknown
    try {
      parsed = JSON.parse(sanitized)
    } catch (error) {
      const parseError = new Error(`OpenAI response was not valid JSON: ${sanitized.slice(0, 120)}...`)
      endCommunicationTracking('FRM', 'GPT-5', 'JSON parse failed', { error: parseError.message }, true)
      throw parseError
    }

    // Post-process to remove any extra properties that might have been generated
    parsed = removeExtraProperties(parsed)

    // Track MCP validation request
    startCommunicationTracking('FRM', 'MCP', 'Validate generated data', { dataSize: JSON.stringify(parsed).length })

    const validation = await callValidateTool(parsed)

    if (validation.status === 'error') {
      console.error('Validation errors:', validation.errors)
      console.error('Generated data unknowns:', JSON.stringify((parsed as any)?.input?.unknowns, null, 2))
      const detailLines = validation.errors
        .map((err, index) => `${index + 1}. ${(err.instancePath || '/') } ${err.message}`)
        .slice(0, 8)
      const detail = detailLines.join('\n')
      const message =
        detail.length > 0
          ? `FRM MCP validation failed: ${validation.summary}` + '\n' + detail
          : `FRM MCP validation failed: ${validation.summary}`
      
      endCommunicationTracking('FRM', 'MCP', 'Validation failed', { errors: validation.errors, summary: validation.summary }, true)
      endCommunicationTracking('FRM', 'GPT-5', 'Generation completed with validation errors', { validationErrors: validation.errors.length }, true)
      
      throw new Error(message)
    }

    // Track successful completion
    endCommunicationTracking('FRM', 'MCP', 'Validation successful', { validationStatus: validation.status })
    endCommunicationTracking('FRM', 'GPT-5', 'Generation completed successfully', { dataSize: JSON.stringify(parsed).length })

    return parsed
  } catch (error) {
    // Ensure we end tracking even on error
    if (communicationStartTime) {
      endCommunicationTracking('FRM', 'GPT-5', 'Generation failed', { error: error instanceof Error ? error.message : 'Unknown error' }, true)
    }
    throw error
  }
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 720,
    show: true, // Show immediately for debugging
    title: 'FRM Desktop',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Disable autofill features to prevent DevTools errors
      autoplayPolicy: 'no-user-gesture-required',
      experimentalFeatures: false,
      // Additional settings to prevent autofill-related DevTools errors
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  // Show window immediately for debugging
  mainWindow.show()
  
  mainWindow.once('ready-to-show', () => {
    console.log('Window is ready to show')
    mainWindow?.show()
  })

  // Add error handling for failed loads
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', { errorCode, errorDescription, validatedURL })
    if (isDev && validatedURL.includes('localhost')) {
      console.log('Retrying to load dev server in 2 seconds...')
      setTimeout(() => {
        // Try multiple ports
        const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3006]
        let portIndex = 0
        
        const tryLoadUrl = () => {
          if (portIndex >= ports.length) {
            console.error('All dev server ports failed')
            return
          }
          
          const port = ports[portIndex]
          console.log(`Retrying to load dev server on port ${port}`)
          mainWindow?.loadURL(`http://localhost:${port}`).catch((error) => {
            console.error(`Retry failed on port ${port}:`, error)
            portIndex++
            tryLoadUrl()
          })
        }
        
        tryLoadUrl()
      }, 2000)
    }
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  console.log('Dev server URL from env:', devServerUrl)
  console.log('Is dev mode:', isDev)

  if (isDev && devServerUrl) {
    console.log('Loading dev server URL:', devServerUrl)
    mainWindow.loadURL(devServerUrl)
  } else if (isDev) {
    console.log('No dev server URL found, trying ports...')
    // Add a small delay to ensure Vite dev server is ready
    setTimeout(() => {
      // Try multiple ports in case Vite picks a different one
      const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3006]
      let portIndex = 0
      
      const tryLoadUrl = () => {
        if (portIndex >= ports.length) {
          console.error('All dev server ports failed, falling back to built files')
          mainWindow?.loadFile(join(__dirname, 'index.html'))
          return
        }
        
        const port = ports[portIndex]
        const url = `http://localhost:${port}`
        console.log(`Trying to load dev server on port ${port}: ${url}`)
        mainWindow?.loadURL(url).then(() => {
          console.log(`Successfully loaded ${url}`)
        }).catch((error) => {
          console.error(`Failed to load dev server on port ${port}:`, error)
          portIndex++
          tryLoadUrl()
        })
      }
      
      tryLoadUrl()
    }, 1000)
  } else {
    console.log('Loading built files')
    mainWindow.loadFile(join(__dirname, 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  buildMenu()
}

const sendToRenderer = (channel: string) => {
  mainWindow?.webContents.send(channel)
}

const buildMenu = () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Problem',
          accelerator: 'Ctrl+N',
          click: () => sendToRenderer('menu-new-problem'),
        },
        {
          label: 'Open...',
          accelerator: 'Ctrl+O',
          click: () => sendToRenderer('menu-open'),
        },
        {
          label: 'Save',
          accelerator: 'Ctrl+S',
          click: () => sendToRenderer('menu-save'),
        },
        { type: 'separator' },
        {
          role: 'quit',
        },
      ],
    },
    {
      label: 'Actions',
      submenu: [
        {
          label: 'Validate Schema',
          accelerator: 'Ctrl+Shift+V',
          click: () => sendToRenderer('menu-validate'),
        },
        {
          label: 'Generate Schema',
          click: () => sendToRenderer('menu-generate-example'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => sendToRenderer('menu-about'),
        },
        {
          label: 'Documentation',
          click: () => sendToRenderer('menu-docs'),
        },
        {
          label: 'Report Issue',
          click: () => {
            void shell.openExternal('https://github.com/anthony/formal-reasoning-mode/issues')
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Configure cache settings to avoid Windows permission issues
app.commandLine.appendSwitch('--disable-gpu-sandbox')
app.commandLine.appendSwitch('--disable-software-rasterizer')
app.commandLine.appendSwitch('--disable-gpu-process-crash-limit')
app.commandLine.appendSwitch('--disable-background-timer-throttling')
app.commandLine.appendSwitch('--disable-renderer-backgrounding')
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows')

// Disable autofill features to prevent DevTools errors
app.commandLine.appendSwitch('--disable-autofill-keyboard-accessory-view')
app.commandLine.appendSwitch('--disable-autofill-credit-card-upload')
app.commandLine.appendSwitch('--disable-autofill-address-bar-suggestions')
app.commandLine.appendSwitch('--disable-features', 'AutofillServerCommunication')

// Set cache directory to avoid permission issues
const userDataPath = app.getPath('userData')
const cachePath = join(userDataPath, 'cache')
app.setPath('cache', cachePath)

app.whenReady().then(() => {
  createWindow()

  ipcMain.handle('get-app-version', () => app.getVersion())

  ipcMain.handle('show-message-box', async (_event, options) => {
    const window = BrowserWindow.getFocusedWindow()
    return window
      ? dialog.showMessageBox(window, options)
      : dialog.showMessageBox(options)
  })

  ipcMain.handle('generate-ai-example', async (_event, options: ExampleGenerationOptions = {}) => {
    try {
      return await generateAIExample(options)
    } catch (error) {
      console.error('Failed to generate AI schema', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error generating AI schema.')
    }
  })

  // Send initial connection status
  if (mainWindow) {
    mainWindow.webContents.send('connection-status', true)
  }

  // Send demo communication events for testing
  setTimeout(() => {
    if (mainWindow) {
      sendCommunicationEvent({
        source: 'FRM',
        target: 'MCP',
        type: 'info',
        message: 'Application started successfully',
        data: { version: app.getVersion() }
      })
    }
  }, 2000)
})















