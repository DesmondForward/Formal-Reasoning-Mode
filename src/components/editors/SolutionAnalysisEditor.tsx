import React from 'react'
import { motion } from 'framer-motion'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  SOLUTION_REQUEST_OPTIONS,
  type FRMData,
} from '@/data/schema'

interface SolutionAnalysisEditorProps {
  data: FRMData['solution_and_analysis']
  onChange: (solution: FRMData['solution_and_analysis']) => void
}

const toTitle = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const SolutionAnalysisEditor: React.FC<SolutionAnalysisEditorProps> = ({ data, onChange }) => {
  const updateField = <K extends keyof FRMData['solution_and_analysis']>(
    field: K,
    value: FRMData['solution_and_analysis'][K],
  ) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const toggleSolutionRequest = (request: string) => {
    const current = data.solution_requests ?? []
    const typedRequest = request as 'solve_numeric' | 'solve_analytic' | 'optimize' | 'infer'
    const updated = current.includes(typedRequest)
      ? current.filter((item) => item !== typedRequest)
      : [...current, typedRequest]
    updateField('solution_requests', updated)
  }

  return (
    <div className="space-y-6">
      {/* Solution Requests */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solution Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {SOLUTION_REQUEST_OPTIONS.map((request) => (
                <div key={request} className="flex items-center space-x-2">
                  <Checkbox
                    id={request}
                    checked={(data.solution_requests ?? []).includes(request)}
                    onCheckedChange={() => toggleSolutionRequest(request)}
                  />
                  <Label htmlFor={request} className="text-sm">
                    {toTitle(request)}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Simulation Scenario */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simulation Scenario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Initial State</Label>
              <Input
                value={data.simulation_scenario?.initial_state ?? ''}
                onChange={(event) =>
                  updateField('simulation_scenario', {
                    ...(data.simulation_scenario ?? {}),
                    initial_state: event.target.value,
                  })
                }
                placeholder="e.g., X(0) = 100"
              />
            </div>

            <div className="space-y-2">
              <Label>Parameters</Label>
              <Input
                value={data.simulation_scenario?.parameters ?? ''}
                onChange={(event) =>
                  updateField('simulation_scenario', {
                    ...(data.simulation_scenario ?? {}),
                    parameters: event.target.value,
                  })
                }
                placeholder="e.g., k1 = 0.1, k2 = 0.05"
              />
            </div>

            <div className="space-y-2">
              <Label>Inputs</Label>
              <Input
                value={data.simulation_scenario?.inputs ?? ''}
                onChange={(event) =>
                  updateField('simulation_scenario', {
                    ...(data.simulation_scenario ?? {}),
                    inputs: event.target.value,
                  })
                }
                placeholder="e.g., u(t) = step function"
              />
            </div>

            <div className="space-y-2">
              <Label>Time Horizon</Label>
              <Input
                value={data.simulation_scenario?.horizon ?? ''}
                onChange={(event) =>
                  updateField('simulation_scenario', {
                    ...(data.simulation_scenario ?? {}),
                    horizon: event.target.value,
                  })
                }
                placeholder="e.g., t ∈ [0, 100]"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Narrative Guidance */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Narrative Guidance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Style</Label>
                <select
                  value={data.narrative_guidance?.style ?? 'formal'}
                  onChange={(event) =>
                    updateField('narrative_guidance', {
                      ...(data.narrative_guidance ?? {}),
                      style: event.target.value as 'tutorial' | 'formal' | 'conversational',
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="tutorial">Tutorial</option>
                  <option value="formal">Formal</option>
                  <option value="conversational">Conversational</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Depth</Label>
                <select
                  value={data.narrative_guidance?.depth ?? 'detailed'}
                  onChange={(event) =>
                    updateField('narrative_guidance', {
                      ...(data.narrative_guidance ?? {}),
                      depth: event.target.value as 'high_level' | 'detailed',
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="high_level">High Level</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Purpose</Label>
                <select
                  value={data.narrative_guidance?.purpose ?? 'insight'}
                  onChange={(event) =>
                    updateField('narrative_guidance', {
                      ...(data.narrative_guidance ?? {}),
                      purpose: event.target.value as 'insight' | 'verification' | 'education',
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="insight">Insight</option>
                  <option value="verification">Verification</option>
                  <option value="education">Education</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Optimization Problem */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Optimization Problem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Objective Function</Label>
              <Textarea
                value={data.optimization_problem?.objective ?? ''}
                onChange={(event) =>
                  updateField('optimization_problem', {
                    ...(data.optimization_problem ?? {}),
                    objective: event.target.value,
                  })
                }
                placeholder="e.g., minimize integral of X(t) dt"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Constraints</Label>
              <Textarea
                value={(data.optimization_problem?.constraints ?? []).join('\n')}
                onChange={(event) =>
                  updateField('optimization_problem', {
                    ...(data.optimization_problem ?? {}),
                    constraints: event.target.value
                      .split('\n')
                      .map((constraint) => constraint.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Enter constraints, one per line"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Solver</Label>
              <Input
                value={data.optimization_problem?.solver ?? ''}
                onChange={(event) =>
                  updateField('optimization_problem', {
                    ...(data.optimization_problem ?? {}),
                    solver: event.target.value,
                  })
                }
                placeholder="e.g., scipy, cvxpy, gurobi"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Inference Problem */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inference Problem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Prior Distribution</Label>
              <Input
                value={data.inference_problem?.prior ?? ''}
                onChange={(event) =>
                  updateField('inference_problem', {
                    ...(data.inference_problem ?? {}),
                    prior: event.target.value,
                  })
                }
                placeholder="e.g., Gaussian(0, 1)"
              />
            </div>

            <div className="space-y-2">
              <Label>Likelihood Function</Label>
              <Input
                value={data.inference_problem?.likelihood ?? ''}
                onChange={(event) =>
                  updateField('inference_problem', {
                    ...(data.inference_problem ?? {}),
                    likelihood: event.target.value,
                  })
                }
                placeholder="e.g., Gaussian(X_obs, sigma^2)"
              />
            </div>

            <div className="space-y-2">
              <Label>Sampler</Label>
              <Input
                value={data.inference_problem?.sampler ?? ''}
                onChange={(event) =>
                  updateField('inference_problem', {
                    ...(data.inference_problem ?? {}),
                    sampler: event.target.value,
                  })
                }
                placeholder="e.g., mcmc, vi, hmc, nuts"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
