import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, RefreshCw } from 'lucide-react'

export interface DomainOption {
  value: string
  label: string
  description: string
}

const DOMAIN_OPTIONS: DomainOption[] = [
  {
    value: 'artificial_intelligence',
    label: 'Artificial Intelligence',
    description: 'AI/ML models, neural networks, and intelligent systems'
  },
  {
    value: 'astrophysics',
    label: 'Astrophysics',
    description: 'Celestial mechanics, stellar dynamics, and cosmic phenomena'
  },
  {
    value: 'autonomous_systems',
    label: 'Autonomous Systems',
    description: 'Robotics, autonomous vehicles, and self-governing systems'
  },
  {
    value: 'biology',
    label: 'Biology',
    description: 'Biological systems and processes'
  },
  {
    value: 'chemical_engineering',
    label: 'Chemical Engineering',
    description: 'Process design, reactor engineering, and chemical systems'
  },
  {
    value: 'chemistry',
    label: 'Chemistry',
    description: 'Chemical reactions and processes'
  },
  {
    value: 'climate_science',
    label: 'Climate Science',
    description: 'Climate modeling, carbon dynamics, and environmental systems'
  },
  {
    value: 'computational_finance',
    label: 'Computational Finance',
    description: 'Financial modeling, risk analysis, and algorithmic trading'
  },
  {
    value: 'cybersecurity',
    label: 'Cybersecurity',
    description: 'Security protocols, cryptography, and threat modeling'
  },
  {
    value: 'data_science',
    label: 'Data Science',
    description: 'Big data, statistical modeling, and predictive analytics'
  },
  {
    value: 'economics',
    label: 'Economics',
    description: 'Economic models and financial systems'
  },
  {
    value: 'energy_systems',
    label: 'Energy Systems',
    description: 'Power generation, distribution, and energy optimization'
  },
  {
    value: 'engineering',
    label: 'Engineering',
    description: 'Engineering systems and optimization'
  },
  {
    value: 'fluid_dynamics',
    label: 'Fluid Dynamics',
    description: 'Fluid flow, turbulence, and hydrodynamic systems'
  },
  {
    value: 'fluid_mechanics',
    label: 'Fluid Mechanics',
    description: 'Fluid behavior, flow analysis, and mechanical systems'
  },
  {
    value: 'general',
    label: 'General',
    description: 'General mathematical problems'
  },
  {
    value: 'geosciences',
    label: 'Geosciences',
    description: 'Earth sciences, geology, and geophysical processes'
  },
  {
    value: 'materials_science',
    label: 'Materials Science',
    description: 'Advanced materials, nanotechnology, and material properties'
  },
  {
    value: 'medicine',
    label: 'Medicine',
    description: 'Medical & Healthcare problems'
  },
  {
    value: 'neuroscience',
    label: 'Neuroscience',
    description: 'Neural networks, brain function, and cognitive systems'
  },
  {
    value: 'network_science',
    label: 'Network Science',
    description: 'Complex networks, graph theory, and connectivity analysis'
  },
  {
    value: 'public_health',
    label: 'Public Health',
    description: 'Population health and epidemiology'
  },
  {
    value: 'quantum_computing',
    label: 'Quantum Computing',
    description: 'Quantum algorithms, quantum mechanics, and quantum systems'
  },
  {
    value: 'renewable_energy',
    label: 'Renewable Energy',
    description: 'Solar, wind, and sustainable energy systems'
  },
  {
    value: 'robotics',
    label: 'Robotics',
    description: 'Robot control, motion planning, and autonomous systems'
  },
  {
    value: 'signal_processing',
    label: 'Signal Processing',
    description: 'Digital signal analysis, filtering, and communication systems'
  },
  {
    value: 'social_science',
    label: 'Social Science',
    description: 'Human behavior, social systems, and societal dynamics'
  },
  {
    value: 'space_technology',
    label: 'Space Technology',
    description: 'Space exploration, satellite systems, and aerospace engineering'
  },
  {
    value: 'synthetic_biology',
    label: 'Synthetic Biology',
    description: 'Engineered biological systems and synthetic organisms'
  },
  {
    value: 'systems_biology',
    label: 'Systems Biology',
    description: 'Biological networks, metabolic pathways, and cellular systems'
  }
]

interface DomainSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  subDomainValue?: string
  onSubDomainChange: (value: string) => void
  onGenerateSchema?: () => void
  isGenerating?: boolean
  className?: string
}

export const DomainSelector: React.FC<DomainSelectorProps> = ({
  value,
  onValueChange,
  subDomainValue,
  onSubDomainChange,
  onGenerateSchema,
  isGenerating = false,
  className
}) => {
  const selectedDomain = DOMAIN_OPTIONS.find(option => option.value === value)

  return (
    <Card className={`w-full max-w-4xl ${className || ''}`}>
      <CardContent className="p-6 space-y-6">
        {/* Domain Selection and Sub-domain Description - Horizontal Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Domain Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="domain-select" className="text-base font-semibold text-foreground">
                Problem Domain
              </Label>
              {value && (
                <Badge variant="secondary" className="text-xs">
                  {selectedDomain?.label}
                </Badge>
              )}
            </div>
            
            <Select value={value} onValueChange={onValueChange}>
              <SelectTrigger 
                id="domain-select" 
                className="w-full h-12 text-base border-2 hover:border-primary/50 focus:border-primary transition-colors"
              >
                <SelectValue placeholder="Choose a domain for your problem..." />
              </SelectTrigger>
            <SelectContent className="max-h-80">
              {DOMAIN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-3">
                  <span className="font-semibold text-foreground">{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
            </Select>

            {/* Generate Schema Button - positioned beneath the dropdown */}
            {value && onGenerateSchema && (
              <div className="pt-2">
                <Button
                  onClick={onGenerateSchema}
                  disabled={isGenerating}
                  className="w-full h-10"
                  variant="default"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate Schema
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Sub-domain Description */}
          {value && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center space-x-2">
                <Label htmlFor="subdomain-input" className="text-base font-semibold text-foreground">
                  Sub-domain Description
                </Label>
                <Badge variant="outline" className="text-xs">
                  Optional
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Input
                  id="subdomain-input"
                  placeholder="e.g., machine learning, structural analysis, drug discovery..."
                  value={subDomainValue || ''}
                  onChange={(e) => onSubDomainChange(e.target.value)}
                  className="h-12 text-base border-2 hover:border-primary/50 focus:border-primary transition-colors"
                />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Provide a brief description to further specify the problem area within{' '}
                  <span className="font-medium text-foreground">{selectedDomain?.label}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Selected Domain Info */}
        {value && selectedDomain && (
          <div className="p-4 bg-muted/50 rounded-lg border border-border/50 animate-fade-in">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground">{selectedDomain.label}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedDomain.description}
                </p>
                {subDomainValue && (
                  <div className="pt-2">
                    <p className="text-sm font-medium text-foreground">Sub-domain:</p>
                    <p className="text-sm text-muted-foreground italic">"{subDomainValue}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { DOMAIN_OPTIONS }
