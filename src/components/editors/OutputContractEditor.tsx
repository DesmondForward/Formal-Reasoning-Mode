import React from 'react'
import { motion } from 'framer-motion'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  type FRMData,
  type OutputSectionOption,
  OUTPUT_SECTION_OPTIONS,
  type MathNotationOption,
  type ExplanationDetailOption,
} from '@/data/schema'

interface OutputContractEditorProps {
  data: FRMData['output_contract']
  onChange: (output: FRMData['output_contract']) => void
}

const ALL_SECTIONS: OutputSectionOption[] = [...OUTPUT_SECTION_OPTIONS]

const formatSectionLabel = (value: string) => {
  // If it already contains spaces or special characters, use as-is
  if (/[^A-Za-z0-9]/.test(value)) return value
  return value
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export const OutputContractEditor: React.FC<OutputContractEditorProps> = ({ data, onChange }) => {
  const updateField = <K extends keyof FRMData['output_contract']>(field: K, value: FRMData['output_contract'][K]) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const toggleSection = (section: OutputSectionOption) => {
    const sections = data.sections_required ?? []
    const next = sections.includes(section)
      ? sections.filter((item) => item !== section)
      : [...sections, section]
    updateField('sections_required', next)
  }

  const selectAllSections = () => {
    updateField('sections_required', [...ALL_SECTIONS])
  }

  const deselectAllSections = () => {
    updateField('sections_required', [])
  }

  const selectedCount = (data.sections_required ?? []).length
  const allSelected = selectedCount === ALL_SECTIONS.length
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
                {selectedCount} of {ALL_SECTIONS.length} sections selected
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
              {ALL_SECTIONS.map((section) => (
                <div key={section} className="flex items-center space-x-2">
                  <Checkbox
                    id={`section-${section.replace(/[^A-Za-z0-9]+/g, '_')}`}
                    checked={(data.sections_required ?? []).includes(section)}
                    onCheckedChange={() => toggleSection(section)}
                  />
                  <Label htmlFor={`section-${section.replace(/[^A-Za-z0-9]+/g, '_')}`} className="text-sm">
                    {formatSectionLabel(section)}
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
                  value={data.formatting?.math_notation ?? 'latex'}
                  onValueChange={(value) => updateFormatting('math_notation', value as MathNotationOption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latex">LaTeX</SelectItem>
                    <SelectItem value="unicode">Unicode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Explanation Detail</Label>
                <Select
                  value={data.formatting?.explanation_detail ?? 'detailed'}
                  onValueChange={(value) => updateFormatting('explanation_detail', value as ExplanationDetailOption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terse">Terse</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Safety Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="safety_flag"
                checked={data.safety_note?.flag ?? false}
                onChange={(event) =>
                  updateField('safety_note', {
                    ...(data.safety_note ?? { flag: false, content: '' }),
                    flag: event.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="safety_flag">Safety concerns identified</Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="safety_content">Safety Note Content</Label>
              <Textarea
                id="safety_content"
                value={data.safety_note?.content ?? ''}
                onChange={(event) =>
                  updateField('safety_note', {
                    ...(data.safety_note ?? { flag: false, content: '' }),
                    content: event.target.value,
                  })
                }
                placeholder="Add any safety disclaimers or warnings..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
