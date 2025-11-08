import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import axios from 'axios'
import https from 'https'
import http from 'http'

import { callValidateTool } from './mcp/frmMcpServer.js'

// Communication event tracking
interface CommunicationEvent {
  id: string
  timestamp: Date
  source: 'FRM' | 'MCP' | 'GPT-5' | string
  target: 'FRM' | 'MCP' | 'GPT-5' | string
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

const startCommunicationTracking = (source: 'FRM' | 'MCP' | 'GPT-5' | string, target: 'FRM' | 'MCP' | 'GPT-5' | string, message: string, data?: any) => {
  communicationStartTime = Date.now()
  sendCommunicationEvent({
    source,
    target,
    type: 'request',
    message,
    data
  })
}

const endCommunicationTracking = (source: 'FRM' | 'MCP' | 'GPT-5' | string, target: 'FRM' | 'MCP' | 'GPT-5' | string, message: string, data?: any, isError = false) => {
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

const getOpenAIConfig = () => {
  const model = process.env.OPENAI_MODEL ?? 'gpt-5-2025-08-07'
  
  // Model-specific endpoint selection (ignores OPENAI_API_URL for GPT-5 models)
  const getApiUrl = (model: string) => {
    // GPT-5 Pro models use /v1/responses endpoint
    if (model.includes('gpt-5-pro')) {
      return 'https://api.openai.com/v1/responses'
    }
    // Other GPT-5 models use /v1/chat/completions
    if (model.includes('gpt-5')) {
      return 'https://api.openai.com/v1/chat/completions'
    }
    // Default to standard chat completions endpoint
    return process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1/chat/completions'
  }
  
  const apiUrl = getApiUrl(model)
  
  const config = {
    apiKey: process.env.OPENAI_API_KEY,
    model: model,
    apiUrl: apiUrl,
  }
  
  // Debug logging
  console.log('OpenAI Config:', {
    model: config.model,
    apiUrl: config.apiUrl,
    hasApiKey: !!config.apiKey,
    envOpenAIUrl: process.env.OPENAI_API_URL,
    isGpt5: model.includes('gpt-5'),
    isGpt5Pro: model.includes('gpt-5-pro'),
    endpointType: model.includes('gpt-5-pro') ? 'responses' : model.includes('gpt-5') ? 'chat/completions' : 'default'
  })
  
  return config
}

const getGoogleConfig = () => ({
  apiKey: process.env.GOOGLE_API_KEY,
  model: process.env.GOOGLE_MODEL ?? 'gemini-2.5-pro',
  apiUrl: process.env.GOOGLE_API_URL ?? 'https://generativelanguage.googleapis.com/v1beta/models',
})

const getAnthropicConfig = () => ({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022',
  apiUrl: process.env.ANTHROPIC_API_URL ?? 'https://api.anthropic.com/v1/messages',
})

// Get the active AI provider configuration
const getAIConfig = () => {
  const provider = process.env.AI_PROVIDER ?? 'openai'
  
  switch (provider.toLowerCase()) {
    case 'google':
      return getGoogleConfig()
    case 'anthropic':
      return getAnthropicConfig()
    case 'openai':
    default:
      return getOpenAIConfig()
  }
}

// Helper function to get the correct API URL for OpenAI models
const getOpenAIUrl = (model: string) => {
  // GPT-5 Pro models use /v1/responses endpoint
  if (model.includes('gpt-5-pro')) {
    return 'https://api.openai.com/v1/responses'
  }
  // Other GPT-5 models use /v1/chat/completions
  if (model.includes('gpt-5')) {
    return 'https://api.openai.com/v1/chat/completions'
  }
  // Default to standard chat completions endpoint
  return process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1/chat/completions'
}

// Format request based on AI provider
const formatAIRequest = (provider: string, model: string, messages: any[], options: any) => {
  const baseUrl = provider.toLowerCase() === 'google' 
    ? `${process.env.GOOGLE_API_URL ?? 'https://generativelanguage.googleapis.com/v1beta'}/models/${model}:generateContent`
    : provider.toLowerCase() === 'anthropic'
    ? process.env.ANTHROPIC_API_URL ?? 'https://api.anthropic.com/v1/messages'
    : getOpenAIUrl(model)

  switch (provider.toLowerCase()) {
    case 'google':
      const systemMessage = messages.find(m => m.role === 'system')?.content || ''
      const userMessage = messages.find(m => m.role === 'user')?.content || ''
      
      return {
        url: baseUrl,
        data: {
          contents: [{
            parts: [{
              text: systemMessage ? `${systemMessage}\n\n${userMessage}` : userMessage
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 128000,
            responseMimeType: "application/json"
          }
        },
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GOOGLE_API_KEY
        }
      }
    case 'anthropic':
      return {
        url: baseUrl,
        data: {
          model,
          max_tokens: 128000,
          messages: messages,
          system: messages.find(m => m.role === 'system')?.content || DEFAULT_SYSTEM_PROMPT
        },
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    case 'openai':
    default:
      // Check if this is GPT-5 Pro (uses /v1/responses endpoint)
      const isGpt5Pro = model.includes('gpt-5-pro')
      
      if (isGpt5Pro) {
        // GPT-5 Pro uses different parameter structure for /v1/responses
        return {
          url: baseUrl,
          data: {
            model,
            input: messages,
            max_output_tokens: options?.max_tokens || 272000,
            text: {
              format: {
                type: 'json_object'
              }
            },
          },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      } else {
        // Standard OpenAI models use /v1/chat/completions
        return {
          url: baseUrl,
          data: {
            model,
            messages: messages,
            max_completion_tokens: options?.max_tokens || 128000,
            response_format: {
              type: 'json_object',
            },
          },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      }
  }
}

// Helper function to retry requests with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Check error code and message for non-retryable errors
      const errorCode = (error as any)?.code
      const errorMessage = lastError.message.toLowerCase()
      const responseStatus = (error as any)?.response?.status
      
      // Don't retry on certain error types (authentication, authorization, not found)
      if (errorMessage.includes('unauthorized') || 
          errorMessage.includes('forbidden') || 
          errorMessage.includes('not found') ||
          errorMessage.includes('invalid api key') ||
          responseStatus === 401 ||
          responseStatus === 403 ||
          responseStatus === 404) {
        break
      }
      
      // Connection errors (ECONNRESET, ECONNREFUSED, etc.) should be retried
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      const errorInfo = errorCode ? ` (${errorCode})` : ''
      console.log(`Request failed (attempt ${attempt + 1}/${maxRetries + 1})${errorInfo}, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

const DEFAULT_SYSTEM_PROMPT = `You are an assistant that creates Formal Reasoning Mode (FRM) problem JSON documents.
Your reply MUST be a single JSON object that strictly matches the FRM schema. Do not wrap the JSON in Markdown fences or add commentary.

Top-level keys (no others allowed): metadata, input, modeling, method_selection, solution_and_analysis, validation, output_contract, novelty_assurance.

Key schema rules:
• metadata – include problem_id, domain, version. domain must be one of: artificial_intelligence, astrobiology, astrophysics, autonomous_systems, biology, blockchain_systems, chemical_engineering, chemistry, climate_geoengineering, climate_science, cognitive_science, coding, complex_systems, computational_finance, cybersecurity, data_science, economics, energy_systems, engineering, fluid_dynamics, fluid_mechanics, general, geosciences, materials_science, mathematics, medicine, metrology, neuroscience, network_science, physics, public_health, quantum_biology, quantum_computing, renewable_energy, robotics, signal_processing, social_science, space_technology, synthetic_biology, systems_biology, unconventional_computing. Optional novelty_context may contain problem_lineage_note, known_baselines (array of strings), intended_contribution_type (model|equation|method|problem|analysis|dataset|system|other), domains_involved (array of domain enum values).
• input – provide problem_summary, scope_objective, mechanistic_notes, known_quantities (array of Quantity objects), unknowns (array of Variable objects with at least one entry), and constraints_goals {hard_constraints[], soft_preferences[], objective}. Constraint.type must be "equality" or "inequality"; Objective.sense must be "minimize" or "maximize".
• modeling – required fields: model_class (ODE|PDE|DAE|SDE|discrete|hybrid), variables (array with ≥1 Variable), equations (array with ≥1 Equation). Optional arrays: initial_conditions, measurement_model, assumptions. interpretability_required is a boolean. symbolic_regression, when provided, must include algorithm_type, function_library array of {name, allowed}, search_strategy, data_description, benchmark_reference, novelty_metrics (array of strings). Every equation id must match ^(E|M|H)[0-9]+$, include lhs, rhs, mechanism_link, novelty_tag (new|variant|borrowed|baseline); prior_art_citations entries must be CitationID strings matching ^CIT[0-9]+$ and should reference entries in novelty_assurance.citations.
• method_selection – include problem_type (dynamics|optimization|inference|simulation) and chosen_methods (array ≥1) with objects containing name and justification. Optional fields: prior_art_citations (array of CitationIDs), novelty_tag, novelty_diff, tolerances {absolute, relative}. If search_integration is used, include {enabled, tools_used[], strategy, justification}. CRITICAL: method_selection has additionalProperties=false, so NO other properties are allowed beyond these listed ones.
• solution_and_analysis – include solution_requests (array with values drawn only from ["solve_numeric","solve_analytic","optimize","infer"]). Optional: optimization_problem {objective, constraints[], solver}, inference_problem {prior, likelihood, sampler}, simulation_scenario {initial_state (STRING), parameters (STRING), inputs (STRING), horizon (STRING)}, narrative_guidance {style (tutorial|formal|conversational), depth (high_level|detailed), purpose (insight|verification|education)}. CRITICAL: simulation_scenario properties must be STRINGS, not objects or numbers. DO NOT include sensitivity_analysis, uncertainty_propagation, or any other properties not listed here.
• validation – must contain unit_consistency_check, mechanism_coverage_check, novelty_gate_pass (set to true), constraint_satisfaction_metrics (array of {name,value,threshold}), fit_quality_metrics (same structure), counterfactual_sanity {enabled, perturb_percent ≥0}. Optional: novelty_checks (with direction lower_is_better|higher_is_better), generalization_checks, scientific_alignment_checks, expert_review {experts array ≥1, summary, interpretability_score}, dynamic_equation_validation.
• output_contract – sections_required must be an array that contains ALL of the following strings at least once (no extras): "VariablesAndUnitsTable", "ModelEquations", "MethodStatement", "SolutionDerivation", "Analysis", "Conclusion", "References", "Glossary". formatting must be exactly { "math_notation": "latex"|"unicode", "explanation_detail": "terse"|"detailed" } with NO other properties. safety_note must be { "flag": boolean, "content": string } with NO other properties. DO NOT include number_format, significant_figures, novelty_badge, interpretability_requirements, or any other properties not listed here.
• novelty_assurance – include prior_work {search_queries array ≥1, literature_corpus_summary (≥30 chars), key_papers array of CitationIDs matching ^CIT[0-9]+$}, citations array ≥3 with objects {id: "CIT001" style, title, authors (single string), year (number), source (string)}. citation_checks must contain coverage_ratio (0-1), paraphrase_overlap (0-1), coverage_min_threshold (0.5-0.95) and optional conflicts[]. similarity_assessment requires metrics array (≥3) and aggregates {max_similarity, min_novelty_score, passes}; optional self_overlap_ratio, cross_domain_performance. novelty_claims array requires id matching ^NC[0-9]+$, statement ≥20 chars, category (model|equation|method|problem|analysis|dataset|system), evidence_citations (CitationID array ≥1), plus creativity_scores {originality, feasibility, impact, reliability} in [0,1]; include tests when useful. redundancy_check must list rules_applied[], final_decision ("proceed"|"revise"|"reject"), justification (≥20 chars), gate_pass true, optional blocker_reasons, overrides. evidence_tracking requires evidence_map array (each entry with section, citation_ids array, optional claim_id, file_ids, source_type from experimental_data|simulation|benchmark|theoretical) and may include artifacts array with type (graph|table|notebook|code|dataset|other), uri, optional hash. error_handling must include novelty_errors array, missing_evidence_policy ("fail_validation"|"allow_with_warning"), on_fail_action ("reject"|"request_more_search"|"revise"|"defer"). evaluation_dataset is optional but, if present, must follow the schema (name, description, data_scope, anonymization_methods).

Citation discipline:
- All citation IDs anywhere in the document (prior_art_citations, key_papers, evidence_map, etc.) must use the same ^CIT[0-9]+$ pattern and refer to objects declared in novelty_assurance.citations.
- Use consistent numbering starting at CIT001, CIT002, … and NC001 for novelty claims.

General constraints:
- All required arrays must meet their minimum item counts.
- Use booleans and numbers for boolean/number fields (no strings like "true" or "0.8").
- Strings that represent summaries or justifications should be well-formed prose (≥20 characters when the schema implies detail).
- Do not include any property that the schema does not define (every section has additionalProperties=false).
- Return valid UTF-8 JSON with proper quoting and without comments.
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
        "novelty_tag": "new",
        "prior_art_citations": [],
        "divergence_note": "Standard first-order kinetics"
      }
    ],
    "initial_conditions": [{"variable": "X", "value": 100, "units": "mg/L"}],
    "measurement_model": [
      {
        "observable": "X_obs",
        "expression": "X + noise",
        "noise_model": "Gaussian(0, sigma^2)",
        "novelty_tag": "baseline",
        "prior_art_citations": [],
        "divergence_note": "Standard measurement model"
      }
    ],
    "assumptions": ["Constant rate parameters", "Well-mixed system"],
    "interpretability_required": true,
    "symbolic_regression": {
      "algorithm_type": "genetic_programming",
      "function_library": [
        {"name": "add", "allowed": true},
        {"name": "multiply", "allowed": true},
        {"name": "exp", "allowed": true}
      ],
      "search_strategy": "evolutionary",
      "data_description": "Time series data with noise",
      "benchmark_reference": "Standard PK models",
      "novelty_metrics": ["cosine_embedding", "rougeL"]
    }
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
    "optimization_problem": {
      "objective": "minimize integral of X(t) dt",
      "constraints": ["X >= 0", "dX/dt <= 0"],
      "solver": "scipy"
    },
    "inference_problem": {
      "prior": "Gaussian(0, 1)",
      "likelihood": "Gaussian(X_obs, sigma^2)",
      "sampler": "mcmc"
    },
  },
  "validation": {
    "unit_consistency_check": true,
    "mechanism_coverage_check": true,
    "constraint_satisfaction_metrics": [
      {"name": "constraint_violation_ratio", "value": 0.05, "threshold": 0.1}
    ],
    "fit_quality_metrics": [
      {"name": "RMSE", "value": 0.12, "threshold": 0.2}
    ],
    "counterfactual_sanity": {"enabled": true, "perturb_percent": 10},
    "novelty_gate_pass": true,
    "novelty_checks": [
      {
        "name": "similarity_threshold",
        "passed": true,
        "value": 0.3,
        "threshold": 0.7,
        "direction": "lower_is_better",
        "notes": "Low similarity indicates novelty"
      }
    ],
    "generalization_checks": [
      {
        "dataset_used": "test_dataset_v1",
        "metric_name": "accuracy",
        "value": 0.85,
        "threshold": 0.8,
        "passed": true,
        "notes": "Good generalization performance"
      }
    ],
    "scientific_alignment_checks": [
      {
        "principle_name": "conservation_of_mass",
        "passed": true,
        "comment": "Mass is conserved in the model"
      }
    ],
    "expert_review": {
      "experts": ["Dr. Smith", "Dr. Jones"],
      "summary": "Model shows good scientific rigor and novelty",
      "interpretability_score": 0.8
    }
  },
  "output_contract": {
    "sections_required": [
      "VariablesAndUnitsTable",
      "ModelEquations",
      "MethodStatement",
      "SolutionDerivation",
      "Analysis",
      "Conclusion",
      "References",
      "Glossary"
    ],
    "formatting": {
      "math_notation": "latex",
      "explanation_detail": "detailed"
    },
    "safety_note": {
      "flag": false,
      "content": "No safety concerns identified"
    }
  },
  "novelty_assurance": {
    "prior_work": {
      "search_queries": ["pharmacokinetics", "drug clearance"],
      "literature_corpus_summary": "Review of existing PK models",
      "key_papers": ["CIT001", "CIT002", "CIT003"]
    },
    "citations": [
      {"id": "CIT001", "title": "Paper 1", "authors": "Author A", "year": 2023, "source": "Journal of Medicine"},
      {"id": "CIT002", "title": "Paper 2", "authors": "Author B", "year": 2022, "source": "Medical Research Quarterly"},
      {"id": "CIT003", "title": "Paper 3", "authors": "Author C", "year": 2021, "source": "Clinical Science Review"}
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
      },
      "self_overlap_ratio": 0.05,
      "cross_domain_performance": {
        "metric_name": "accuracy",
        "value": 0.82,
        "threshold": 0.75,
        "passed": true,
        "notes": "Good performance across domains"
      }
    },
    "novelty_claims": [
      {
        "id": "NC1",
        "statement": "Novel mathematical model for drug clearance with improved accuracy",
        "category": "model",
        "evidence_citations": ["CIT001", "CIT002"],
        "tests": [
          {
            "name": "statistical_significance",
            "result": "p < 0.05",
            "evidence_citation_ids": ["CIT001"]
          }
        ],
        "expected_impact": "Improved drug dosing recommendations",
        "creativity_scores": {
          "originality": 0.8,
          "feasibility": 0.9,
          "impact": 0.7,
          "reliability": 0.85
        }
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
      "artifacts": [
        {
          "type": "code",
          "uri": "https://github.com/example/model.py",
          "hash": "abc123def456"
        }
      ]
    },
    "evaluation_dataset": {
      "name": "PK_validation_dataset",
      "description": "Clinical pharmacokinetic data for validation",
      "data_scope": "Phase II clinical trials",
      "anonymization_methods": "Patient IDs removed, dates offset"
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

type SchemaGenerationOptions = {
  domain?: string
  scenarioHint?: string
}

const buildUserPrompt = (options: SchemaGenerationOptions = {}): string => {
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
    '- The "modeling" section MUST include ALL required fields: model_class (string), variables (array), equations (array), initial_conditions (array), measurement_model (array), assumptions (array), interpretability_required (boolean), symbolic_regression (object)',
    '- The "modeling" section MUST NOT include any additional properties beyond: model_class, variables, equations, initial_conditions, measurement_model, assumptions, interpretability_required, symbolic_regression',
    '- model_class MUST be exactly one of: "ODE", "PDE", "DAE", "SDE", "discrete", "hybrid" (NO other values allowed)',
    '- Each equation in "modeling.equations" MUST include: id, lhs, rhs, mechanism_link, novelty_tag, prior_art_citations, divergence_note',
    '- Each item in "modeling.measurement_model" MUST include: observable, expression, noise_model, novelty_tag, prior_art_citations, divergence_note',
    '- The "modeling.symbolic_regression" object MUST include: algorithm_type, function_library, search_strategy, data_description, benchmark_reference, novelty_metrics',
    '- CRITICAL: function_library MUST be an array of objects, each with "name" (string) and "allowed" (boolean) properties, e.g., [{"name": "add", "allowed": true}, {"name": "multiply", "allowed": true}]',
    '- CRITICAL: search_strategy MUST be exactly one of: "reinforcement_learning", "evolutionary", "beam_search", "random_search", "other" (NO other values allowed)',
    '- CRITICAL: novelty_metrics array items MUST be exactly one of: "cosine_embedding", "rougeL", "jaccard_terms", "nli_contradiction", "qa_novelty", "citation_overlap", "novascore", "relative_neighbor_density", "creativity_index" (NO other values allowed)',
    '- CRITICAL: optimization_problem.solver MUST be exactly one of: "scipy", "cvxpy", "gurobi", "cplex" (NO other values allowed)',
    '- CRITICAL: inference_problem.sampler MUST be exactly one of: "mcmc", "vi", "hmc", "nuts" (NO other values allowed)',
    '- The "validation" section MUST include ALL fields: unit_consistency_check, mechanism_coverage_check, constraint_satisfaction_metrics, fit_quality_metrics, counterfactual_sanity, novelty_gate_pass, novelty_checks, generalization_checks, scientific_alignment_checks, expert_review',
    '- The "output_contract" section MUST include ALL fields: sections_required, formatting, safety_note, interpretability_requirements',
    '- The "output_contract.formatting" object MUST include: math_notation, number_format, significant_figures, novelty_badge',
    '- CRITICAL: output_contract.formatting.number_format MUST be exactly one of: "fixed", "scientific", "auto" (NO other values allowed)',
    '- The "novelty_assurance" section MUST include ALL fields: prior_work, citations, citation_checks, similarity_assessment, novelty_claims, redundancy_check, evidence_tracking, error_handling, evaluation_dataset',
    '- CRITICAL: error_handling.missing_evidence_policy MUST be exactly one of: "fail_validation", "allow_with_warning" (NO other values allowed)',
    '- CRITICAL: error_handling.on_fail_action MUST be exactly one of: "reject", "request_more_search", "revise", "defer" (NO other values allowed)',
    '- CRITICAL: evidence_tracking.artifacts[].type MUST be exactly one of: "graph", "table", "notebook", "code", "dataset", "other" (NO other values allowed)',
    '- CRITICAL: evidence_tracking.evidence_map[].source_type MUST be exactly one of: "experimental_data", "simulation", "benchmark", "theoretical" (NO other values allowed)',
    '- The "solution_and_analysis" section MUST include ALL fields: solution_requests, sensitivity_analysis, uncertainty_propagation, optimization_problem, inference_problem',
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
    '- metadata may also include these optional properties: notes, novelty_context',
    '- problem_id: string (REQUIRED) - unique kebab-case identifier',
    '- domain: string (REQUIRED) - exactly one of: "medicine", "biology", "public_health", "chemistry", "engineering", "economics", "general"',
    '- version: string (REQUIRED) - must match pattern ^v?\\d+\\.\\d+(\\.\\d+)?$ (e.g., "v1.0", "1.0", "1.0.0")',
    '- notes: string (OPTIONAL) - additional notes',
    '- novelty_context: object (OPTIONAL) - novelty context information with problem_lineage_note, known_baselines, intended_contribution_type',
    '  - problem_lineage_note: string (OPTIONAL) - how this problem relates to existing work',
    '  - known_baselines: array of strings (OPTIONAL) - list of known baseline approaches',
    '  - intended_contribution_type: string (OPTIONAL) - one of: "model", "equation", "method", "problem", "analysis", "dataset", "system", "other"',
    '- NO additional properties allowed in metadata (additionalProperties: false)',
    '',
    'EXAMPLE of correct metadata structure:',
    '{',
    '  "problem_id": "epidemic-vaccination-campaign",',
    '  "domain": "public_health",',
    '  "version": "v1.0",',
    '  "notes": "Epidemic modeling with vaccination strategies",',
    '  "novelty_context": {',
    '    "problem_lineage_note": "Builds on classic SIR models by incorporating time-varying vaccination rates and waning immunity",',
    '    "known_baselines": ["Basic SIR model", "SEIR model", "SIRS with waning immunity"],',
    '    "intended_contribution_type": "model"',
    '  }',
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
    '- modeling may also include these optional properties: initial_conditions, measurement_model, assumptions, interpretability_required, symbolic_regression',
    '- model_class: string (REQUIRED) - exactly one of: "ODE", "PDE", "DAE", "SDE", "discrete", "hybrid"',
    '- variables: array (REQUIRED) - array of Variable objects with symbol, description, role, units (min 1 item)',
    '- equations: array (REQUIRED) - array of Equation objects with id, lhs, rhs (min 1 item)',
    '- initial_conditions: array (OPTIONAL) - array of InitialCondition objects',
    '- measurement_model: array (OPTIONAL) - array of measurement model objects',
    '- assumptions: array (OPTIONAL) - array of string assumptions',
    '- interpretability_required: boolean (OPTIONAL) - whether interpretability is required',
    '- symbolic_regression: object (OPTIONAL) - symbolic regression configuration',
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
    '- Each measurement_model item MUST have exactly these 6 required properties: observable, expression, noise_model, novelty_tag, prior_art_citations, divergence_note',
    '- observable: string (REQUIRED) - name of the observable variable',
    '- expression: string (REQUIRED) - mathematical expression for the measurement',
    '- noise_model: string (REQUIRED) - description of the noise model',
    '- novelty_tag: string (REQUIRED) - exactly one of: "new", "variant", "borrowed", "baseline"',
    '- prior_art_citations: array (REQUIRED) - array of citation strings',
    '- divergence_note: string (REQUIRED) - note about how this diverges from prior art',
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
    'SIMULATION_SCENARIO STRUCTURE REQUIREMENTS (CRITICAL):',
    '- simulation_scenario must be an object with these optional properties: initial_state, parameters, inputs, horizon',
    '- ALL properties in simulation_scenario MUST be STRINGS, not objects or numbers',
    '- initial_state: string (optional) - e.g., "X(0) = 100, Y(0) = 0"',
    '- parameters: string (optional) - e.g., "k1 = 0.1, k2 = 0.05"',
    '- inputs: string (optional) - e.g., "u(t) = step function"',
    '- horizon: string (optional) - e.g., "t = 0 to 100"',
    '- NO additional properties allowed in simulation_scenario (additionalProperties: false)',
    '',
    'EXAMPLE of correct simulation_scenario structure:',
    '{',
    '  "initial_state": "X(0) = 100, Y(0) = 0",',
    '  "parameters": "k1 = 0.1, k2 = 0.05",',
    '  "inputs": "u(t) = step function",',
    '  "horizon": "t = 0 to 100"',
    '}',
    '',
    'VALIDATION STRUCTURE REQUIREMENTS (CRITICAL):',
    '- validation must be an object with these required properties: unit_consistency_check, mechanism_coverage_check, constraint_satisfaction_metrics, fit_quality_metrics, counterfactual_sanity, novelty_gate_pass, novelty_checks, generalization_checks, scientific_alignment_checks, expert_review',
    '- unit_consistency_check: boolean (REQUIRED)',
    '- mechanism_coverage_check: boolean (REQUIRED)',
    '- constraint_satisfaction_metrics: array (REQUIRED) - array of metric objects with name, value, threshold',
    '- fit_quality_metrics: array (REQUIRED) - array of metric objects with name, value, threshold',
    '- counterfactual_sanity: object (REQUIRED) - object with enabled, perturb_percent',
    '- novelty_gate_pass: boolean (REQUIRED) - must be true',
    '- novelty_checks: array (REQUIRED) - array of novelty check objects',
    '- generalization_checks: array (REQUIRED) - array of generalization check objects',
    '- scientific_alignment_checks: array (REQUIRED) - array of scientific alignment check objects',
    '- expert_review: object (REQUIRED) - expert review object with experts, summary, interpretability_score',
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
    '- output_contract must be an object with exactly these 4 required properties: sections_required, formatting, safety_note, interpretability_requirements',
    '- sections_required: array (REQUIRED) - array of strings (min 1 item)',
    '- formatting: object (REQUIRED) - object with math_notation, number_format, significant_figures, novelty_badge',
    '- safety_note: string (REQUIRED) - safety note for the model',
    '- interpretability_requirements: object (REQUIRED) - object with narrative_explanation, complexity_limit',
    '- CRITICAL: formatting.number_format MUST be exactly "fixed", "scientific", or "auto" (NO other values allowed)',
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
    '- metadata must contain problem_id, domain, and version (e.g., "v1.0"); include novelty_context when relevant to describe how the problem relates to existing work.',
    '- Use a unique kebab-case problem_id referencing the domain and scenario.',
    '- Populate novelty_context with meaningful problem_lineage_note, known_baselines, and intended_contribution_type when generating novel problems.',
    '- known_quantities must include at least four items with symbol, value, units, and description.',
    '- unknowns must describe at least four states or parameters with roles, bounds when meaningful, and units.',
    '- equations must capture the governing dynamics with clear ids, lhs, and rhs properties.',
    '- method_selection.chosen_methods must justify each method in one sentence.',
    '',
    'COMPLEX NESTED OBJECTS GUIDANCE:',
    '- modeling.measurement_model: Include realistic measurement models with noise characteristics',
    '- modeling.symbolic_regression: Use appropriate algorithm_type (genetic_programming, deep_learning, hybrid, other)',
    '- validation.novelty_checks: Include meaningful novelty assessment metrics with realistic thresholds',
    '- validation.generalization_checks: Include cross-validation or holdout test results',
    '- validation.scientific_alignment_checks: Include domain-specific scientific principles',
    '- validation.expert_review: Include realistic expert assessment with interpretability scores',
    '- output_contract.interpretability_requirements: Specify narrative explanation and complexity limits',
    '- output_contract.formatting.novelty_badge: Include novelty highlighting configuration',
    '- novelty_assurance.similarity_assessment: Include comprehensive similarity metrics and cross-domain performance',
    '- novelty_assurance.novelty_claims: Include detailed claims with tests, expected impact, and creativity scores',
    '- novelty_assurance.evidence_tracking: Include evidence mapping and relevant artifacts with valid types (graph, table, notebook, code, dataset, other)',
    '- novelty_assurance.evaluation_dataset: Include dataset description and anonymization methods',
    '- solution_and_analysis.optimization_problem: Include realistic objective functions and constraints',
    '- solution_and_analysis.inference_problem: Include appropriate prior distributions and likelihood functions',
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
    '- Each item in modeling.equations array MUST have exactly these 7 required properties: id, lhs, rhs, mechanism_link, novelty_tag, prior_art_citations, divergence_note',
    '- id: string matching pattern ^(E|M|H)[0-9]+$ (REQUIRED) - e.g., "E1", "M1", "H1"',
    '- lhs: string describing the left-hand side (REQUIRED) - e.g., "dS/dt"',
    '- rhs: string describing the right-hand side expression (REQUIRED) - e.g., "-beta*S*I/N"',
    '- mechanism_link: string describing the mechanism (REQUIRED)',
    '- novelty_tag: string (REQUIRED) - exactly one of: "new", "variant", "borrowed", "baseline"',
    '- prior_art_citations: array (REQUIRED) - array of citation strings',
    '- divergence_note: string (REQUIRED) - note about how this diverges from prior art',
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
    '- solution_and_analysis must be an object with exactly these 5 required properties: solution_requests, sensitivity_analysis, uncertainty_propagation, optimization_problem, inference_problem',
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
    '- optimization_problem: object (REQUIRED) - must have exactly these properties: objective, constraints, solver',
    '  - objective: string (REQUIRED) - objective function description',
    '  - constraints: array (REQUIRED) - array of constraint strings',
    '  - solver: string (REQUIRED) - exactly one of: "scipy", "cvxpy", "gurobi", "cplex"',
    '  - NO additional properties allowed in optimization_problem (additionalProperties: false)',
    '- inference_problem: object (REQUIRED) - must have exactly these properties: prior, likelihood, sampler',
    '  - prior: string (REQUIRED) - prior distribution description',
    '  - likelihood: string (REQUIRED) - likelihood function description',
    '  - sampler: string (REQUIRED) - exactly one of: "mcmc", "vi", "hmc", "nuts"',
    '  - NO additional properties allowed in inference_problem (additionalProperties: false)',
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
    '- output_contract.sections_required must include EXACTLY these eight required sections (no custom names): "VariablesAndUnitsTable", "ModelEquations", "MethodStatement", "SolutionDerivation", "Analysis", "Conclusion", "References", "Glossary".',
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

  // Handle GPT-5 Pro /v1/responses format
  if (typeof payload.text === 'string') {
    return payload.text
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

  // Handle standard OpenAI /v1/chat/completions format
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

  // Log the payload structure for debugging
  console.error('Unable to extract text from OpenAI response. Payload structure:', {
    keys: Object.keys(payload),
    hasText: 'text' in payload,
    hasOutput: 'output' in payload,
    hasChoices: 'choices' in payload,
    textType: typeof payload.text,
    outputType: typeof payload.output
  })

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

  // Only include allowed top-level properties and clean their contents
  for (const [key, value] of Object.entries(objRecord)) {
    if (allowedTopLevelProperties.has(key)) {
      if (key === 'solution_and_analysis') {
        result[key] = cleanSolutionAndAnalysis(value)
      } else if (key === 'output_contract') {
        result[key] = cleanOutputContract(value)
      } else if (key === 'novelty_assurance') {
        result[key] = cleanNoveltyAssurance(value)
      } else if (key === 'method_selection') {
        result[key] = cleanMethodSelection(value)
      } else {
        result[key] = value
      }
    }
  }

  return result
}

// Clean solution_and_analysis to only include allowed properties
const cleanSolutionAndAnalysis = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj
  }

  const result: Record<string, unknown> = {}
  const objRecord = obj as Record<string, unknown>

  // Allowed properties for solution_and_analysis
  const allowedProperties = new Set([
    'solution_requests',
    'optimization_problem',
    'inference_problem',
    'simulation_scenario',
    'narrative_guidance'
  ])

  for (const [key, value] of Object.entries(objRecord)) {
    if (allowedProperties.has(key)) {
      if (key === 'simulation_scenario') {
        result[key] = cleanSimulationScenario(value)
      } else {
        result[key] = value
      }
    }
  }

  return result
}

// Clean output_contract to only include allowed properties
const cleanOutputContract = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj
  }

  const result: Record<string, unknown> = {}
  const objRecord = obj as Record<string, unknown>

  // Allowed properties for output_contract
  const allowedProperties = new Set([
    'sections_required',
    'formatting',
    'safety_note'
  ])

  for (const [key, value] of Object.entries(objRecord)) {
    if (allowedProperties.has(key)) {
      if (key === 'formatting') {
        result[key] = cleanFormatting(value)
      } else if (key === 'safety_note') {
        result[key] = cleanSafetyNote(value)
      } else {
        result[key] = value
      }
    }
  }

  return result
}

// Clean formatting to only include allowed properties
const cleanFormatting = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    // Return default formatting if not an object
    return {
      math_notation: 'latex',
      explanation_detail: 'detailed'
    }
  }

  const result: Record<string, unknown> = {}
  const objRecord = obj as Record<string, unknown>

  // Allowed properties for formatting
  const allowedProperties = new Set([
    'math_notation',
    'explanation_detail'
  ])

  for (const [key, value] of Object.entries(objRecord)) {
    if (allowedProperties.has(key)) {
      result[key] = value
    }
  }

  // Ensure required properties exist with valid values
  if (!('math_notation' in result) || !['latex', 'unicode'].includes(result.math_notation as string)) {
    result.math_notation = 'latex'
  }
  if (!('explanation_detail' in result) || !['terse', 'detailed'].includes(result.explanation_detail as string)) {
    result.explanation_detail = 'detailed'
  }

  return result
}

// Clean safety_note to ensure it's an object with required properties
const cleanSafetyNote = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    // If it's not an object, create a default one
    return {
      flag: false,
      content: typeof obj === 'string' ? obj : 'No safety concerns identified'
    }
  }

  const result: Record<string, unknown> = {}
  const objRecord = obj as Record<string, unknown>

  // Allowed properties for safety_note
  const allowedProperties = new Set([
    'flag',
    'content'
  ])

  for (const [key, value] of Object.entries(objRecord)) {
    if (allowedProperties.has(key)) {
      result[key] = value
    }
  }

  // Ensure required properties exist
  if (!('flag' in result)) {
    result.flag = false
  }
  if (!('content' in result)) {
    result.content = 'No safety concerns identified'
  }

  return result
}

// Clean novelty_assurance to ensure conflicts array has proper structure
const cleanNoveltyAssurance = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj
  }

  const result: Record<string, unknown> = {}
  const objRecord = obj as Record<string, unknown>

  // Copy all properties first
  for (const [key, value] of Object.entries(objRecord)) {
    result[key] = value
  }

  // Clean citation_checks.conflicts if it exists
  if (result.citation_checks && typeof result.citation_checks === 'object' && !Array.isArray(result.citation_checks)) {
    const citationChecks = result.citation_checks as Record<string, unknown>
    if (Array.isArray(citationChecks.conflicts)) {
      citationChecks.conflicts = citationChecks.conflicts.filter((item: unknown) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return false
        }
        const conflict = item as Record<string, unknown>
        // Ensure it has the required properties
        return typeof conflict.citation_id === 'string' && 
               typeof conflict.issue === 'string' && 
               typeof conflict.resolution === 'string'
      })
    }
  }

  return result
}

// Clean method_selection to only include allowed properties
const cleanMethodSelection = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj
  }

  const result: Record<string, unknown> = {}
  const objRecord = obj as Record<string, unknown>

  // Allowed properties for method_selection
  const allowedProperties = new Set([
    'problem_type',
    'chosen_methods',
    'search_integration'
  ])

  for (const [key, value] of Object.entries(objRecord)) {
    if (allowedProperties.has(key)) {
      result[key] = value
    }
  }

  return result
}

// Clean simulation_scenario to ensure all properties are strings
const cleanSimulationScenario = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj
  }

  const result: Record<string, unknown> = {}
  const objRecord = obj as Record<string, unknown>

  // Allowed properties for simulation_scenario
  const allowedProperties = new Set([
    'initial_state',
    'parameters',
    'inputs',
    'horizon'
  ])

  for (const [key, value] of Object.entries(objRecord)) {
    if (allowedProperties.has(key)) {
      // Ensure all values are strings
      if (typeof value === 'string') {
        result[key] = value
      } else if (typeof value === 'number') {
        result[key] = value.toString()
      } else if (typeof value === 'object' && value !== null) {
        // Convert objects to JSON strings
        result[key] = JSON.stringify(value)
      } else {
        result[key] = String(value)
      }
    }
  }

  return result
}

const pingLLM = async () => {
  const { apiKey, model, apiUrl } = getAIConfig()
  const provider = process.env.AI_PROVIDER ?? 'openai'

  if (!apiKey) {
    const error = new Error(`${provider.toUpperCase()}_API_KEY is not set. Provide a valid key to enable LLM ping.`)
    sendCommunicationEvent({
      source: 'FRM',
      target: model,
      type: 'error',
      message: 'API key not configured for ping',
      data: { error: error.message }
    })
    throw error
  }

  // Track ping request to the selected AI model
  startCommunicationTracking('FRM', model, 'Ping LLM', { model })

  try {
    const messages = [
      { role: 'user', content: 'Ping - respond with "OK" to confirm connection.' },
    ]
    
    const isGpt5Pro = model.includes('gpt-5-pro')
    
    // Build request config based on model type
    let requestConfig: any
    if (isGpt5Pro) {
      // GPT-5 Pro must use /v1/responses endpoint with specific structure
      // For ping, we don't include text.format to avoid JSON format requirement
      // Note: max_output_tokens minimum is 16 for GPT-5 Pro
      requestConfig = {
        url: 'https://api.openai.com/v1/responses',
        data: {
          model,
          input: messages,
          max_output_tokens: 200  // Sufficient for ping response
          // Note: intentionally NOT including text.format for ping
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    } else {
      // Standard OpenAI models use chat completions
      requestConfig = {
        url: apiUrl,
        data: {
          model,
          messages: messages,
          max_tokens: 10
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    }
    
    // Debug logging
    console.log('Ping request config:', {
      url: requestConfig.url,
      data: requestConfig.data,
      headers: { ...requestConfig.headers, 'Authorization': 'Bearer [REDACTED]' }
    })
    
    const response = await retryWithBackoff(async () => {
      return await axios.post(requestConfig.url, requestConfig.data, {
        headers: requestConfig.headers,
        timeout: 30000, // 30 seconds timeout for ping
      })
    }, 3, 1000) // 3 retries with exponential backoff for network resilience

    if (response.status !== 200) {
      const error = new Error(`LLM ping failed (${response.status}): ${response.statusText}`)
      endCommunicationTracking('FRM', model, 'Ping failed', { status: response.status, error: response.statusText }, true)
      throw error
    }

    const payload: any = response.data
    
    // Handle different response formats based on provider
    let responseText = ''
    if (provider.toLowerCase() === 'google') {
      responseText = payload?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else if (provider.toLowerCase() === 'anthropic') {
      responseText = payload?.content?.[0]?.text || ''
    } else {
      // OpenAI format - handle GPT-5 Pro vs standard models
      if (isGpt5Pro) {
        // GPT-5 Pro uses /v1/responses endpoint with different structure
        responseText = extractResponseText(payload)
      } else {
        // Standard OpenAI models use /v1/chat/completions
        responseText = payload?.choices?.[0]?.message?.content || ''
      }
    }

    endCommunicationTracking('FRM', model, 'Ping successful', { 
      response: responseText.trim(),
      model 
    })

    return {
      success: true,
      response: responseText.trim(),
      model,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code
    
    // Check for various network and timeout errors
    const isTimeout = errorMessage.includes('timeout') || 
                     errorMessage.includes('HeadersTimeoutError') || 
                     errorMessage.includes('AbortError') ||
                     errorCode === 'ETIMEDOUT'
    
    const isConnectionError = errorCode === 'ECONNRESET' || 
                             errorCode === 'ECONNREFUSED' ||
                             errorCode === 'ENOTFOUND' ||
                             errorMessage.includes('socket hang up') ||
                             errorMessage.includes('network')
    
    // Enhanced error logging
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any
      const errorDetails = {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        headers: axiosError.response?.headers,
        code: errorCode
      }
      console.error('Ping error response:', errorDetails)
      
      // Include API error message in the tracking if available
      const apiErrorMessage = axiosError.response?.data?.error?.message || 
                               axiosError.response?.data?.message || 
                               JSON.stringify(axiosError.response?.data)
      
      endCommunicationTracking('FRM', model, 'Ping error', { 
        error: errorMessage,
        apiError: apiErrorMessage,
        status: axiosError.response?.status,
        code: errorCode,
        isTimeout,
        isConnectionError
      }, true)
    } else {
      console.error('Ping error (no response):', {
        message: errorMessage,
        code: errorCode,
        isTimeout,
        isConnectionError
      })
      
      endCommunicationTracking('FRM', model, 'Ping error', { 
        error: errorMessage,
        code: errorCode,
        isTimeout,
        isConnectionError
      }, true)
    }
    
    if (isTimeout) {
      throw new Error(`Ping request timed out after 30 seconds. Please check your network connection and try again.`)
    }
    
    if (isConnectionError) {
      throw new Error(`Ping request failed due to network connection error (${errorCode || 'unknown'}). Please check your network connection and try again.`)
    }
    
    // If the error is a 400 and we're using gpt-5-nano, try with gpt-4o as fallback
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any
      if (axiosError.response?.status === 400 && model.includes('gpt-5-nano')) {
        console.log('GPT-5-nano failed, trying with gpt-4o as fallback...')
        try {
          const fallbackRequest = {
            url: 'https://api.openai.com/v1/chat/completions',
            data: {
              model: 'gpt-4o',
              messages: [{ role: 'user', content: 'Ping - respond with "OK" to confirm connection.' }],
              max_tokens: 10
            },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            }
          }
          
          const fallbackResponse = await axios.post(fallbackRequest.url, fallbackRequest.data, {
            headers: fallbackRequest.headers,
            timeout: 30000
          })
          
          if (fallbackResponse.status === 200) {
            const fallbackText = fallbackResponse.data?.choices?.[0]?.message?.content || ''
            endCommunicationTracking('FRM', 'gpt-4o', 'Ping successful (fallback)', { 
              response: fallbackText.trim(),
              originalModel: model
            })
            
            return {
              success: true,
              response: fallbackText.trim(),
              model: 'gpt-4o',
              originalModel: model,
              timestamp: new Date().toISOString()
            }
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError)
        }
      }
    }
    
    throw error
  }
}

const generateAISchema = async (options: SchemaGenerationOptions = {}) => {
  const fs = await import('fs')
  const path = await import('path')
  
  const logToFile = (message: string, data?: any) => {
    const logMessage = `${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}\n`
    const logPath = path.default.join(process.cwd(), 'debug.log')
    console.log('Writing to debug log:', logPath)
    fs.default.appendFileSync(logPath, logMessage)
    console.log(message, data)
  }
  
  // Clear debug.log at the start of each generation
  const logPath = path.default.join(process.cwd(), 'debug.log')
  try {
    fs.default.writeFileSync(logPath, '')
    console.log('Debug log cleared for new generation')
  } catch (error) {
    console.error('Failed to clear debug log:', error)
  }
  
  logToFile('=== SCHEMA GENERATION START ===')
  logToFile('Options:', options)
  
  const { apiKey, model, apiUrl } = getAIConfig()
  const provider = process.env.AI_PROVIDER ?? 'openai'
  
  logToFile('Provider:', provider)
  logToFile('Model:', model)
  logToFile('API URL:', apiUrl)

  if (!apiKey) {
    const error = new Error(`${provider.toUpperCase()}_API_KEY is not set. Provide a valid key to enable AI example generation.`)
    sendCommunicationEvent({
      source: 'FRM',
      target: model,
      type: 'error',
      message: 'API key not configured',
      data: { error: error.message }
    })
    throw error
  }

  // Track request to the selected AI model
  startCommunicationTracking('FRM', model, 'Generate AI schema', { options, model })

  try {
    const messages = [
      { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(options) },
    ]
    
    const requestConfig = formatAIRequest(provider, model, messages, options)
    
    // Debug logging for schema generation
    logToFile('Schema generation request config:', {
      url: requestConfig.url,
      data: requestConfig.data,
      headers: { ...requestConfig.headers, 'Authorization': 'Bearer [REDACTED]' }
    })
    
    logToFile('=== MAKING AXIOS REQUEST ===')
    logToFile('URL:', requestConfig.url)
    logToFile('Data keys:', Object.keys(requestConfig.data))
    logToFile('Headers keys:', Object.keys(requestConfig.headers))
    
    // Configure agents for long-running requests with keep-alive
    // Use aggressive keep-alive settings to prevent connection resets
    const httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 60000, // Keep connections alive for 60 seconds
      timeout: 2700000, // 45 minutes socket timeout
      maxSockets: 1, // Use single connection to avoid connection pool issues
      maxFreeSockets: 1,
    })
    
    const httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 60000,
      timeout: 2700000,
      maxSockets: 1,
      maxFreeSockets: 1,
    })
    
    const response = await retryWithBackoff(async () => {
      logToFile('Making axios request...')
      try {
        return await axios.post(requestConfig.url, requestConfig.data, {
          headers: {
            ...requestConfig.headers,
            'Connection': 'keep-alive', // Explicitly request keep-alive
          },
          timeout: 2700000, // 45 minutes timeout (45 * 60 * 1000)
          httpsAgent: httpsAgent,
          httpAgent: httpAgent,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          // Add signal abort controller for better timeout handling
        })
      } catch (error: any) {
        // Log connection errors for debugging
        if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
          logToFile(`Connection error during request: ${error.code}`, {
            message: error.message,
            stack: error.stack
          })
        }
        throw error
      }
    }, 5, 10000) // 5 retries with 10 second base delay for long requests
    
    logToFile('=== AXIOS RESPONSE ===')
    logToFile('Status:', response.status)
    logToFile('Response data keys:', Object.keys(response.data || {}))

    if (response.status !== 200) {
      const error = new Error(`${provider.toUpperCase()} request failed (${response.status}): ${response.statusText}`)
      endCommunicationTracking('FRM', model, 'Request failed', { status: response.status, error: response.statusText }, true)
      throw error
    }

    const payload: any = response.data

    // Handle different response formats based on provider
    let responseText = ''
    if (provider.toLowerCase() === 'google') {
      responseText = payload?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else if (provider.toLowerCase() === 'anthropic') {
      responseText = payload?.content?.[0]?.text || ''
    } else {
      // OpenAI format - handle both old and new API formats
      const isGpt5Pro = model.includes('gpt-5-pro')
      
      if (isGpt5Pro) {
        // GPT-5 Pro uses /v1/responses endpoint with different structure
        if (payload?.status === 'incomplete') {
          const error = new Error(`OpenAI response was incomplete: ${payload.status}`)
          endCommunicationTracking('FRM', model, 'Response incomplete', { reason: payload.status }, true)
          throw error
        }
        
        // Try to extract text from the new format
        logToFile('GPT-5 Pro payload structure:', {
          keys: Object.keys(payload),
          hasText: 'text' in payload,
          hasOutput: 'output' in payload,
          textType: typeof payload.text,
          outputType: typeof payload.output
        })
        responseText = extractResponseText(payload)
      } else {
        // Standard OpenAI models use /v1/chat/completions
        if (payload?.choices?.[0]?.finish_reason === 'incomplete') {
          const error = new Error(`OpenAI response was incomplete: ${payload.choices[0].finish_reason}`)
          endCommunicationTracking('FRM', model, 'Response incomplete', { reason: payload.choices[0].finish_reason }, true)
          throw error
        }
        responseText = payload?.choices?.[0]?.message?.content || ''
      }
    }

    if (!responseText) {
      const error = new Error(`${provider.toUpperCase()} response was empty or invalid`)
      endCommunicationTracking('FRM', model, 'Empty response', { payload }, true)
      throw error
    }

    // Parse the response text as JSON
    const sanitized = sanitizeJsonText(responseText)

    let parsed: unknown
    try {
      parsed = JSON.parse(sanitized)
    } catch (error) {
      const parseError = new Error(`${provider.toUpperCase()} response was not valid JSON: ${sanitized.slice(0, 120)}...`)
      endCommunicationTracking('FRM', model, 'JSON parse failed', { error: parseError.message }, true)
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
    endCommunicationTracking('FRM', model, 'Generation completed successfully', { dataSize: JSON.stringify(parsed).length })

    return parsed
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code
    
    // Check for various network and timeout errors
    const isTimeout = errorMessage.includes('timeout') || 
                     errorMessage.includes('HeadersTimeoutError') || 
                     errorMessage.includes('AbortError') ||
                     errorCode === 'ETIMEDOUT'
    
    const isConnectionError = errorCode === 'ECONNRESET' || 
                             errorCode === 'ECONNREFUSED' ||
                             errorCode === 'ENOTFOUND' ||
                             errorMessage.includes('socket hang up') ||
                             errorMessage.includes('network')
    
    // Enhanced error logging
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any
      logToFile('Schema generation error response:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        headers: axiosError.response?.headers,
        code: errorCode,
        isTimeout,
        isConnectionError
      })
    } else {
      logToFile('Schema generation error (no response):', {
        message: errorMessage,
        code: errorCode,
        isTimeout,
        isConnectionError
      })
    }
    
    // Ensure we end tracking even on error
    endCommunicationTracking('FRM', model, 'Generation failed', { 
      error: errorMessage,
      code: errorCode,
      isTimeout,
      isConnectionError
    }, true)
    
    if (isTimeout) {
      throw new Error(`Request timed out after 45 minutes. The AI model may be experiencing high load. Please try again later.`)
    }
    
    if (isConnectionError) {
      const retryMessage = errorCode === 'ECONNRESET' 
        ? 'The connection was reset by the server. This often happens with very long-running requests. The request has been automatically retried. If this persists, try reducing the complexity of the schema or splitting the generation into smaller parts.'
        : `Schema generation failed due to network connection error (${errorCode || 'unknown'}). Please check your network connection and try again.`
      throw new Error(retryMessage)
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

  ipcMain.handle('generate-ai-example', async (_event, options: SchemaGenerationOptions = {}) => {
    const fs = await import('fs')
    const path = await import('path')
    
    // Clear debug.log at the start of each generation
    const logPath = path.default.join(process.cwd(), 'debug.log')
    try {
      fs.default.writeFileSync(logPath, '')
      console.log('Debug log cleared for new generation')
    } catch (error) {
      console.error('Failed to clear debug log:', error)
    }
    
    const logToFile = (message: string, data?: any) => {
      const logMessage = `${new Date().toISOString()}: ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}\n`
      console.log('Writing to debug log:', logPath)
      try {
        fs.default.appendFileSync(logPath, logMessage)
      } catch (e) {
        console.error('Failed to write to debug log:', e)
      }
      console.log(message, data)
    }
    
    logToFile('=== IPC HANDLER START ===')
    logToFile('Options received:', options)
    logToFile('Test message to verify file writing works')
    
    try {
      logToFile('Calling generateAISchema...')
      return await generateAISchema(options)
    } catch (error) {
      // Enhanced error logging for IPC handler
      const errorInfo = {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        isError: error instanceof Error
      }
      
      logToFile('Error in IPC handler:', errorInfo)
      console.error('Failed to generate AI schema', error)
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any
        logToFile('IPC Handler - Schema generation error response:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers
        })
      }
      
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error generating AI schema.')
    }
  })

  ipcMain.handle('ping-llm', async () => {
    try {
      return await pingLLM()
    } catch (error) {
      console.error('Failed to ping LLM', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown error pinging LLM.')
    }
  })

  ipcMain.handle('validate-schema', async (_event, data: any) => {
    try {
      startCommunicationTracking('FRM', 'MCP', 'Starting schema validation', { dataSize: JSON.stringify(data).length })
      
      // Simulate validation processing time
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Enhanced validation logic
      const isValid = data && typeof data === 'object'
      const errors: string[] = []
      const warnings: string[] = []
      
      if (!data) {
        errors.push('No data provided for validation')
        return {
          isValid: false,
          errors,
          warnings
        }
      }
      
      if (typeof data !== 'object') {
        errors.push('Data must be a JSON object')
        return {
          isValid: false,
          errors,
          warnings
        }
      }
      
      // Check required top-level sections
      const requiredSections = ['metadata', 'input', 'modeling', 'method_selection', 'solution_and_analysis', 'validation', 'output_contract', 'novelty_assurance']
      
      for (const section of requiredSections) {
        if (!data[section]) {
          errors.push(`Missing required section: ${section}`)
        } else if (typeof data[section] !== 'object') {
          errors.push(`Section ${section} must be an object`)
        }
      }
      
      // Check for extra properties (schema has additionalProperties: false)
      const allowedSections = new Set(requiredSections)
      const extraSections = Object.keys(data).filter(key => !allowedSections.has(key))
      if (extraSections.length > 0) {
        errors.push(`Extra properties not allowed: ${extraSections.join(', ')}`)
      }
      
      // Basic metadata validation
      if (data.metadata) {
        if (!data.metadata.problem_id) {
          errors.push('metadata.problem_id is required')
        }
        if (!data.metadata.domain) {
          errors.push('metadata.domain is required')
        }
        if (!data.metadata.version) {
          errors.push('metadata.version is required')
        }
      }
      
      // Basic input validation
      if (data.input) {
        if (!data.input.problem_summary) {
          errors.push('input.problem_summary is required')
        }
        if (!data.input.scope_objective) {
          errors.push('input.scope_objective is required')
        }
        if (!data.input.unknowns || !Array.isArray(data.input.unknowns) || data.input.unknowns.length === 0) {
          errors.push('input.unknowns must be a non-empty array')
        }
        if (!data.input.mechanistic_notes) {
          errors.push('input.mechanistic_notes is required')
        }
        if (!data.input.constraints_goals) {
          errors.push('input.constraints_goals is required')
        }
      }
      
      // Basic modeling validation
      if (data.modeling) {
        if (!data.modeling.model_class) {
          errors.push('modeling.model_class is required')
        }
        if (!data.modeling.variables || !Array.isArray(data.modeling.variables) || data.modeling.variables.length === 0) {
          errors.push('modeling.variables must be a non-empty array')
        }
        if (!data.modeling.equations || !Array.isArray(data.modeling.equations) || data.modeling.equations.length === 0) {
          errors.push('modeling.equations must be a non-empty array')
        }
      }
      
      // Basic method selection validation
      if (data.method_selection) {
        if (!data.method_selection.problem_type) {
          errors.push('method_selection.problem_type is required')
        }
        if (!data.method_selection.chosen_methods || !Array.isArray(data.method_selection.chosen_methods) || data.method_selection.chosen_methods.length === 0) {
          errors.push('method_selection.chosen_methods must be a non-empty array')
        }
      }
      
      // Basic validation section validation
      if (data.validation) {
        if (typeof data.validation.unit_consistency_check !== 'boolean') {
          errors.push('validation.unit_consistency_check must be a boolean')
        }
        if (typeof data.validation.mechanism_coverage_check !== 'boolean') {
          errors.push('validation.mechanism_coverage_check must be a boolean')
        }
        if (data.validation.novelty_gate_pass !== true) {
          errors.push('validation.novelty_gate_pass must be true')
        }
      }
      
      // Basic output contract validation
      if (data.output_contract) {
        if (!data.output_contract.sections_required || !Array.isArray(data.output_contract.sections_required)) {
          errors.push('output_contract.sections_required must be an array')
        }
        if (!data.output_contract.formatting) {
          errors.push('output_contract.formatting is required')
        }
        if (!data.output_contract.safety_note) {
          errors.push('output_contract.safety_note is required')
        }
      }
      
      // Basic novelty assurance validation
      if (data.novelty_assurance) {
        if (!data.novelty_assurance.prior_work) {
          errors.push('novelty_assurance.prior_work is required')
        }
        if (!data.novelty_assurance.citations || !Array.isArray(data.novelty_assurance.citations) || data.novelty_assurance.citations.length < 3) {
          errors.push('novelty_assurance.citations must be an array with at least 3 items')
        }
        if (!data.novelty_assurance.novelty_claims || !Array.isArray(data.novelty_assurance.novelty_claims) || data.novelty_assurance.novelty_claims.length === 0) {
          errors.push('novelty_assurance.novelty_claims must be a non-empty array')
        }
        if (!data.novelty_assurance.redundancy_check) {
          errors.push('novelty_assurance.redundancy_check is required')
        }
        if (data.novelty_assurance.redundancy_check && data.novelty_assurance.redundancy_check.gate_pass !== true) {
          errors.push('novelty_assurance.redundancy_check.gate_pass must be true')
        }
      }
      
      const result = {
        isValid: isValid && errors.length === 0,
        errors,
        warnings
      }
      
      endCommunicationTracking('FRM', 'MCP', 'Schema validation completed', { 
        isValid: result.isValid, 
        errorCount: errors.length 
      })
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      endCommunicationTracking('FRM', 'MCP', 'Schema validation failed', { error: errorMessage }, true)
      console.error('Failed to validate schema', error)
      console.error('Validation error details:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        data: JSON.stringify(data, null, 2).slice(0, 500) + '...'
      })
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Schema validation failed: ${errorMessage}`)
    }
  })

  ipcMain.handle('log-generation', async (_event, logEntry: string) => {
    try {
      const fs = await import('fs')
      const path = await import('path')
      
      const logPath = path.default.join(process.cwd(), 'generation.log')
      const timestamp = new Date().toISOString()
      const logLine = `[${timestamp}] ${logEntry}\n`
      
      fs.default.appendFileSync(logPath, logLine)
      console.log('Generation logged:', logEntry)
    } catch (error) {
      console.error('Failed to log generation:', error)
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















