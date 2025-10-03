import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { ValidationResult } from '@/hooks/useValidation'

interface StatusBarProps {
  validation: ValidationResult
}

export const StatusBar: React.FC<StatusBarProps> = ({ validation }) => {
  const getStatusIcon = () => {
    if (validation.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else {
      return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusText = () => {
    if (validation.isValid) {
      return 'Schema Valid'
    } else {
      return `${validation.errors.length} Error(s)`
    }
  }

  const getStatusColor = () => {
    if (validation.isValid) {
      return 'text-green-600'
    } else {
      return 'text-red-600'
    }
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900 px-6 py-2"
    >
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={getStatusColor()}>
              {getStatusText()}
            </span>
          </div>
          
          {validation.warnings.length > 0 && (
            <div className="flex items-center space-x-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{validation.warnings.length} Warning(s)</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4 text-slate-500">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}


