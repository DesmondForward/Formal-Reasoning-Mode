import React from 'react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { FRMData } from '@/data/schema'

interface ValidationEditorProps {
  data: FRMData['validation']
  onChange: (validation: FRMData['validation']) => void
}

export const ValidationEditor: React.FC<ValidationEditorProps> = ({ data, onChange }) => {
  const updateField = <K extends keyof FRMData['validation']>(field: K, value: FRMData['validation'][K]) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const addMetric = (field: 'constraint_satisfaction_metrics' | 'fit_quality_metrics') => {
    const current = data[field] ?? []
    updateField(field, [...current, { name: '', value: 0, threshold: 0 }])
  }

  const updateMetric = (
    field: 'constraint_satisfaction_metrics' | 'fit_quality_metrics',
    index: number,
    property: 'name' | 'value' | 'threshold',
    value: string | number,
  ) => {
    const current = data[field] ?? []
    const next = [...current]
    next[index] = {
      ...next[index],
      [property]: property === 'name' ? value : Number(value) || 0,
    }
    updateField(field, next)
  }

  const removeMetric = (field: 'constraint_satisfaction_metrics' | 'fit_quality_metrics', index: number) => {
    const current = data[field] ?? []
    updateField(
      field,
      current.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="unit_consistency_check"
                checked={data.unit_consistency_check ?? true}
                onCheckedChange={(checked) => updateField('unit_consistency_check', Boolean(checked))}
              />
              <Label htmlFor="unit_consistency_check">Unit consistency check</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mechanism_coverage_check"
                checked={data.mechanism_coverage_check ?? true}
                onCheckedChange={(checked) => updateField('mechanism_coverage_check', Boolean(checked))}
              />
              <Label htmlFor="mechanism_coverage_check">Mechanism coverage check</Label>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Constraint Satisfaction Metrics</CardTitle>
              <Button size="sm" onClick={() => addMetric('constraint_satisfaction_metrics')}>
                Add Metric
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.constraint_satisfaction_metrics ?? []).map((metric, index) => (
              <div key={index} className="space-y-2 p-3 border rounded">
                <div className="flex items-center space-x-2">
                  <Input
                    value={metric.name}
                    onChange={(event) => updateMetric('constraint_satisfaction_metrics', index, 'name', event.target.value)}
                    placeholder="constraint_violation_ratio"
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={() => removeMetric('constraint_satisfaction_metrics', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={metric.value}
                    onChange={(event) => updateMetric('constraint_satisfaction_metrics', index, 'value', event.target.value)}
                    placeholder="Value"
                  />
                  <Input
                    type="number"
                    value={metric.threshold}
                    onChange={(event) => updateMetric('constraint_satisfaction_metrics', index, 'threshold', event.target.value)}
                    placeholder="Threshold"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Fit Quality Metrics</CardTitle>
              <Button size="sm" onClick={() => addMetric('fit_quality_metrics')}>
                Add Metric
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.fit_quality_metrics ?? []).map((metric, index) => (
              <div key={index} className="space-y-2 p-3 border rounded">
                <div className="flex items-center space-x-2">
                  <Input
                    value={metric.name}
                    onChange={(event) => updateMetric('fit_quality_metrics', index, 'name', event.target.value)}
                    placeholder="RMSE"
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={() => removeMetric('fit_quality_metrics', index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={metric.value}
                    onChange={(event) => updateMetric('fit_quality_metrics', index, 'value', event.target.value)}
                    placeholder="Value"
                  />
                  <Input
                    type="number"
                    value={metric.threshold}
                    onChange={(event) => updateMetric('fit_quality_metrics', index, 'threshold', event.target.value)}
                    placeholder="Threshold"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Counterfactual Sanity Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="counterfactual_enabled"
                checked={data.counterfactual_sanity?.enabled ?? true}
                onCheckedChange={(checked) =>
                  updateField('counterfactual_sanity', {
                    ...(data.counterfactual_sanity ?? {}),
                    enabled: Boolean(checked),
                  })
                }
              />
              <Label htmlFor="counterfactual_enabled">Enable counterfactual sanity check</Label>
            </div>
            <div className="space-y-1">
              <Label>Perturbation Percent</Label>
              <Input
                type="number"
                value={data.counterfactual_sanity?.perturb_percent ?? 10}
                onChange={(event) =>
                  updateField('counterfactual_sanity', {
                    ...(data.counterfactual_sanity ?? {}),
                    perturb_percent: Number(event.target.value) || 0,
                  })
                }
                min="0"
                max="100"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Generalization Checks */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Generalization Checks</CardTitle>
              <Button size="sm" onClick={() => {
                const current = data.generalization_checks ?? []
                updateField('generalization_checks', [...current, {
                  dataset_used: '',
                  metric_name: '',
                  value: 0,
                  threshold: 0,
                  passed: false
                }])
              }}>
                Add Check
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.generalization_checks ?? []).map((check, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Dataset Used</Label>
                    <Input
                      value={check.dataset_used}
                      onChange={(event) => {
                        const checks = [...(data.generalization_checks ?? [])]
                        checks[index] = { ...check, dataset_used: event.target.value }
                        updateField('generalization_checks', checks)
                      }}
                      placeholder="test_dataset_v1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Metric Name</Label>
                    <Input
                      value={check.metric_name}
                      onChange={(event) => {
                        const checks = [...(data.generalization_checks ?? [])]
                        checks[index] = { ...check, metric_name: event.target.value }
                        updateField('generalization_checks', checks)
                      }}
                      placeholder="accuracy"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Value</Label>
                    <Input
                      type="number"
                      value={check.value}
                      onChange={(event) => {
                        const checks = [...(data.generalization_checks ?? [])]
                        checks[index] = { ...check, value: Number(event.target.value) || 0 }
                        updateField('generalization_checks', checks)
                      }}
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Threshold</Label>
                    <Input
                      type="number"
                      value={check.threshold}
                      onChange={(event) => {
                        const checks = [...(data.generalization_checks ?? [])]
                        checks[index] = { ...check, threshold: Number(event.target.value) || 0 }
                        updateField('generalization_checks', checks)
                      }}
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Passed</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={check.passed}
                        onCheckedChange={(checked) => {
                          const checks = [...(data.generalization_checks ?? [])]
                          checks[index] = { ...check, passed: Boolean(checked) }
                          updateField('generalization_checks', checks)
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => {
                    const checks = [...(data.generalization_checks ?? [])]
                    checks.splice(index, 1)
                    updateField('generalization_checks', checks)
                  }}>
                    Remove
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Scientific Alignment Checks */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Scientific Alignment Checks</CardTitle>
              <Button size="sm" onClick={() => {
                const current = data.scientific_alignment_checks ?? []
                updateField('scientific_alignment_checks', [...current, {
                  principle_name: '',
                  passed: false
                }])
              }}>
                Add Check
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.scientific_alignment_checks ?? []).map((check, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Principle Name</Label>
                    <Input
                      value={check.principle_name}
                      onChange={(event) => {
                        const checks = [...(data.scientific_alignment_checks ?? [])]
                        checks[index] = { ...check, principle_name: event.target.value }
                        updateField('scientific_alignment_checks', checks)
                      }}
                      placeholder="conservation_of_energy"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Passed</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={check.passed}
                        onCheckedChange={(checked) => {
                          const checks = [...(data.scientific_alignment_checks ?? [])]
                          checks[index] = { ...check, passed: Boolean(checked) }
                          updateField('scientific_alignment_checks', checks)
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Comment</Label>
                  <Textarea
                    value={check.comment ?? ''}
                    onChange={(event) => {
                      const checks = [...(data.scientific_alignment_checks ?? [])]
                      checks[index] = { ...check, comment: event.target.value }
                      updateField('scientific_alignment_checks', checks)
                    }}
                    placeholder="Additional notes about this principle check..."
                    rows={2}
                  />
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => {
                    const checks = [...(data.scientific_alignment_checks ?? [])]
                    checks.splice(index, 1)
                    updateField('scientific_alignment_checks', checks)
                  }}>
                    Remove
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Expert Review */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expert Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Experts</Label>
              <Textarea
                value={(data.expert_review?.experts ?? []).join('\n')}
                onChange={(event) => updateField('expert_review', {
                  experts: event.target.value.split('\n').filter(line => line.trim()),
                  summary: data.expert_review?.summary ?? '',
                  interpretability_score: data.expert_review?.interpretability_score ?? 0
                })}
                placeholder="List expert names, one per line..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea
                value={data.expert_review?.summary ?? ''}
                onChange={(event) => updateField('expert_review', {
                  experts: data.expert_review?.experts ?? [],
                  summary: event.target.value,
                  interpretability_score: data.expert_review?.interpretability_score ?? 0
                })}
                placeholder="Expert review summary..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Interpretability Score (0-1)</Label>
              <Input
                type="number"
                value={data.expert_review?.interpretability_score ?? ''}
                onChange={(event) => updateField('expert_review', {
                  experts: data.expert_review?.experts ?? [],
                  summary: data.expert_review?.summary ?? '',
                  interpretability_score: Number(event.target.value) || 0
                })}
                min="0"
                max="1"
                step="0.1"
                placeholder="0.8"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
