import React from 'react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  MODEL_CLASS_OPTIONS,
  VARIABLE_ROLE_OPTIONS,
  NOVELTY_TAG_OPTIONS,
  SYMBOLIC_REGRESSION_ALGORITHM_OPTIONS,
  SEARCH_STRATEGY_OPTIONS,
  NOVELTY_METRIC_OPTIONS,
  type Equation,
  type FRMData,
  type InitialCondition,
  type Variable,
  type SymbolicRegression,
} from '@/data/schema'

interface ModelingEditorProps {
  data: FRMData['modeling']
  onChange: (modeling: FRMData['modeling']) => void
}

const toTitle = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())


export const ModelingEditor: React.FC<ModelingEditorProps> = ({ data, onChange }) => {
  const updateField = <K extends keyof FRMData['modeling']>(field: K, value: FRMData['modeling'][K]) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const addVariable = () => {
    const newVariable: Variable = {
      symbol: '',
      description: '',
      role: 'state',
      units: '',
    }
    updateField('variables', [...(data.variables ?? []), newVariable])
  }

  const updateVariable = (index: number, updates: Partial<Variable>) => {
    const variables = [...(data.variables ?? [])]
    variables[index] = {
      ...variables[index],
      ...updates,
    }
    updateField('variables', variables)
  }

  const removeVariable = (index: number) => {
    const variables = [...(data.variables ?? [])]
    variables.splice(index, 1)
    updateField('variables', variables)
  }

  const addEquation = () => {
    const nextIndex = (data.equations?.length ?? 0) + 1
    const newEquation: Equation = {
      id: `E${nextIndex}`,
      lhs: '',
      rhs: '',
      mechanism_link: '',
      novelty_tag: 'new',
      prior_art_citations: [],
    }
    updateField('equations', [...(data.equations ?? []), newEquation])
  }

  const updateEquation = (index: number, updates: Partial<Equation>) => {
    const equations = [...(data.equations ?? [])]
    equations[index] = {
      ...equations[index],
      ...updates,
    }
    updateField('equations', equations)
  }

  const removeEquation = (index: number) => {
    const equations = [...(data.equations ?? [])]
    equations.splice(index, 1)
    updateField('equations', equations)
  }

  const addInitialCondition = () => {
    const newCondition: InitialCondition = {
      variable: '',
      value: '',
      units: '',
    }
    updateField('initial_conditions', [...(data.initial_conditions ?? []), newCondition])
  }

  const updateInitialCondition = (index: number, updates: Partial<InitialCondition>) => {
    const conditions = [...(data.initial_conditions ?? [])]
    conditions[index] = {
      ...conditions[index],
      ...updates,
    }
    updateField('initial_conditions', conditions)
  }

  const removeInitialCondition = (index: number) => {
    const conditions = [...(data.initial_conditions ?? [])]
    conditions.splice(index, 1)
    updateField('initial_conditions', conditions)
  }

  return (
    <div className="space-y-6">
      {/* Model Class */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <Label htmlFor="model_class">Model Class *</Label>
        <Select value={data.model_class} onValueChange={(value) => updateField('model_class', value as FRMData['modeling']['model_class'])}>
          <SelectTrigger>
            <SelectValue placeholder="Select model class" />
          </SelectTrigger>
          <SelectContent>
            {MODEL_CLASS_OPTIONS.map((modelClass) => (
              <SelectItem key={modelClass} value={modelClass}>
                {toTitle(modelClass)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Variables */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Variables</CardTitle>
              <Button size="sm" onClick={addVariable}>
                Add Variable
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.variables ?? []).map((variable, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Symbol *</Label>
                    <Input
                      value={variable.symbol}
                      onChange={(event) => updateVariable(index, { symbol: event.target.value })}
                      placeholder="e.g., S"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Description *</Label>
                    <Input
                      value={variable.description}
                      onChange={(event) => updateVariable(index, { description: event.target.value })}
                      placeholder="Susceptible population"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Role *</Label>
                    <select
                      value={variable.role}
                      onChange={(event) => updateVariable(index, { role: event.target.value as Variable['role'] })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {VARIABLE_ROLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {toTitle(option)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
                  <div className="space-y-1">
                    <Label>Units</Label>
                    <Input
                      value={variable.units ?? ''}
                      onChange={(event) => updateVariable(index, { units: event.target.value })}
                      placeholder="people"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => removeVariable(index)}>
                    Remove Variable
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Equations */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Equations</CardTitle>
              <Button size="sm" onClick={addEquation}>
                Add Equation
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.equations ?? []).map((equation, index) => (
              <motion.div
                key={equation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-sm">{equation.id}</Label>
                  <Button size="sm" variant="outline" onClick={() => removeEquation(index)}>
                    Remove Equation
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Left-hand Side *</Label>
                    <Input
                      value={equation.lhs}
                      onChange={(event) => updateEquation(index, { lhs: event.target.value })}
                      placeholder="dS/dt"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Right-hand Side *</Label>
                    <Input
                      value={equation.rhs}
                      onChange={(event) => updateEquation(index, { rhs: event.target.value })}
                      placeholder="-beta * S * I / N"
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Mechanism Link *</Label>
                  <Input
                    value={equation.mechanism_link ?? ''}
                    onChange={(event) => updateEquation(index, { mechanism_link: event.target.value })}
                    placeholder="Infection transmission rate"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Novelty Tag *</Label>
                    <Select
                      value={equation.novelty_tag ?? 'new'}
                      onValueChange={(value) => updateEquation(index, { novelty_tag: value as Equation['novelty_tag'] })}
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
                  <div className="space-y-1">
                    <Label>Prior Art Citations</Label>
                    <Input
                      value={(equation.prior_art_citations ?? []).join(', ')}
                      onChange={(event) => updateEquation(index, { 
                        prior_art_citations: event.target.value
                          .split(',')
                          .map(citation => citation.trim())
                          .filter(Boolean)
                      })}
                      placeholder="CIT001, CIT002"
                    />
                  </div>
                </div>
                {equation.divergence_note !== undefined && (
                  <div className="space-y-1">
                    <Label>Divergence Note</Label>
                    <Input
                      value={equation.divergence_note}
                      onChange={(event) => updateEquation(index, { divergence_note: event.target.value })}
                      placeholder="Note on how this differs from prior work"
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Initial Conditions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Initial Conditions</CardTitle>
              <Button size="sm" onClick={addInitialCondition}>
                Add Initial Condition
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.initial_conditions ?? []).map((condition, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid grid-cols-1 gap-4 md:grid-cols-4"
              >
                <div className="space-y-1 md:col-span-2">
                  <Label>Variable *</Label>
                  <Input
                    value={condition.variable}
                    onChange={(event) => updateInitialCondition(index, { variable: event.target.value })}
                    placeholder="S"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Value *</Label>
                  <Input
                    value={String(condition.value ?? '')}
                    onChange={(event) => updateInitialCondition(index, { value: event.target.value })}
                    placeholder="999000"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Units</Label>
                  <Input
                    value={condition.units ?? ''}
                    onChange={(event) => updateInitialCondition(index, { units: event.target.value })}
                    placeholder="people"
                  />
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => removeInitialCondition(index)}>
                    Remove
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Interpretability Requirements */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interpretability Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="interpretability_required"
                checked={data.interpretability_required ?? false}
                onChange={(event) => updateField('interpretability_required', event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="interpretability_required">Interpretability Required</Label>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Check if the model must be interpretable (e.g., for safety-critical domains)
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Symbolic Regression */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Symbolic Regression</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="algorithm_type">Algorithm Type</Label>
                <Select
                  value={data.symbolic_regression?.algorithm_type ?? ''}
                  onValueChange={(value) => updateField('symbolic_regression', {
                    algorithm_type: value as SymbolicRegression['algorithm_type'],
                    function_library: data.symbolic_regression?.function_library ?? [],
                    search_strategy: data.symbolic_regression?.search_strategy ?? 'random_search',
                    data_description: data.symbolic_regression?.data_description ?? '',
                    benchmark_reference: data.symbolic_regression?.benchmark_reference ?? '',
                    novelty_metrics: data.symbolic_regression?.novelty_metrics ?? []
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select algorithm type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SYMBOLIC_REGRESSION_ALGORITHM_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {toTitle(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search_strategy">Search Strategy</Label>
                <Select
                  value={data.symbolic_regression?.search_strategy ?? ''}
                  onValueChange={(value) => updateField('symbolic_regression', {
                    algorithm_type: data.symbolic_regression?.algorithm_type ?? 'genetic_programming',
                    function_library: data.symbolic_regression?.function_library ?? [],
                    search_strategy: value as SymbolicRegression['search_strategy'],
                    data_description: data.symbolic_regression?.data_description ?? '',
                    benchmark_reference: data.symbolic_regression?.benchmark_reference ?? '',
                    novelty_metrics: data.symbolic_regression?.novelty_metrics ?? []
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select search strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEARCH_STRATEGY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {toTitle(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_description">Data Description</Label>
              <Textarea
                id="data_description"
                value={data.symbolic_regression?.data_description ?? ''}
                onChange={(event) => updateField('symbolic_regression', {
                  algorithm_type: data.symbolic_regression?.algorithm_type ?? 'genetic_programming',
                  function_library: data.symbolic_regression?.function_library ?? [],
                  search_strategy: data.symbolic_regression?.search_strategy ?? 'random_search',
                  data_description: event.target.value,
                  benchmark_reference: data.symbolic_regression?.benchmark_reference ?? '',
                  novelty_metrics: data.symbolic_regression?.novelty_metrics ?? []
                })}
                placeholder="Describe the dataset used for symbolic regression..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="benchmark_reference">Benchmark Reference</Label>
              <Input
                id="benchmark_reference"
                value={data.symbolic_regression?.benchmark_reference ?? ''}
                onChange={(event) => updateField('symbolic_regression', {
                  algorithm_type: data.symbolic_regression?.algorithm_type ?? 'genetic_programming',
                  function_library: data.symbolic_regression?.function_library ?? [],
                  search_strategy: data.symbolic_regression?.search_strategy ?? 'random_search',
                  data_description: data.symbolic_regression?.data_description ?? '',
                  benchmark_reference: event.target.value,
                  novelty_metrics: data.symbolic_regression?.novelty_metrics ?? []
                })}
                placeholder="Reference to benchmark dataset or evaluation"
              />
            </div>

            <div className="space-y-2">
              <Label>Novelty Metrics</Label>
              <div className="grid grid-cols-2 gap-2">
                {NOVELTY_METRIC_OPTIONS.map((metric) => (
                  <div key={metric} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`metric_${metric}`}
                      checked={data.symbolic_regression?.novelty_metrics?.includes(metric) ?? false}
                      onChange={(event) => {
                        const currentMetrics = data.symbolic_regression?.novelty_metrics ?? []
                        const newMetrics = event.target.checked
                          ? [...currentMetrics, metric]
                          : currentMetrics.filter(m => m !== metric)
                        updateField('symbolic_regression', {
                          algorithm_type: data.symbolic_regression?.algorithm_type ?? 'genetic_programming',
                          function_library: data.symbolic_regression?.function_library ?? [],
                          search_strategy: data.symbolic_regression?.search_strategy ?? 'random_search',
                          data_description: data.symbolic_regression?.data_description ?? '',
                          benchmark_reference: data.symbolic_regression?.benchmark_reference ?? '',
                          novelty_metrics: newMetrics
                        })
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor={`metric_${metric}`} className="text-sm">
                      {toTitle(metric)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Assumptions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Label htmlFor="assumptions">Assumptions</Label>
        <Textarea
          id="assumptions"
          value={(data.assumptions ?? []).join('\n')}
          onChange={(event) =>
            updateField(
              'assumptions',
              event.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            )
          }
          placeholder="List key assumptions, one per line..."
          rows={4}
        />
      </motion.div>
    </div>
  )
}
