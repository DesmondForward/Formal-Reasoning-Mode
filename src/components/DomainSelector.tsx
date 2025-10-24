import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, RefreshCw, Clock } from 'lucide-react'

import { DOMAIN_CHOICES, type DomainChoice } from '@/data/domainMetadata'
import { useGenerationTimer, formatElapsedTime } from '@/hooks/useGenerationTimer'

interface DomainSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  subDomainValue?: string
  onSubDomainChange: (value: string) => void
  onGenerateSchema?: () => void
  isGenerating?: boolean
  className?: string
  onTimerStart?: () => void
  onTimerStop?: () => void
}

export const DomainSelector: React.FC<DomainSelectorProps> = ({
  value,
  onValueChange,
  subDomainValue,
  onSubDomainChange,
  onGenerateSchema,
  isGenerating = false,
  className,
  onTimerStart,
  onTimerStop,
}) => {
  const selectedDomain = DOMAIN_CHOICES.find((option) => option.value === value)
  const { isRunning, elapsedTime, startTimer, stopTimer, resetTimer } = useGenerationTimer()

  const handleGenerateClick = () => {
    if (isGenerating) return
    
    startTimer()
    onTimerStart?.()
    onGenerateSchema?.()
  }

  // Stop timer when generation completes
  React.useEffect(() => {
    if (!isGenerating && isRunning) {
      stopTimer()
      onTimerStop?.()
    }
  }, [isGenerating, isRunning, stopTimer, onTimerStop])

  // Reset timer when starting new generation
  React.useEffect(() => {
    if (isGenerating && !isRunning) {
      resetTimer()
    }
  }, [isGenerating, isRunning, resetTimer])

  return (
    <Card className={`w-full max-w-4xl ${className || ''}`}>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                {DOMAIN_CHOICES.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="py-3">
                    <span className="font-semibold text-foreground">{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {value && onGenerateSchema && (
              <div className="pt-2">
                <Button
                  onClick={handleGenerateClick}
                  disabled={isGenerating}
                  className="w-full h-10"
                  variant="default"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                      {isRunning && (
                        <span className="ml-2 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatElapsedTime(elapsedTime)}
                        </span>
                      )}
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
                  placeholder="e.g., machine learning, drug discovery, etc."
                  value={subDomainValue || ''}
                  onChange={(event) => onSubDomainChange(event.target.value)}
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

export { DOMAIN_CHOICES, DOMAIN_CHOICES as DOMAIN_OPTIONS }
