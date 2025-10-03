const FALLBACK_EXAMPLE = {
    metadata: {
        problem_id: 'SEIR_EPIDEMIC_001',
        domain: 'medicine',
        version: 'v1.0',
        notes: 'Reference configuration for an SEIR epidemic model.',
    },
    input: {
        problem_summary: 'Model the spread of an infectious disease using the SEIR compartmental model with susceptible, exposed, infected, and recovered states.',
        scope_objective: 'Estimate transmission dynamics, quantify peak load on the health system, and evaluate mitigation strategies.',
        known_quantities: [
            {
                symbol: 'N',
                value: 1000000,
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
                    upper: 'N',
                },
            },
            {
                symbol: 'E',
                description: 'Exposed population',
                role: 'state',
                units: 'people',
                bounds: {
                    lower: 0,
                    upper: 'N',
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
        mechanistic_notes: 'Closed population with homogeneous mixing. No births, deaths, or reinfection during the model horizon. Recovery confers immunity.',
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
            },
            {
                id: 'E2',
                lhs: 'dE/dt',
                rhs: 'beta * S * I / N - sigma * E',
                mechanism_link: 'Exposed individuals progress to infection at rate sigma',
            },
            {
                id: 'E3',
                lhs: 'dI/dt',
                rhs: 'sigma * E - gamma * I',
                mechanism_link: 'Infected individuals recover at rate gamma',
            },
            {
                id: 'E4',
                lhs: 'dR/dt',
                rhs: 'gamma * I',
                mechanism_link: 'Recovered individuals gain immunity',
            },
        ],
        initial_conditions: [
            {
                variable: 'S',
                value: 999000,
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
        safety_note: 'Mechanistic model intended for research and scenario planning. Not for direct clinical decision making.',
    },
};
const clone = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};
export const generateExampleProblem = async (options) => {
    if (window?.electronAPI?.generateAIExample) {
        try {
            const generated = await window.electronAPI.generateAIExample((options ?? {}));
            if (generated && typeof generated === 'object') {
                return {
                    data: generated,
                    source: 'ai',
                };
            }
            return {
                data: clone(FALLBACK_EXAMPLE),
                source: 'fallback',
                errorMessage: 'AI generator returned an unexpected payload shape.',
            };
        }
        catch (error) {
            console.error('AI schema generation failed. Falling back to bundled schema.', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                data: clone(FALLBACK_EXAMPLE),
                source: 'fallback',
                errorMessage: message,
            };
        }
    }
    return {
        data: clone(FALLBACK_EXAMPLE),
        source: 'fallback',
    };
};
export const getFallbackExample = () => clone(FALLBACK_EXAMPLE);
