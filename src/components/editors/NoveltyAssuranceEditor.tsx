import React from 'react'
import { motion } from 'framer-motion'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ExternalLink } from 'lucide-react'

import type { FRMData, SimilarityMetric } from '@/data/schema'
import { NOVELTY_METRIC_OPTIONS, CONTRIBUTION_TYPE_OPTIONS, FINAL_DECISION_OPTIONS, MISSING_EVIDENCE_POLICY_OPTIONS, ON_FAIL_ACTION_OPTIONS } from '@/data/schema'

interface NoveltyAssuranceEditorProps {
  data: FRMData['novelty_assurance']
  onChange: (noveltyAssurance: FRMData['novelty_assurance']) => void
}

export const NoveltyAssuranceEditor: React.FC<NoveltyAssuranceEditorProps> = ({ data, onChange }) => {

  const updatePriorWork = <K extends keyof FRMData['novelty_assurance']['prior_work']>(
    field: K,
    value: FRMData['novelty_assurance']['prior_work'][K]
  ) => {
    onChange({
      ...data,
      prior_work: {
        ...data.prior_work,
        [field]: value,
      },
    })
  }

  const updateCitationChecks = <K extends keyof FRMData['novelty_assurance']['citation_checks']>(
    field: K,
    value: FRMData['novelty_assurance']['citation_checks'][K]
  ) => {
    onChange({
      ...data,
      citation_checks: {
        ...data.citation_checks,
        [field]: value,
      },
    })
  }

  const updateSimilarityAssessment = <K extends keyof FRMData['novelty_assurance']['similarity_assessment']>(
    field: K,
    value: FRMData['novelty_assurance']['similarity_assessment'][K]
  ) => {
    onChange({
      ...data,
      similarity_assessment: {
        ...data.similarity_assessment,
        [field]: value,
      },
    })
  }

  const updateRedundancyCheck = <K extends keyof FRMData['novelty_assurance']['redundancy_check']>(
    field: K,
    value: FRMData['novelty_assurance']['redundancy_check'][K]
  ) => {
    onChange({
      ...data,
      redundancy_check: {
        ...data.redundancy_check,
        [field]: value,
      },
    })
  }

  const updateErrorHandling = <K extends keyof FRMData['novelty_assurance']['error_handling']>(
    field: K,
    value: FRMData['novelty_assurance']['error_handling'][K]
  ) => {
    onChange({
      ...data,
      error_handling: {
        ...data.error_handling,
        [field]: value,
      },
    })
  }

  const addCitation = () => {
    const newCitation = {
      id: `CIT${String(data.citations.length + 1).padStart(3, '0')}`,
      title: '',
      authors: '',
      year: new Date().getFullYear(),
      source: '',
    }
    onChange({
      ...data,
      citations: [...data.citations, newCitation],
    })
  }

  const updateCitation = (index: number, field: keyof FRMData['novelty_assurance']['citations'][0], value: any) => {
    const updatedCitations = [...data.citations]
    updatedCitations[index] = {
      ...updatedCitations[index],
      [field]: value,
    }
    onChange({
      ...data,
      citations: updatedCitations,
    })
  }

  const removeCitation = (index: number) => {
    const updatedCitations = data.citations.filter((_, i) => i !== index)
    onChange({
      ...data,
      citations: updatedCitations,
    })
  }

  const addNoveltyClaim = () => {
    const newClaim = {
      id: `NC${data.novelty_claims.length + 1}`,
      statement: '',
      category: 'model' as const,
      evidence_citations: [],
    }
    onChange({
      ...data,
      novelty_claims: [...data.novelty_claims, newClaim],
    })
  }

  const updateNoveltyClaim = (index: number, field: keyof FRMData['novelty_assurance']['novelty_claims'][0], value: any) => {
    const updatedClaims = [...data.novelty_claims]
    updatedClaims[index] = {
      ...updatedClaims[index],
      [field]: value,
    }
    onChange({
      ...data,
      novelty_claims: updatedClaims,
    })
  }

  const removeNoveltyClaim = (index: number) => {
    const updatedClaims = data.novelty_claims.filter((_, i) => i !== index)
    onChange({
      ...data,
      novelty_claims: updatedClaims,
    })
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Novelty Assurance
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Ensure your work is novel and properly documented with prior art
        </p>
      </motion.div>

      {/* Prior Work Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ExternalLink className="h-5 w-5" />
            <span>Prior Work Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="literature_summary">Literature Corpus Summary *</Label>
            <Textarea
              id="literature_summary"
              value={data.prior_work.literature_corpus_summary}
              onChange={(e) => updatePriorWork('literature_corpus_summary', e.target.value)}
              placeholder="Summarize the relevant literature and how your work relates to it..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Search Queries</Label>
            <div className="space-y-2">
              {data.prior_work.search_queries.map((query, index) => (
                <div key={index} className="flex space-x-2">
                  <Input
                    value={query}
                    onChange={(e) => {
                      const updatedQueries = [...data.prior_work.search_queries]
                      updatedQueries[index] = e.target.value
                      updatePriorWork('search_queries', updatedQueries)
                    }}
                    placeholder="Search query..."
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updatedQueries = data.prior_work.search_queries.filter((_, i) => i !== index)
                      updatePriorWork('search_queries', updatedQueries)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePriorWork('search_queries', [...data.prior_work.search_queries, ''])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Query
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Citations Section */}
      <Card>
        <CardHeader>
          <CardTitle>Citations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.citations.map((citation, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Badge variant="outline">{citation.id}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeCitation(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={citation.title}
                    onChange={(e) => updateCitation(index, 'title', e.target.value)}
                    placeholder="Paper title..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Year *</Label>
                  <Input
                    type="number"
                    value={citation.year}
                    onChange={(e) => updateCitation(index, 'year', parseInt(e.target.value))}
                    placeholder="2023"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Authors (comma-separated) *</Label>
                  <Input
                    value={citation.authors}
                    onChange={(e) => updateCitation(index, 'authors', e.target.value)}
                    placeholder="Author One, Author Two"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Source *</Label>
                  <Input
                    value={citation.source || ''}
                    onChange={(e) => updateCitation(index, 'source', e.target.value)}
                    placeholder="Journal or Conference"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Venue</Label>
                  <Input
                    value={citation.venue || ''}
                    onChange={(e) => updateCitation(index, 'venue', e.target.value)}
                    placeholder="Journal or Conference"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>DOI</Label>
                  <Input
                    value={citation.doi || ''}
                    onChange={(e) => updateCitation(index, 'doi', e.target.value)}
                    placeholder="10.1000/example"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    value={citation.url || ''}
                    onChange={(e) => updateCitation(index, 'url', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={addCitation}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Citation
          </Button>
        </CardContent>
      </Card>

      {/* Citation Checks Section */}
      <Card>
        <CardHeader>
          <CardTitle>Citation Quality Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coverage_ratio">Coverage Ratio</Label>
              <Input
                id="coverage_ratio"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={data.citation_checks.coverage_ratio}
                onChange={(e) => updateCitationChecks('coverage_ratio', parseFloat(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paraphrase_overlap">Paraphrase Overlap</Label>
              <Input
                id="paraphrase_overlap"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={data.citation_checks.paraphrase_overlap}
                onChange={(e) => updateCitationChecks('paraphrase_overlap', parseFloat(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="coverage_min_threshold">Min Coverage Threshold</Label>
              <Input
                id="coverage_min_threshold"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={data.citation_checks.coverage_min_threshold}
                onChange={(e) => updateCitationChecks('coverage_min_threshold', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Similarity Assessment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Similarity Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Novelty Metrics</Label>
            <div className="grid grid-cols-2 gap-2">
              {NOVELTY_METRIC_OPTIONS.map((metric) => (
                <div key={metric} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`metric_${metric}`}
                    checked={data.similarity_assessment.metrics.some(m => m.name === metric)}
                    onChange={(event) => {
                      const currentMetrics = data.similarity_assessment.metrics
                      if (event.target.checked) {
                        const newMetric: SimilarityMetric = {
                          name: metric,
                          score: 0,
                          direction: 'lower_is_better',
                          threshold: 0.5,
                          passed: false
                        }
                        updateSimilarityAssessment('metrics', [...currentMetrics, newMetric])
                      } else {
                        updateSimilarityAssessment('metrics', currentMetrics.filter(m => m.name !== metric))
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`metric_${metric}`} className="text-sm">
                    {metric.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {data.similarity_assessment.metrics.map((metric, index) => (
              <div key={metric.name} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <Badge variant="outline">{metric.name}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const metrics = data.similarity_assessment.metrics.filter((_, i) => i !== index)
                      updateSimilarityAssessment('metrics', metrics)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label>Score</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={metric.score}
                      onChange={(e) => {
                        const metrics = [...data.similarity_assessment.metrics]
                        metrics[index] = { ...metric, score: parseFloat(e.target.value) || 0 }
                        updateSimilarityAssessment('metrics', metrics)
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Threshold</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={metric.threshold}
                      onChange={(e) => {
                        const metrics = [...data.similarity_assessment.metrics]
                        metrics[index] = { ...metric, threshold: parseFloat(e.target.value) || 0 }
                        updateSimilarityAssessment('metrics', metrics)
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Direction</Label>
                    <Select
                      value={metric.direction}
                      onValueChange={(value) => {
                        const metrics = [...data.similarity_assessment.metrics]
                        metrics[index] = { ...metric, direction: value as 'lower_is_better' | 'higher_is_better' }
                        updateSimilarityAssessment('metrics', metrics)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lower_is_better">Lower is Better</SelectItem>
                        <SelectItem value="higher_is_better">Higher is Better</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Passed</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={metric.passed}
                        onChange={(e) => {
                          const metrics = [...data.similarity_assessment.metrics]
                          metrics[index] = { ...metric, passed: e.target.checked }
                          updateSimilarityAssessment('metrics', metrics)
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Input
                    value={metric.notes || ''}
                    onChange={(e) => {
                      const metrics = [...data.similarity_assessment.metrics]
                      metrics[index] = { ...metric, notes: e.target.value }
                      updateSimilarityAssessment('metrics', metrics)
                    }}
                    placeholder="Additional notes about this metric..."
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Max Similarity</Label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={data.similarity_assessment.aggregates.max_similarity}
                onChange={(e) => updateSimilarityAssessment('aggregates', {
                  ...data.similarity_assessment.aggregates,
                  max_similarity: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Min Novelty Score</Label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={data.similarity_assessment.aggregates.min_novelty_score}
                onChange={(e) => updateSimilarityAssessment('aggregates', {
                  ...data.similarity_assessment.aggregates,
                  min_novelty_score: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Passes</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={data.similarity_assessment.aggregates.passes}
                  onChange={(e) => updateSimilarityAssessment('aggregates', {
                    ...data.similarity_assessment.aggregates,
                    passes: e.target.checked
                  })}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Novelty Claims Section */}
      <Card>
        <CardHeader>
          <CardTitle>Novelty Claims</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.novelty_claims.map((claim, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Badge variant="outline">{claim.id}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeNoveltyClaim(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Statement *</Label>
                  <Textarea
                    value={claim.statement}
                    onChange={(e) => updateNoveltyClaim(index, 'statement', e.target.value)}
                    placeholder="Describe the novel contribution..."
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={claim.category}
                    onValueChange={(value) => updateNoveltyClaim(index, 'category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRIBUTION_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  
                  <div className="space-y-2">
                    <Label>Evidence Citations (comma-separated IDs)</Label>
                    <Input
                      value={claim.evidence_citations.join(', ')}
                      onChange={(e) => updateNoveltyClaim(index, 'evidence_citations', e.target.value.split(',').map(c => c.trim()))}
                      placeholder="CIT001, CIT002"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Expected Impact</Label>
                  <Input
                    value={claim.expected_impact || ''}
                    onChange={(e) => updateNoveltyClaim(index, 'expected_impact', e.target.value)}
                    placeholder="Describe the expected impact of this contribution..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Creativity Scores</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Originality (0-1)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={claim.creativity_scores?.originality || ''}
                        onChange={(e) => updateNoveltyClaim(index, 'creativity_scores', {
                          ...claim.creativity_scores,
                          originality: parseFloat(e.target.value) || 0
                        })}
                        placeholder="0.8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Feasibility (0-1)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={claim.creativity_scores?.feasibility || ''}
                        onChange={(e) => updateNoveltyClaim(index, 'creativity_scores', {
                          ...claim.creativity_scores,
                          feasibility: parseFloat(e.target.value) || 0
                        })}
                        placeholder="0.9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Impact (0-1)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={claim.creativity_scores?.impact || ''}
                        onChange={(e) => updateNoveltyClaim(index, 'creativity_scores', {
                          ...claim.creativity_scores,
                          impact: parseFloat(e.target.value) || 0
                        })}
                        placeholder="0.7"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Reliability (0-1)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={claim.creativity_scores?.reliability || ''}
                        onChange={(e) => updateNoveltyClaim(index, 'creativity_scores', {
                          ...claim.creativity_scores,
                          reliability: parseFloat(e.target.value) || 0
                        })}
                        placeholder="0.85"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <Button
            variant="outline"
            onClick={addNoveltyClaim}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Novelty Claim
          </Button>
        </CardContent>
      </Card>

      {/* Redundancy Check Section */}
      <Card>
        <CardHeader>
          <CardTitle>Redundancy Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Final Decision</Label>
            <Select
              value={data.redundancy_check.final_decision}
              onValueChange={(value) => updateRedundancyCheck('final_decision', value as 'reject' | 'revise' | 'proceed')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINAL_DECISION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="justification">Justification *</Label>
            <Textarea
              id="justification"
              value={data.redundancy_check.justification}
              onChange={(e) => updateRedundancyCheck('justification', e.target.value)}
              placeholder="Explain the decision and reasoning..."
              className="min-h-[80px]"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="gate_pass"
              checked={data.redundancy_check.gate_pass}
              onChange={(e) => updateRedundancyCheck('gate_pass', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="gate_pass">Gate Pass (must be true for validation)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Error Handling Section */}
      <Card>
        <CardHeader>
          <CardTitle>Error Handling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Missing Evidence Policy</Label>
            <Select
              value={data.error_handling.missing_evidence_policy}
              onValueChange={(value) => updateErrorHandling('missing_evidence_policy', value as 'fail_validation' | 'allow_with_warning')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MISSING_EVIDENCE_POLICY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>On Fail Action</Label>
            <Select
              value={data.error_handling.on_fail_action}
              onValueChange={(value) => updateErrorHandling('on_fail_action', value as 'defer' | 'reject' | 'request_more_search' | 'revise')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ON_FAIL_ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
