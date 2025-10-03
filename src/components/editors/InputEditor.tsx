import React from 'react'
import { motion } from 'framer-motion'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  CONSTRAINT_TYPE_OPTIONS,
  OBJECTIVE_SENSE_OPTIONS,
  QUANTITY_UNCERTAINTY_OPTIONS,
  VARIABLE_ROLE_OPTIONS,
  type Constraint,
  type ConstraintTypeOption,
  type FRMData,
  type ObjectiveSenseOption,
  type Quantity,
  type QuantityUncertaintyOption,
  type Variable,
} from '@/data/schema'

interface InputEditorProps {
  data: FRMData['input']
  onChange: (input: FRMData['input']) => void
}

const toTitle = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())



export const InputEditor: React.FC<InputEditorProps> = ({ data, onChange }) => {
  const updateField = <K extends keyof FRMData['input']>(field: K, value: FRMData['input'][K]) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const updateConstraintsGoals = <K extends keyof NonNullable<FRMData['input']['constraints_goals']>>(
    field: K,
    value: NonNullable<FRMData['input']['constraints_goals']>[K],
  ) => {
    onChange({
      ...data,
      constraints_goals: {
        ...data.constraints_goals,
        [field]: value,
      },
    })
  }

  const addQuantity = () => {
    const newQuantity: Quantity = {
      symbol: '',
      value: 0,
      units: '',
      description: '',
    }
    updateField('known_quantities', [...(data.known_quantities ?? []), newQuantity])
  }

  const updateQuantity = (index: number, updates: Partial<Quantity>) => {
    const quantities = [...(data.known_quantities ?? [])]
    quantities[index] = {
      ...quantities[index],
      ...updates,
    }
    updateField('known_quantities', quantities)
  }

  const removeQuantity = (index: number) => {
    const quantities = [...(data.known_quantities ?? [])]
    quantities.splice(index, 1)
    updateField('known_quantities', quantities)
  }

  const addVariable = () => {
    const newVariable: Variable = {
      symbol: '',
      description: '',
      role: 'state',
      units: '',
    }
    updateField('unknowns', [...(data.unknowns ?? []), newVariable])
  }

  const updateVariable = (index: number, updates: Partial<Variable>) => {
    const variables = [...(data.unknowns ?? [])]
    variables[index] = {
      ...variables[index],
      ...updates,
    }
    updateField('unknowns', variables)
  }

  const removeVariable = (index: number) => {
    const variables = [...(data.unknowns ?? [])]
    variables.splice(index, 1)
    updateField('unknowns', variables)
  }

  const addConstraint = () => {
    const newConstraint: Constraint = {
      expression: '',
      type: 'inequality',
    }
    updateConstraintsGoals('hard_constraints', [...(data.constraints_goals?.hard_constraints ?? []), newConstraint])
  }

  const updateConstraint = (index: number, updates: Partial<Constraint>) => {
    const constraints = [...(data.constraints_goals?.hard_constraints ?? [])]
    constraints[index] = {
      ...constraints[index],
      ...updates,
    }
    updateConstraintsGoals('hard_constraints', constraints)
  }

  const removeConstraint = (index: number) => {
    const constraints = [...(data.constraints_goals?.hard_constraints ?? [])]
    constraints.splice(index, 1)
    updateConstraintsGoals('hard_constraints', constraints)
  }

  const updateSoftPreferences = (value: string) => {
    const preferences = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((expression) => ({
        expression,
        weight: 1.0, // Default weight
      }))
    updateConstraintsGoals('soft_preferences', preferences)
  }

  return (
    <div className="space-y-6">
      {/* Problem Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <Label htmlFor="problem_summary">Problem Summary *</Label>
        <Textarea
          id="problem_summary"
          value={data.problem_summary}
          onChange={(event) => updateField('problem_summary', event.target.value)}
          placeholder="Describe the problem in natural language..."
          rows={3}
        />
      </motion.div>

      {/* Scope & Objective */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <Label htmlFor="scope_objective">Scope & Objective *</Label>
        <Textarea
          id="scope_objective"
          value={data.scope_objective}
          onChange={(event) => updateField('scope_objective', event.target.value)}
          placeholder="Define the scope and what you want to achieve..."
          rows={3}
        />
      </motion.div>

      {/* Known Quantities */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Known Quantities</CardTitle>
              <Button size="sm" onClick={addQuantity}>
                Add Quantity
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.known_quantities ?? []).map((quantity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    {quantity.symbol || `Q${index + 1}`}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => removeQuantity(index)}>
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Symbol *</Label>
                    <Input
                      value={quantity.symbol}
                      onChange={(event) => updateQuantity(index, { symbol: event.target.value })}
                      placeholder="e.g., beta"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Value *</Label>
                    <Input
                      value={String(quantity.value ?? '')}
                      onChange={(event) => updateQuantity(index, { value: Number(event.target.value) || 0 })}
                      placeholder="e.g., 0.3"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Units *</Label>
                    <Input
                      value={quantity.units}
                      onChange={(event) => updateQuantity(index, { units: event.target.value })}
                      placeholder="e.g., 1/day"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input
                      value={quantity.description ?? ''}
                      onChange={(event) => updateQuantity(index, { description: event.target.value })}
                      placeholder="Transmission rate"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Uncertainty Type</Label>
                    <select
                      value={quantity.uncertainty?.type ?? ''}
                      onChange={(event) => {
                        const type = event.target.value as QuantityUncertaintyOption | ''
                        if (!type) {
                          const { uncertainty, ...rest } = quantity
                          updateQuantity(index, rest)
                        } else {
                          updateQuantity(index, {
                            uncertainty: {
                              type,
                              value: quantity.uncertainty?.value ?? 0,
                            },
                          })
                        }
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {QUANTITY_UNCERTAINTY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {toTitle(option)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label>Uncertainty Value</Label>
                    <Input
                      value={
                        quantity.uncertainty?.value === undefined
                          ? ''
                          : Array.isArray(quantity.uncertainty.value)
                            ? quantity.uncertainty.value.join(', ')
                            : String(quantity.uncertainty.value)
                      }
                      onChange={(event) =>
                        updateQuantity(index, {
                          uncertainty: quantity.uncertainty
                            ? {
                                ...quantity.uncertainty,
                                value: Number(event.target.value) || 0,
                              }
                            : {
                                type: 'sd',
                                value: Number(event.target.value) || 0,
                              },
                        })
                      }
                      placeholder="e.g., 0.05 or 0.04, 0.06"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Unknowns */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Unknown Variables</CardTitle>
              <Button size="sm" onClick={addVariable}>
                Add Variable
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.unknowns ?? []).map((variable, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    {variable.symbol || `X${index + 1}`}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => removeVariable(index)}>
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Symbol *</Label>
                    <Input
                      value={variable.symbol}
                      onChange={(event) => updateVariable(index, { symbol: event.target.value })}
                      placeholder="e.g., S"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Units</Label>
                    <Input
                      value={variable.units ?? ''}
                      onChange={(event) => updateVariable(index, { units: event.target.value })}
                      placeholder="people"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Lower Bound</Label>
                    <Input
                      value={variable.bounds?.lower === undefined ? '' : String(variable.bounds.lower)}
                      onChange={(event) =>
                        updateVariable(index, {
                          bounds: {
                            lower: event.target.value,
                            upper: variable.bounds?.upper ?? 0,
                            units: variable.bounds?.units,
                          },
                        })
                      }
                      placeholder="0"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Upper Bound</Label>
                    <Input
                      value={variable.bounds?.upper === undefined ? '' : String(variable.bounds.upper)}
                      onChange={(event) =>
                        updateVariable(index, {
                          bounds: {
                            lower: variable.bounds?.lower ?? 0,
                            upper: event.target.value,
                            units: variable.bounds?.units,
                          },
                        })
                      }
                      placeholder="N"
                      className="font-mono"
                    />
                  </div>
                </div>

              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Constraints & Goals */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Constraints & Goals</CardTitle>
              <Button size="sm" onClick={addConstraint}>
                Add Constraint
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Objective</Label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  value={data.constraints_goals?.objective?.expression ?? ''}
                  onChange={(event) =>
                    updateConstraintsGoals('objective', {
                      ...(data.constraints_goals?.objective ?? {
                        sense: 'minimize' as ObjectiveSenseOption,
                      }),
                      expression: event.target.value,
                    })
                  }
                  placeholder="minimize integral I(t) dt"
                />
                <select
                  value={data.constraints_goals?.objective?.sense ?? 'minimize'}
                  onChange={(event) =>
                    updateConstraintsGoals('objective', {
                      ...(data.constraints_goals?.objective ?? { expression: '' }),
                      sense: event.target.value as ObjectiveSenseOption,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {OBJECTIVE_SENSE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toTitle(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hard Constraints</Label>
              {(data.constraints_goals?.hard_constraints ?? []).map((constraint, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-2 md:flex-row md:items-center"
                >
                  <Input
                    value={constraint.expression}
                    onChange={(event) => updateConstraint(index, { expression: event.target.value })}
                    placeholder="e.g., S + E + I + R <= N"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={constraint.type ?? 'inequality'}
                      onChange={(event) =>
                        updateConstraint(index, {
                          type: event.target.value as ConstraintTypeOption,
                        })
                      }
                      className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {CONSTRAINT_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option === 'equality' ? '=' : '<='}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" variant="outline" onClick={() => removeConstraint(index)}>
                      Remove
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Soft Preferences</Label>
              <Textarea
                value={(data.constraints_goals?.soft_preferences ?? [])
                  .map((pref) => typeof pref === 'string' ? pref : pref.expression)
                  .join('\n')}
                onChange={(event) => updateSoftPreferences(event.target.value)}
                rows={3}
                placeholder="Separate preferences by new lines..."
              />
              <p className="text-xs text-slate-500">
                Each preference will have a default weight of 1.0
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Mechanistic Notes */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-2"
      >
        <Label htmlFor="mechanistic_notes">Mechanistic Notes *</Label>
        <Textarea
          id="mechanistic_notes"
          value={data.mechanistic_notes}
          onChange={(event) => updateField('mechanistic_notes', event.target.value)}
          placeholder="Describe the underlying mechanisms and assumptions..."
          rows={4}
        />
      </motion.div>
    </div>
  )
}
