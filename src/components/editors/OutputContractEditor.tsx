import React from 'react'
import { motion } from 'framer-motion'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  MATH_NOTATION_OPTIONS,
  NUMBER_FORMAT_OPTIONS,
  type FRMData,
  type MathNotationOption,
  type NumberFormatOption,
} from '@/data/schema'

interface OutputContractEditorProps {
  data: FRMData['output_contract']
  onChange: (output: FRMData['output_contract']) => void
}

const DEFAULT_SECTIONS: FRMData['output_contract']['sections_required'] = [
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
]

const toTitle = (value: string) =>
  value
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const OutputContractEditor: React.FC<OutputContractEditorProps> = ({ data, onChange }) => {
  const updateField = <K extends keyof FRMData['output_contract']>(field: K, value: FRMData['output_contract'][K]) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const toggleSection = (section: string) => {
    const sections = data.sections_required ?? []
    const next = sections.includes(section)
      ? sections.filter((item) => item !== section)
      : [...sections, section]
    updateField('sections_required', next)
  }

  const selectAllSections = () => {
    updateField('sections_required', [...DEFAULT_SECTIONS])
  }

  const deselectAllSections = () => {
    updateField('sections_required', [])
  }

  const selectedCount = (data.sections_required ?? []).length
  const allSelected = selectedCount === DEFAULT_SECTIONS.length
  const noneSelected = selectedCount === 0

  const updateFormatting = <K extends keyof NonNullable<FRMData['output_contract']['formatting']>>(
    field: K,
    value: NonNullable<FRMData['output_contract']['formatting']>[K],
  ) => {
    updateField('formatting', {
      ...(data.formatting ?? {}),
      [field]: value,
    })
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required Output Sections</CardTitle>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-muted-foreground">
                {selectedCount} of {DEFAULT_SECTIONS.length} sections selected
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllSections}
                  disabled={allSelected}
                  className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAllSections}
                  disabled={noneSelected}
                  className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {DEFAULT_SECTIONS.map((section) => (
                <div key={section} className="flex items-center space-x-2">
                  <Checkbox
                    id={section}
                    checked={(data.sections_required ?? []).includes(section)}
                    onCheckedChange={() => toggleSection(section)}
                  />
                  <Label htmlFor={section} className="text-sm">
                    {toTitle(section)}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formatting Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Math Notation</Label>
                <Select
                  value={data.formatting?.math_notation ?? 'LaTeX'}
                  onValueChange={(value) => updateFormatting('math_notation', value as MathNotationOption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATH_NOTATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Number Format</Label>
                <Select
                  value={data.formatting?.number_format ?? 'auto'}
                  onValueChange={(value) => updateFormatting('number_format', value as NumberFormatOption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NUMBER_FORMAT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {toTitle(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Significant Figures</Label>
              <Input
                type="number"
                value={data.formatting?.significant_figures ?? 4}
                onChange={(event) => updateFormatting('significant_figures', Number(event.target.value) || 0)}
                min="2"
                max="6"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Label htmlFor="safety_note">Safety Note</Label>
        <Textarea
          id="safety_note"
          value={data.safety_note ?? ''}
          onChange={(event) => updateField('safety_note', event.target.value)}
          placeholder="Add any safety disclaimers or warnings..."
          rows={3}
        />
      </motion.div>
    </div>
  )
}
