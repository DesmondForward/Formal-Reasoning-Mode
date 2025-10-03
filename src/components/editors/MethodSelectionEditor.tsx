import React from 'react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  PROBLEM_TYPE_OPTIONS,
  NOVELTY_TAG_OPTIONS,
  type ChosenMethod,
  type FRMData,
  type ProblemTypeOption,
} from '@/data/schema'

interface MethodSelectionEditorProps {
  data: FRMData['method_selection']
  onChange: (methodSelection: FRMData['method_selection']) => void
}

const METHOD_SUGGESTIONS: ChosenMethod['name'][] = [
  'symbolic_equilibria',
  'jacobian_stability',
  'ode_solve_rk45',
  'ode_solve_bdf',
  'direct_collocation',
  'pmp',
  'mpc',
  'mle',
  'map',
  'ekf',
  'ukf',
  'hmc_nuts',
  'lp',
  'qp',
  'nlp_ipopt',
  'milp',
  'ctmc_gillespie',
  'bayesian_logistic',
  'glm',
]

const toTitle = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const MethodSelectionEditor: React.FC<MethodSelectionEditorProps> = ({ data, onChange }) => {
  const updateField = <K extends keyof FRMData['method_selection']>(field: K, value: FRMData['method_selection'][K]) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const addMethod = () => {
    const newMethod = {
      name: 'ode_solve_rk45',
      justification: '',
      novelty_tag: 'new' as const,
    }
    updateField('chosen_methods', [...(data.chosen_methods ?? []), newMethod])
  }

  const updateMethod = (index: number, updates: Partial<ChosenMethod>) => {
    const methods = [...(data.chosen_methods ?? [])]
    methods[index] = {
      ...methods[index],
      ...updates,
    }
    updateField('chosen_methods', methods)
  }


  const removeMethod = (index: number) => {
    const methods = [...(data.chosen_methods ?? [])]
    methods.splice(index, 1)
    updateField('chosen_methods', methods)
  }

  return (
    <div className="space-y-6">
      {/* Problem Type */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <Label htmlFor="problem_type">Problem Type *</Label>
        <Select
          value={data.problem_type}
          onValueChange={(value) => updateField('problem_type', value as ProblemTypeOption)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select problem type" />
          </SelectTrigger>
          <SelectContent>
            {PROBLEM_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {toTitle(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Methods */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Solution Methods</CardTitle>
              <Button size="sm" onClick={addMethod}>
                Add Method
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.chosen_methods ?? []).map((method, index) => (
              <motion.div
                key={`${method.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-sm">Method {index + 1}</Label>
                  <Button size="sm" variant="outline" onClick={() => removeMethod(index)}>
                    Remove Method
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Method Name *</Label>
                    <Select
                      value={method.name}
                      onValueChange={(value) => updateMethod(index, { name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {METHOD_SUGGESTIONS.map((suggestion) => (
                          <SelectItem key={suggestion} value={suggestion}>
                            {toTitle(suggestion)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Novelty Tag</Label>
                    <Select
                      value={method.novelty_tag ?? 'new'}
                      onValueChange={(value) => updateMethod(index, { novelty_tag: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOVELTY_TAG_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {toTitle(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Justification *</Label>
                  <Textarea
                    value={method.justification}
                    onChange={(event) => updateMethod(index, { justification: event.target.value })}
                    placeholder="Explain why this method is appropriate..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Prior Art Citations</Label>
                    <Input
                      value={(method.prior_art_citations ?? []).join(', ')}
                      onChange={(event) => updateMethod(index, { 
                        prior_art_citations: event.target.value
                          .split(',')
                          .map(citation => citation.trim())
                          .filter(Boolean)
                      })}
                      placeholder="CIT001, CIT002"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Novelty Difference</Label>
                    <Input
                      value={method.novelty_diff ?? ''}
                      onChange={(event) => updateMethod(index, { novelty_diff: event.target.value })}
                      placeholder="How this differs from prior work..."
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Search Integration */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="search_enabled"
                checked={data.search_integration?.enabled ?? false}
                onChange={(event) => updateField('search_integration', {
                  enabled: event.target.checked,
                  tools_used: data.search_integration?.tools_used ?? [],
                  strategy: data.search_integration?.strategy ?? '',
                  justification: data.search_integration?.justification ?? ''
                })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="search_enabled">Enable Search Integration</Label>
            </div>

            {data.search_integration?.enabled && (
              <div className="space-y-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="tools_used">Tools Used</Label>
                  <Input
                    id="tools_used"
                    value={(data.search_integration?.tools_used ?? []).join(', ')}
                    onChange={(event) => updateField('search_integration', {
                      enabled: data.search_integration?.enabled ?? false,
                      tools_used: event.target.value
                        .split(',')
                        .map(tool => tool.trim())
                        .filter(Boolean),
                      strategy: data.search_integration?.strategy ?? '',
                      justification: data.search_integration?.justification ?? ''
                    })}
                    placeholder="tool1, tool2, tool3"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Input
                    id="strategy"
                    value={data.search_integration?.strategy ?? ''}
                    onChange={(event) => updateField('search_integration', {
                      enabled: data.search_integration?.enabled ?? false,
                      tools_used: data.search_integration?.tools_used ?? [],
                      strategy: event.target.value,
                      justification: data.search_integration?.justification ?? ''
                    })}
                    placeholder="Describe the search strategy..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="justification">Justification</Label>
                  <Textarea
                    id="justification"
                    value={data.search_integration?.justification ?? ''}
                    onChange={(event) => updateField('search_integration', {
                      enabled: data.search_integration?.enabled ?? false,
                      tools_used: data.search_integration?.tools_used ?? [],
                      strategy: data.search_integration?.strategy ?? '',
                      justification: event.target.value
                    })}
                    placeholder="Explain why search integration is needed..."
                    rows={3}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
