import React, { useState, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ChevronDown, 
  ChevronRight,
  Brain,
  Calculator,
  Target,
  CheckCircle,
  Settings,
  FileText,
  RefreshCw,
  Copy,
  Shield
} from 'lucide-react'

import { FRMData } from '@/data/schema'
import { copyJsonToClipboard } from '@/utils/clipboard'

// Lazy load editor components
const MetadataEditor = lazy(() => import('./editors/MetadataEditor').then(module => ({ default: module.MetadataEditor })))
const InputEditor = lazy(() => import('./editors/InputEditor').then(module => ({ default: module.InputEditor })))
const ModelingEditor = lazy(() => import('./editors/ModelingEditor').then(module => ({ default: module.ModelingEditor })))
const MethodSelectionEditor = lazy(() => import('./editors/MethodSelectionEditor').then(module => ({ default: module.MethodSelectionEditor })))
const SolutionAnalysisEditor = lazy(() => import('./editors/SolutionAnalysisEditor').then(module => ({ default: module.SolutionAnalysisEditor })))
const ValidationEditor = lazy(() => import('./editors/ValidationEditor').then(module => ({ default: module.ValidationEditor })))
const OutputContractEditor = lazy(() => import('./editors/OutputContractEditor').then(module => ({ default: module.OutputContractEditor })))
const NoveltyAssuranceEditor = lazy(() => import('./editors/NoveltyAssuranceEditor').then(module => ({ default: module.NoveltyAssuranceEditor })))

interface SchemaEditorProps {
  data: FRMData
  onUpdate: (data: Partial<FRMData>) => void
}

interface SectionProps {
  title: string
  description: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  validationStatus?: 'valid' | 'invalid' | 'warning'
}

const Section: React.FC<SectionProps> = ({
  title,
  description,
  icon,
  isExpanded,
  onToggle,
  children,
  validationStatus = 'valid'
}) => {
  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader 
        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {icon}
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {validationStatus === 'valid' && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              {validationStatus === 'invalid' && (
                <div className="h-4 w-4 rounded-full bg-red-600" />
              )}
              {validationStatus === 'warning' && (
                <div className="h-4 w-4 rounded-full bg-yellow-600" />
              )}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0">
              {children}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export const SchemaEditor: React.FC<SchemaEditorProps> = ({ data, onUpdate }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['metadata']))
  const [copySuccess, setCopySuccess] = useState(false)

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const handleCopyToClipboard = async () => {
    const result = await copyJsonToClipboard(data, 2)
    if (result.success) {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000) // Reset after 2 seconds
    } else {
      console.error('Failed to copy to clipboard:', result.error)
      // You could show a toast notification here if you have a toast system
    }
  }

  const getValidationStatus = (sectionId: string): 'valid' | 'invalid' | 'warning' => {
    // This would be connected to actual validation logic
    switch (sectionId) {
      case 'metadata':
        return data.metadata?.problem_id ? 'valid' : 'warning'
      case 'input':
        return data.input?.problem_summary ? 'valid' : 'warning'
      case 'modeling':
        return data.modeling?.equations?.length > 0 ? 'valid' : 'warning'
      case 'method_selection':
        return data.method_selection?.chosen_methods?.length > 0 ? 'valid' : 'warning'
      default:
        return 'valid'
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Formal Reasoning Mode Editor
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Build sophisticated mathematical models with equation-first reasoning
              </p>
            </div>
            <Button
              onClick={handleCopyToClipboard}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              <Copy className="h-4 w-4 mr-2" />
              {copySuccess ? 'Copied!' : 'Copy JSON'}
            </Button>
          </div>
        </motion.div>

        <Section
          title="Metadata"
          description="Problem identification and domain information"
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          isExpanded={expandedSections.has('metadata')}
          onToggle={() => toggleSection('metadata')}
          validationStatus={getValidationStatus('metadata')}
        >
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading Editor...</span>
              </div>
            </div>
          }>
            <MetadataEditor
              data={data.metadata}
              onChange={(metadata) => onUpdate({ metadata })}
            />
          </Suspense>
        </Section>

        <Section
          title="Problem Input"
          description="Define the problem scope, known quantities, and unknowns"
          icon={<Brain className="h-5 w-5 text-green-600" />}
          isExpanded={expandedSections.has('input')}
          onToggle={() => toggleSection('input')}
          validationStatus={getValidationStatus('input')}
        >
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading Editor...</span>
              </div>
            </div>
          }>
            <InputEditor
              data={data.input}
              onChange={(input) => onUpdate({ input })}
            />
          </Suspense>
        </Section>

        <Section
          title="Mathematical Modeling"
          description="Define equations, variables, and model structure"
          icon={<Calculator className="h-5 w-5 text-purple-600" />}
          isExpanded={expandedSections.has('modeling')}
          onToggle={() => toggleSection('modeling')}
          validationStatus={getValidationStatus('modeling')}
        >
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading Editor...</span>
              </div>
            </div>
          }>
            <ModelingEditor
              data={data.modeling}
              onChange={(modeling) => onUpdate({ modeling })}
            />
          </Suspense>
        </Section>

        <Section
          title="Method Selection"
          description="Choose appropriate solution methods and algorithms"
          icon={<Target className="h-5 w-5 text-orange-600" />}
          isExpanded={expandedSections.has('method_selection')}
          onToggle={() => toggleSection('method_selection')}
          validationStatus={getValidationStatus('method_selection')}
        >
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading Editor...</span>
              </div>
            </div>
          }>
            <MethodSelectionEditor
              data={data.method_selection}
              onChange={(method_selection) => onUpdate({ method_selection })}
            />
          </Suspense>
        </Section>

        <Section
          title="Solution & Analysis"
          description="Configure solution requests and analysis parameters"
          icon={<Settings className="h-5 w-5 text-indigo-600" />}
          isExpanded={expandedSections.has('solution_and_analysis')}
          onToggle={() => toggleSection('solution_and_analysis')}
          validationStatus="valid"
        >
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading Editor...</span>
              </div>
            </div>
          }>
            <SolutionAnalysisEditor
              data={data.solution_and_analysis}
              onChange={(solution_and_analysis) => onUpdate({ solution_and_analysis })}
            />
          </Suspense>
        </Section>

        <Section
          title="Validation"
          description="Set up validation checks and quality metrics"
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          isExpanded={expandedSections.has('validation')}
          onToggle={() => toggleSection('validation')}
          validationStatus="valid"
        >
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading Editor...</span>
              </div>
            </div>
          }>
            <ValidationEditor
              data={data.validation}
              onChange={(validation) => onUpdate({ validation })}
            />
          </Suspense>
        </Section>

        <Section
          title="Output Contract"
          description="Define output format and required sections"
          icon={<FileText className="h-5 w-5 text-cyan-600" />}
          isExpanded={expandedSections.has('output_contract')}
          onToggle={() => toggleSection('output_contract')}
          validationStatus="valid"
        >
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading Editor...</span>
              </div>
            </div>
          }>
            <OutputContractEditor
              data={data.output_contract}
              onChange={(output_contract) => onUpdate({ output_contract })}
            />
          </Suspense>
        </Section>

        <Section
          title="Novelty Assurance"
          description="Ensure novelty and proper documentation of prior work"
          icon={<Shield className="h-5 w-5 text-amber-600" />}
          isExpanded={expandedSections.has('novelty_assurance')}
          onToggle={() => toggleSection('novelty_assurance')}
          validationStatus="valid"
        >
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading Editor...</span>
              </div>
            </div>
          }>
            <NoveltyAssuranceEditor
              data={data.novelty_assurance}
              onChange={(novelty_assurance) => onUpdate({ novelty_assurance })}
            />
          </Suspense>
        </Section>
      </div>
    </div>
  )
}
