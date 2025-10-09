import React from 'react'
import { motion } from 'framer-motion'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  DOMAIN_OPTIONS,
  CONTRIBUTION_TYPE_OPTIONS,
  type DomainOption,
  type ContributionTypeOption,
  type FRMData,
} from '@/data/schema'
import { DOMAIN_DESCRIPTION_MAP, formatDomainLabel } from '@/data/domainMetadata'

interface MetadataEditorProps {
  data: FRMData['metadata']
  onChange: (metadata: FRMData['metadata']) => void
}

const formatContributionTypeLabel = (value: ContributionTypeOption) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ data, onChange }) => {
  const updateField = <K extends keyof FRMData['metadata']>(field: K, value: FRMData['metadata'][K]) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const handleDomainsInvolvedChange = (domain: DomainOption, isChecked: boolean | 'indeterminate') => {
    const currentContext = data.novelty_context ?? {}
    const currentDomains = currentContext.domains_involved ?? []
    const shouldAdd = isChecked === true
    const updatedDomains = shouldAdd
      ? Array.from(new Set([...currentDomains, domain]))
      : currentDomains.filter((value) => value !== domain)

    updateField('novelty_context', {
      ...currentContext,
      domains_involved: updatedDomains,
    })
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div className="space-y-2">
          <Label htmlFor="problem_id">Problem ID *</Label>
          <Input
            id="problem_id"
            value={data.problem_id}
            onChange={(event) => updateField('problem_id', event.target.value)}
            placeholder="e.g., COVID_SEIR_001"
            className="font-mono"
          />
          <p className="text-xs text-slate-500">Unique identifier for this problem instance.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain">Domain *</Label>
          <Select
            value={data.domain}
            onValueChange={(value) => updateField('domain', value as DomainOption)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent>
              {DOMAIN_OPTIONS.map((domain) => (
                <SelectItem key={domain} value={domain}>
                  {formatDomainLabel(domain)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Version *</Label>
          <Input
            id="version"
            value={data.version}
            onChange={(event) => updateField('version', event.target.value)}
            placeholder="v1.0"
            className="font-mono"
          />
          <p className="text-xs text-slate-500">Semantic version (e.g., v1.0, v2.1.3).</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={data.notes ?? ''}
            onChange={(event) => updateField('notes', event.target.value)}
            placeholder="Additional notes about this problem..."
            rows={3}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Domain Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <span className="rounded-md border px-2 py-1 text-xs font-medium uppercase tracking-wide">
                {formatDomainLabel(data.domain)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {DOMAIN_DESCRIPTION_MAP[data.domain]}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Novelty Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="problem_lineage_note">Problem Lineage Note</Label>
              <Textarea
                id="problem_lineage_note"
                value={data.novelty_context?.problem_lineage_note ?? ''}
                onChange={(event) => updateField('novelty_context', {
                  ...data.novelty_context,
                  problem_lineage_note: event.target.value
                })}
                placeholder="Describe how this problem relates to existing work..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intended_contribution_type">Intended Contribution Type</Label>
              <Select
                value={data.novelty_context?.intended_contribution_type ?? ''}
                onValueChange={(value) => updateField('novelty_context', {
                  ...data.novelty_context,
                  intended_contribution_type: value as ContributionTypeOption
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contribution type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRIBUTION_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatContributionTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="known_baselines">Known Baselines</Label>
              <Textarea
                id="known_baselines"
                value={data.novelty_context?.known_baselines?.join('\n') ?? ''}
                onChange={(event) => updateField('novelty_context', {
                  ...data.novelty_context,
                  known_baselines: event.target.value.split('\n').filter(line => line.trim())
                })}
                placeholder="List known baseline approaches or methods (one per line)..."
                rows={3}
              />
              <p className="text-xs text-slate-500">Enter one baseline per line</p>
            </div>

            <div className="space-y-2">
              <Label>Domains Involved</Label>
              <p className="text-xs text-slate-500">
                Select additional domains that meaningfully contribute to the novelty.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {DOMAIN_OPTIONS.map((domain) => {
                  const checked = data.novelty_context?.domains_involved?.includes(domain) ?? false
                  return (
                    <label
                      key={domain}
                      htmlFor={`novelty-domain-${domain}`}
                      className="flex items-center space-x-2 rounded-md border border-border/50 bg-background/40 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`novelty-domain-${domain}`}
                        checked={checked}
                        onCheckedChange={(next) => handleDomainsInvolvedChange(domain, next)}
                      />
                      <span className="flex-1">{formatDomainLabel(domain)}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
