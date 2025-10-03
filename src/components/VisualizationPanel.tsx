import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calculator, Brain, Target, FileText, Play, Download } from 'lucide-react'
import { FRMData } from '@/data/schema'

interface VisualizationPanelProps {
  data: FRMData
}

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({ data }) => {
  const renderEquations = () => {
    if (!data.modeling?.equations || data.modeling.equations.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500">
          No equations defined yet
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {data.modeling.equations.map((equation, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800"
          >
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="font-mono">
                {equation.id}
              </Badge>
              {equation.mechanism_link && (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {equation.mechanism_link}
                </span>
              )}
            </div>
            <div className="font-mono text-lg text-center">
              <span className="text-blue-600">{equation.lhs}</span>
              <span className="mx-4">=</span>
              <span className="text-green-600">{equation.rhs}</span>
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  const renderVariables = () => {
    if (!data.modeling?.variables || data.modeling.variables.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500">
          No variables defined yet
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.modeling.variables.map((variable, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800"
          >
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="font-mono">
                {variable.symbol}
              </Badge>
              <Badge variant="secondary">
                {variable.role}
              </Badge>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              {variable.description}
            </div>
            {variable.units && (
              <div className="text-xs text-slate-500">
                Units: {variable.units}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    )
  }

  const renderMethods = () => {
    if (!data.method_selection?.chosen_methods || data.method_selection.chosen_methods.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500">
          No methods selected yet
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {data.method_selection.chosen_methods.map((method, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800"
          >
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">
                {method.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
              <div className="text-xs text-slate-500">
                abs_tol: {method.tolerances?.abs_tol || 'N/A'}, 
                rel_tol: {method.tolerances?.rel_tol || 'N/A'}
              </div>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {method.justification}
            </div>
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Model Visualization
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Interactive visualization of your mathematical model
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center space-x-4"
        >
          <Button className="btn-gradient">
            <Play className="h-4 w-4 mr-2" />
            Run Simulation
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </motion.div>

        {/* Model Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Model Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {data.modeling?.equations?.length || 0}
                  </div>
                  <div className="text-sm text-slate-600">Equations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {data.modeling?.variables?.length || 0}
                  </div>
                  <div className="text-sm text-slate-600">Variables</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {data.method_selection?.chosen_methods?.length || 0}
                  </div>
                  <div className="text-sm text-slate-600">Methods</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Equations */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Model Equations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderEquations()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Variables */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Model Variables</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderVariables()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Methods */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Solution Methods</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderMethods()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Problem Summary */}
        {data.input?.problem_summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Problem Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-400">
                  {data.input.problem_summary}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
