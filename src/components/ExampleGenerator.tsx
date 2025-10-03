import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Sparkles } from 'lucide-react'
import { DomainSelector } from '@/components/DomainSelector'

interface ExampleGeneratorProps {
  onGenerate: () => void
  onGenerateAI: (domain: string) => void
  isGenerating?: boolean
}

export const ExampleGenerator: React.FC<ExampleGeneratorProps> = ({ onGenerate, onGenerateAI, isGenerating = false }) => {
  const [selectedDomain, setSelectedDomain] = useState<string>('')
  const examples = [
    {
      id: 'seir',
      title: 'SEIR Epidemic Model',
      description: 'Susceptible-Exposed-Infected-Recovered model for disease spread',
      domain: 'medicine',
      equations: 4,
      variables: 4,
      methods: ['ode_solve_rk45', 'symbolic_equilibria']
    },
    {
      id: 'pkpd',
      title: 'PK/PD Two-Compartment Model',
      description: 'Pharmacokinetic/Pharmacodynamic model for drug concentration',
      domain: 'medicine',
      equations: 3,
      variables: 5,
      methods: ['ode_solve_bdf', 'mle']
    },
    {
      id: 'sir',
      title: 'SIR Epidemic Model',
      description: 'Basic epidemic model with susceptible, infected, recovered',
      domain: 'public_health',
      equations: 2,
      variables: 3,
      methods: ['ode_solve_rk45', 'jacobian_stability']
    },
    {
      id: 'mass_action',
      title: 'Mass Action Kinetics',
      description: 'Chemical reaction kinetics with mass action law',
      domain: 'chemistry',
      equations: 3,
      variables: 4,
      methods: ['ode_solve_rk45', 'symbolic_equilibria']
    }
  ]

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Example Problems
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Choose from pre-built examples to get started quickly
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {examples.map((example, index) => (
            <motion.div
              key={example.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{example.title}</CardTitle>
                    <Badge variant="outline">{example.domain}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {example.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {example.equations}
                      </div>
                      <div className="text-xs text-slate-600">Equations</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {example.variables}
                      </div>
                      <div className="text-xs text-slate-600">Variables</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {example.methods.length}
                      </div>
                      <div className="text-xs text-slate-600">Methods</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Methods:</div>
                    <div className="flex flex-wrap gap-1">
                      {example.methods.map((method) => (
                        <Badge key={method} variant="secondary" className="text-xs">
                          {method.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={onGenerate}
                    variant="outline"
                  >
                    Load Example
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center space-x-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <span>AI-Generated Schema</span>
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Generate a custom schema using AI with your chosen domain
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <DomainSelector
                value={selectedDomain}
                onValueChange={setSelectedDomain}
                className="max-w-md mx-auto"
              />
              <Button
                onClick={() => selectedDomain && onGenerateAI(selectedDomain)}
                disabled={!selectedDomain || isGenerating}
                className="w-full max-w-md"
                variant="default"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI Schema
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-4">
                <Brain className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold">Ready to start?</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Choose an example above, generate with AI, or start with a blank problem
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
