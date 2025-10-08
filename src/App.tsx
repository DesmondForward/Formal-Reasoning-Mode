import React, { useState, useEffect, Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Brain, 
  Calculator, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  FileText,
  Activity,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react'

// Lazy load heavy components
const SchemaEditor = lazy(() => import('@/components/SchemaEditor').then(module => ({ default: module.SchemaEditor })))
const ValidationPanel = lazy(() => import('@/components/ValidationPanel').then(module => ({ default: module.ValidationPanel })))
const VisualizationPanel = lazy(() => import('@/components/VisualizationPanel').then(module => ({ default: module.VisualizationPanel })))
const CommunicationLogPanel = lazy(() => import('@/components/CommunicationLogPanel').then(module => ({ default: module.default })))

import { StatusBar } from '@/components/StatusBar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { DomainSelector } from '@/components/DomainSelector'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useFRMData } from '@/hooks/useFRMData'
import { useValidation } from '@/hooks/useValidation'
import { useTheme } from '@/hooks/useTheme'
import { useCommunication } from '@/hooks/useCommunication'
import frmSchema from '/frm_schema.json'
import { generateSchemaProblem } from '@/utils/schemaGenerator'

import './App.css'

const App: React.FC = () => {
  console.log('App component rendering...')
  
  try {
    const { data, updateData, setData } = useFRMData()
    console.log('FRM data loaded:', data)
    
    const { validation, validateData, validateUnknown } = useValidation(frmSchema)
    console.log('Validation loaded:', validation)
    
    const { events } = useCommunication()
    console.log('Communication loaded:', { eventsCount: events.length })
    
    const [activeTab, setActiveTab] = useState('editor')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [selectedDomain, setSelectedDomain] = useState<string>('')
    const [subDomainDescription, setSubDomainDescription] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const { theme, toggleTheme } = useTheme()
    
    console.log('App state:', { activeTab, isLoading, theme })

    useEffect(() => {
      console.log('useEffect: validateData called with data:', data)
      const runValidation = async () => {
        try {
          await validateData(data)
        } catch (error) {
          console.error('Error in validateData:', error)
        }
      }
      
      runValidation()
      
      // Simulate loading time to show loading screen
      const timer = setTimeout(() => {
        console.log('useEffect: Setting isLoading to false')
        setIsLoading(false)
      }, 1000)
      
      return () => clearTimeout(timer)
    }, [data, validateData])

    // Show loading screen while app is initializing
    if (isLoading) {
      console.log('App: Rendering loading screen')
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
            <span className="text-lg text-slate-700 dark:text-slate-300">Loading FRM Desktop...</span>
          </div>
        </div>
      )
    }

    console.log('App: Rendering main UI')

    const handleGenerateSchema = async (domain?: string, subDomain?: string) => {
      setIsGenerating(true)
      try {
        const options: { domain?: string; scenarioHint?: string } = {}
        if (domain) options.domain = domain
        if (subDomain) options.scenarioHint = subDomain
        
        const { data: candidate, source, errorMessage } = await generateSchemaProblem(options)
        const generationValidation = await validateUnknown(candidate)

        if (generationValidation.isValid && generationValidation.data) {
          setData(generationValidation.data)

          if (source === 'fallback' && errorMessage) {
            const detail = errorMessage
            if (window?.electronAPI?.showMessageBox) {
              await window.electronAPI.showMessageBox({
                type: 'warning',
                title: 'Falling Back to Bundled Schema',
                message: 'AI schema generation was unavailable. Loaded the bundled SEIR schema instead.',
                detail,
              })
            } else {
              window.alert(`AI schema generation unavailable. Using bundled schema. Details: ${detail}`)
            }
          }
        } else {
          console.error('Validation failed:', generationValidation)
          
          let summary = 'Unknown validation failure.'
          if (generationValidation.errors && generationValidation.errors.length > 0) {
            summary = generationValidation.errors
              .map((err) => `${err.instancePath || '/'}: ${err.message}`)
              .join('\n')
          } else if (generationValidation.warnings && generationValidation.warnings.length > 0) {
            summary = 'Validation warnings:\n' + generationValidation.warnings.join('\n')
          } else {
            summary = 'Schema validation failed but no specific errors were captured. Check console for details.'
          }
          
          const prefix =
            source === 'ai'
              ? 'The AI-generated schema did not pass schema validation.'
              : 'The bundled fallback schema did not pass schema validation.'

          if (window?.electronAPI?.showMessageBox) {
            await window.electronAPI.showMessageBox({
              type: 'error',
              title: 'Schema Validation Failed',
              message: prefix,
              detail: summary,
            })
          } else {
            window.alert(`${prefix}\n\n${summary}`)
          }
        }
      } catch (error) {
        console.error('Failed to generate schema:', error)
        const message = error instanceof Error ? error.message : 'Unknown error generating schema.'

        if (window?.electronAPI?.showMessageBox) {
          await window.electronAPI.showMessageBox({
            type: 'error',
            title: 'Schema Generation Error',
            message,
          })
        } else {
          window.alert(message)
        }
      } finally {
        setIsGenerating(false)
      }
    }

    const handleExport = async () => {
      setIsExporting(true)
      try {
        const dataStr = JSON.stringify(data, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        
        // Use Problem ID as filename, with fallback to default name
        const problemId = data.metadata?.problem_id
        const filename = problemId && problemId !== 'draft-problem' 
          ? `${problemId}.json` 
          : 'frm-problem.json'
        
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Export failed:', error)
        if (window?.electronAPI?.showMessageBox) {
          await window.electronAPI.showMessageBox({
            type: 'error',
            title: 'Export Failed',
            message: 'Failed to export the problem data.',
            detail: error instanceof Error ? error.message : 'Unknown error',
          })
        } else {
          alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } finally {
        setIsExporting(false)
      }
    }

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      setIsImporting(true)
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const raw = e.target?.result
          if (typeof raw !== 'string') {
            throw new Error('Unsupported file encoding')
          }

          const parsed = JSON.parse(raw)
          const result = await validateUnknown(parsed)

          if (result.isValid && 'data' in result && result.data) {
            setData(result.data)
          } else {
            const message = 'Imported file does not comply with the Formal Reasoning Mode schema.'
            console.error(message, result.errors)
            if (window?.electronAPI?.showMessageBox) {
              await window.electronAPI.showMessageBox({
                type: 'error',
                title: 'Validation Failed',
                message,
                detail: result.errors
                  .map((err) => `${err.instancePath || '/'}: ${err.message}`)
                  .join('\n'),
              })
            } else {
              window.alert(message)
            }
          }
        } catch (error) {
          console.error('Failed to import file:', error)
          const message = error instanceof Error ? error.message : 'Unknown error occurred while importing file'
          
          if (window?.electronAPI?.showMessageBox) {
            await window.electronAPI.showMessageBox({
              type: 'error',
              title: 'Import Error',
              message: 'Failed to import file',
              detail: message,
            })
          } else {
            window.alert(`Import failed: ${message}`)
          }
        } finally {
          setIsImporting(false)
        }
      }
      reader.readAsText(file)
      event.target.value = ''
    }

    return (
      <ErrorBoundary>
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pb-20 sm:pb-24">
        {/* Header */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80"
        >
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    FRM Desktop
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Formal Reasoning Mode
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="ml-4">
                v1.0.0
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('import-file')?.click()}
                disabled={isImporting}
              >
                {isImporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>

              <Separator orientation="vertical" className="h-6" />
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </div>
        </motion.header>

        {/* Domain Selector - Centered above main content */}
        <div className="flex justify-center px-6 py-4 bg-white/30 backdrop-blur-sm dark:bg-slate-900/30 border-b">
          <DomainSelector
            value={selectedDomain}
            onValueChange={setSelectedDomain}
            subDomainValue={subDomainDescription}
            onSubDomainChange={setSubDomainDescription}
            onGenerateSchema={() => handleGenerateSchema(selectedDomain || undefined, subDomainDescription || undefined)}
            isGenerating={isGenerating}
          />
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <motion.aside 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-[19rem] flex-shrink-0 overflow-y-auto border-r bg-white/50 backdrop-blur-sm dark:bg-slate-900/50"
          >
            <div className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Problem Overview
              </h2>
              
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Metadata</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Domain:</span>
                      <Badge variant="outline" className="ml-2">
                        {data.metadata?.domain || 'Not set'}
                      </Badge>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Version:</span>
                      <span className="ml-2 font-mono">{data.metadata?.version || 'v1.0'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Calculator className="h-4 w-4" />
                      <span>Model Class</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary" className="text-xs">
                      {data.modeling?.model_class || 'Not selected'}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      {validation.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>Validation</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Valid:</span>
                        <span className={validation.isValid ? 'text-green-600' : 'text-red-600'}>
                          {validation.isValid ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {validation.errors.length > 0 && (
                        <div className="text-red-600">
                          {validation.errors.length} error(s)
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.aside>

          {/* Main Panel */}
          <div className="flex-1 flex min-h-0">
            {/* Main Content - Schema Editor Tabs */}
            <div className="flex-1 flex flex-col min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="border-b bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
                  <TabsList className="h-12 px-6">
                    <TabsTrigger value="editor" className="flex items-center space-x-2">
                      <Settings className="h-4 w-4" />
                      <span>Schema Editor</span>
                    </TabsTrigger>
                    <TabsTrigger value="validation" className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Validation</span>
                    </TabsTrigger>
                    <TabsTrigger value="visualization" className="flex items-center space-x-2">
                      <Calculator className="h-4 w-4" />
                      <span>Visualization</span>
                    </TabsTrigger>
                    <TabsTrigger value="communication" className="flex items-center space-x-2">
                      <div className="relative" aria-hidden="true">
                        <Activity className="h-4 w-4" />
                        {events.length > 0 && (
                          <motion.div
                            className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            aria-label="Activity indicator"
                          />
                        )}
                      </div>
                      <span>Communication</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="editor" className="h-full m-0">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-full">
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Loading Editor...</span>
                        </div>
                      </div>
                    }>
                      <SchemaEditor data={data} onUpdate={updateData} />
                    </Suspense>
                  </TabsContent>
                  
                  <TabsContent value="validation" className="h-full m-0">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-full">
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Loading Validation Panel...</span>
                        </div>
                      </div>
                    }>
                      <ValidationPanel validation={validation} />
                    </Suspense>
                  </TabsContent>
                  
                  <TabsContent value="visualization" className="h-full m-0">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-full">
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Loading Visualization...</span>
                        </div>
                      </div>
                    }>
                      <VisualizationPanel data={data} />
                    </Suspense>
                  </TabsContent>
                  
                  <TabsContent value="communication" className="h-full m-0">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-full">
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Loading Communication Panel...</span>
                        </div>
                      </div>
                    }>
                      <CommunicationLogPanel />
                    </Suspense>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <StatusBar validation={validation} />
        </div>
      </ErrorBoundary>
    )
  } catch (error) {
    console.error('Error in App component:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error Loading App
          </h1>
          <p className="text-red-600 dark:text-red-400 mb-4">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
          <button 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }
}

export default App