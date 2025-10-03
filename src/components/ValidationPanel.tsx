import React from 'react'
import { motion } from 'framer-motion'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

import type { ValidationResult } from '@/hooks/useValidation'

interface ValidationPanelProps {
  validation: ValidationResult
}

const keywordIcon = (keyword: string) => {
  switch (keyword) {
    case 'required':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'type':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    case 'enum':
      return <Info className="h-4 w-4 text-blue-600" />
    default:
      return <XCircle className="h-4 w-4 text-red-600" />
  }
}

const keywordStyle = (keyword: string) => {
  switch (keyword) {
    case 'required':
      return 'bg-red-50 border-red-200 text-red-800'
    case 'type':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    case 'enum':
      return 'bg-blue-50 border-blue-200 text-blue-800'
    default:
      return 'bg-red-50 border-red-200 text-red-800'
  }
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ validation }) => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Schema Validation</h1>
          <p className="text-slate-600 dark:text-slate-400">Real-time validation of your Formal Reasoning Mode definition.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className={validation.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {validation.isValid ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <span>Validation Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Badge variant={validation.isValid ? 'default' : 'destructive'} className="px-4 py-2 text-lg">
                  {validation.isValid ? 'Valid' : 'Invalid'}
                </Badge>
                <div className="text-sm text-slate-600">
                  {validation.errors.length} error(s), {validation.warnings.length} warning(s)
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {validation.errors.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span>Validation Errors</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {validation.errors.map((error, index) => (
                  <motion.div
                    key={`${error.instancePath}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-lg border p-4 ${keywordStyle(error.keyword)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {keywordIcon(error.keyword)}
                      <div className="flex-1">
                        <div className="font-medium">
                          {error.instancePath ? `Field: ${error.instancePath}` : 'Schema'}
                        </div>
                        <div className="text-sm">{error.message}</div>
                        {Object.keys(error.params).length > 0 && (
                          <div className="mt-2 text-xs opacity-80">
                            Details: {JSON.stringify(error.params)}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {validation.warnings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-yellow-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Warnings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {validation.warnings.map((warning, index) => (
                  <motion.div
                    key={`${warning}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800"
                  >
                    {warning}
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-3">
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {validation.isValid ? 'Pass' : 'Fail'}
                  </div>
                  <div className="text-sm text-slate-600">Overall Status</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{validation.errors.length}</div>
                  <div className="text-sm text-slate-600">Errors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{validation.warnings.length}</div>
                  <div className="text-sm text-slate-600">Warnings</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
