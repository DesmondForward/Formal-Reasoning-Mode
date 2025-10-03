import React from 'react'
import { motion } from 'framer-motion'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  SENSITIVITY_TYPE_OPTIONS,
  SOLUTION_REQUEST_OPTIONS,
  UNCERTAINTY_METHOD_OPTIONS,
  type FRMData,
  type SensitivityTypeOption,
  type UncertaintyMethodOption,
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

      {/* Sensitivity Analysis */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sensitivity Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Type</Label>
                <select
                  value={data.sensitivity_analysis?.type ?? 'local'}
                  onChange={(event) =>
                    updateField('sensitivity_analysis', {
                      type: event.target.value as SensitivityTypeOption,
                      parameters: data.sensitivity_analysis?.parameters ?? [],
                      perturbation_fraction: data.sensitivity_analysis?.perturbation_fraction ?? 0.1,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {SENSITIVITY_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Perturbation Fraction</Label>
                <Input
                  type="number"
                  value={data.sensitivity_analysis?.perturbation_fraction ?? 0.1}
                  onChange={(event) =>
                    updateField('sensitivity_analysis', {
                      type: data.sensitivity_analysis?.type ?? 'local',
                      parameters: data.sensitivity_analysis?.parameters ?? [],
                      perturbation_fraction: Number(event.target.value),
                    })
                  }
                  step="0.01"
                  min="0"
                  max="1"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Parameters to Analyze</Label>
              <Textarea
                value={(data.sensitivity_analysis?.parameters ?? []).join(', ')}
                onChange={(event) =>
                  updateField('sensitivity_analysis', {
                    ...(data.sensitivity_analysis ?? { type: 'local', perturbation_fraction: 0.1 }),
                    parameters: event.target.value
                      .split(',')
                      .map((parameter) => parameter.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Enter parameter names separated by commas"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Uncertainty Propagation */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uncertainty Propagation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Method</Label>
                <select
                  value={data.uncertainty_propagation?.method ?? 'delta_method'}
                  onChange={(event) =>
                    updateField('uncertainty_propagation', {
                      method: event.target.value as UncertaintyMethodOption,
                      n_samples: data.uncertainty_propagation?.n_samples ?? 1000,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {UNCERTAINTY_METHOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Number of Samples</Label>
                <Input
                  type="number"
                  value={data.uncertainty_propagation?.n_samples ?? 500}
                  onChange={(event) =>
                    updateField('uncertainty_propagation', {
                      method: data.uncertainty_propagation?.method ?? 'delta_method',
                      n_samples: Number(event.target.value) || 0,
                    })
                  }
                  min="1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
