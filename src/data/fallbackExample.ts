import type { FRMData } from './schema'

export const FALLBACK_EXAMPLE: FRMData = {
  metadata: {
    problem_id: 'SEIR_EPIDEMIC_001',
    domain: 'medicine',
    version: 'v1.0.3',
    notes: 'Reference configuration for an SEIR epidemic model.',
  },
  input: {
    problem_summary:
      'Model the spread of an infectious disease using the SEIR compartmental model with susceptible, exposed, infected, and recovered states.',
    scope_objective:
      'Estimate transmission dynamics, quantify peak load on the health system, and evaluate mitigation strategies.',
    known_quantities: [
      {
        symbol: 'N',
        value: 1_000_000,
        units: 'people',
        description: 'Total population size',
      },
      {
        symbol: 'beta',
        value: 0.3,
        units: '1/day',
        description: 'Transmission rate',
        uncertainty: {
          type: 'sd',
          value: 0.05,
        },
      },
      {
        symbol: 'sigma',
        value: 0.2,
        units: '1/day',
        description: 'Incubation rate',
      },
      {
        symbol: 'gamma',
        value: 0.1,
        units: '1/day',
        description: 'Recovery rate',
      },
    ],
    unknowns: [
      {
        symbol: 'S',
        description: 'Susceptible population',
        role: 'state',
        units: 'people',
        bounds: {
          lower: 0,
          upper: 1000000,
        },
      },
      {
        symbol: 'E',
        description: 'Exposed population',
        role: 'state',
        units: 'people',
        bounds: {
          lower: 0,
          upper: 1000000,
        },
      },
      {
        symbol: 'I',
        description: 'Infected population',
        role: 'state',
        units: 'people',
      },
      {
        symbol: 'R',
        description: 'Recovered population',
        role: 'state',
        units: 'people',
      },
    ],
    mechanistic_notes:
      'Closed population with homogeneous mixing. No births, deaths, or reinfection during the model horizon. Recovery confers immunity.',
    constraints_goals: {
      hard_constraints: [
        {
          expression: 'S + E + I + R = N',
          type: 'equality',
        },
        {
          expression: 'S >= 0',
          type: 'inequality',
        },
        {
          expression: 'E >= 0',
          type: 'inequality',
        },
        {
          expression: 'I >= 0',
          type: 'inequality',
        },
        {
          expression: 'R >= 0',
          type: 'inequality',
        },
      ],
      soft_preferences: [
        {
          expression: 'Minimize peak infected population',
          weight: 0.8
        },
        {
          expression: 'Keep total infections below 30% of the population',
          weight: 0.6
        },
        {
          expression: 'Return to near steady state within 180 days',
          weight: 0.4
        },
      ],
      objective: {
        expression: 'minimize integral_0^T I(t) dt',
        sense: 'minimize',
      },
    },
  },
  modeling: {
    model_class: 'ODE',
    variables: [
      {
        symbol: 'S',
        description: 'Susceptible population',
        role: 'state',
        units: 'people',
      },
      {
        symbol: 'E',
        description: 'Exposed population',
        role: 'state',
        units: 'people',
      },
      {
        symbol: 'I',
        description: 'Infected population',
        role: 'state',
        units: 'people',
      },
      {
        symbol: 'R',
        description: 'Recovered population',
        role: 'state',
        units: 'people',
      },
    ],
    equations: [
      {
        id: 'E1',
        lhs: 'dS/dt',
        rhs: '-beta * S * I / N',
        mechanism_link: 'Susceptible individuals become exposed at rate beta',
        novelty_tag: 'variant',
      },
      {
        id: 'E2',
        lhs: 'dE/dt',
        rhs: 'beta * S * I / N - sigma * E',
        mechanism_link: 'Exposed individuals progress to infection at rate sigma',
        novelty_tag: 'variant',
      },
      {
        id: 'E3',
        lhs: 'dI/dt',
        rhs: 'sigma * E - gamma * I',
        mechanism_link: 'Infected individuals recover at rate gamma',
        novelty_tag: 'variant',
      },
      {
        id: 'E4',
        lhs: 'dR/dt',
        rhs: 'gamma * I',
        mechanism_link: 'Recovered individuals gain immunity',
        novelty_tag: 'variant',
      },
    ],
    initial_conditions: [
      {
        variable: 'S',
        value: 999_000,
        units: 'people',
      },
      {
        variable: 'E',
        value: 500,
        units: 'people',
      },
      {
        variable: 'I',
        value: 500,
        units: 'people',
      },
      {
        variable: 'R',
        value: 0,
        units: 'people',
      },
    ],
    measurement_model: [],
    assumptions: [
      'Population is well-mixed with no spatial effects.',
      'Recovered individuals do not become susceptible again.',
      'No demographic changes during the simulation period.',
    ],
  },
  method_selection: {
    problem_type: 'dynamics',
    chosen_methods: [
      {
        name: 'ode_solve_rk45',
        justification: 'Adaptive Runge-Kutta method suitable for smooth non-stiff dynamics.',
      },
      {
        name: 'jacobian_stability',
        justification: 'Assess local stability of equilibrium points to reason about outbreak thresholds.',
      },
    ],
  },
  solution_and_analysis: {
    solution_requests: ['solve_numeric', 'solve_analytic', 'optimize', 'infer'],
    sensitivity_analysis: {
      type: 'local',
      parameters: ['beta', 'sigma', 'gamma'],
      perturbation_fraction: 0.1,
    },
    uncertainty_propagation: {
      method: 'sampling',
      n_samples: 1000,
    },
  },
  validation: {
    unit_consistency_check: true,
    mechanism_coverage_check: true,
    constraint_satisfaction_metrics: [
      {
        name: 'population_conservation',
        value: 0.0,
        threshold: 1e-6
      },
      {
        name: 'non_negative_states',
        value: 0.0,
        threshold: 0.0
      }
    ],
    fit_quality_metrics: [
      {
        name: 'RMSE',
        value: 0.0,
        threshold: 0.1
      },
      {
        name: 'MAE',
        value: 0.0,
        threshold: 0.05
      },
      {
        name: 'R2',
        value: 1.0,
        threshold: 0.95
      }
    ],
    counterfactual_sanity: {
      enabled: true,
      perturb_percent: 10,
    },
    novelty_gate_pass: true,
  },
  novelty_assurance: {
    prior_work: {
      search_queries: [
        'SEIR epidemic model compartmental dynamics',
        'infectious disease transmission modeling',
        'epidemiological compartmental models'
      ],
      literature_corpus_summary: 'Extensive literature on SEIR models for epidemic modeling, with well-established mathematical foundations and numerous applications in infectious disease epidemiology.',
      key_papers: ['CIT001', 'CIT002', 'CIT003']
    },
    citations: [
      {
        id: 'CIT001',
        title: 'Mathematical models in epidemiology',
        authors: 'Kermack, W.O., McKendrick, A.G.',
        year: 1927,
        source: 'Proceedings of the Royal Society of London',
        venue: 'Proceedings of the Royal Society of London',
        doi: '10.1098/rspa.1927.0118'
      },
      {
        id: 'CIT002',
        title: 'A contribution to the mathematical theory of epidemics',
        authors: 'Kermack, W.O., McKendrick, A.G.',
        year: 1932,
        source: 'Proceedings of the Royal Society of London',
        venue: 'Proceedings of the Royal Society of London',
        doi: '10.1098/rspa.1932.0171'
      },
      {
        id: 'CIT003',
        title: 'Mathematical Epidemiology of Infectious Diseases: Model Building, Analysis and Interpretation',
        authors: 'Diekmann, O., Heesterbeek, J.A.P.',
        year: 2000,
        source: 'Wiley Series in Mathematical and Computational Biology',
        venue: 'Wiley Series in Mathematical and Computational Biology'
      }
    ],
    citation_checks: {
      coverage_ratio: 0.85,
      paraphrase_overlap: 0.15,
      coverage_min_threshold: 0.7,
      conflicts: []
    },
    similarity_assessment: {
      metrics: [
        {
          name: 'cosine_embedding',
          score: 0.25,
          direction: 'lower_is_better',
          threshold: 0.7,
          passed: true,
          notes: 'Low similarity to prior work'
        },
        {
          name: 'rougeL',
          score: 0.12,
          direction: 'lower_is_better',
          threshold: 0.6,
          passed: true,
          notes: 'Minimal text overlap'
        },
        {
          name: 'jaccard_terms',
          score: 0.18,
          direction: 'lower_is_better',
          threshold: 0.5,
          passed: true,
          notes: 'Low term overlap'
        }
      ],
      aggregates: {
        max_similarity: 0.25,
        min_novelty_score: 0.75,
        passes: true
      },
      self_overlap_ratio: 0.05
    },
    novelty_claims: [
      {
        id: 'NC001',
        statement: 'This implementation provides a standardized SEIR model with comprehensive validation metrics and uncertainty quantification for epidemic scenario planning.',
        category: 'model',
        evidence_citations: ['CIT001', 'CIT002'],
        expected_impact: 'Improved reproducibility and validation of epidemic modeling studies'
      }
    ],
    redundancy_check: {
      rules_applied: [
        'similarity_threshold_check',
        'citation_coverage_check',
        'novelty_claim_validation'
      ],
      final_decision: 'proceed',
      justification: 'Model demonstrates sufficient novelty through comprehensive validation framework and standardized implementation approach.',
      gate_pass: true,
      overrides: {
        allowed: false
      }
    },
    evidence_tracking: {
      evidence_map: [
        {
          section: 'modeling',
          claim_id: 'NC001',
          citation_ids: ['CIT001', 'CIT002']
        }
      ],
      artifacts: []
    },
    error_handling: {
      novelty_errors: [],
      missing_evidence_policy: 'fail_validation',
      on_fail_action: 'revise'
    }
  },
  output_contract: {
    sections_required: [
      'VariablesAndUnitsTable',
      'ModelEquations',
      'MethodStatement',
      'Results',
      'Validation',
      'ActionableRecommendation',
      'RefinementHooks',
      'Novelty Statement',
      'Prior Work Comparison',
      'Redundancy Check',
      'Evidence & Citations',
    ],
    formatting: {
      math_notation: 'LaTeX',
      number_format: 'scientific',
      significant_figures: 4,
    },
    safety_note:
      'Mechanistic model intended for research and scenario planning. Not for direct clinical decision making.',
  },
}
