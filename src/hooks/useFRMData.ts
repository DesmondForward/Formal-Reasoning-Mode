import { useCallback, useState, useMemo } from 'react'

import { 
  FRMData, 
  createEmptyFRMData,
  createFRMDataWithDefaults,
  updateFRMSection,
  updateFRMArrayItem,
  addFRMArrayItem,
  removeFRMArrayItem,
  validateFRMDataStructure,
  isFRMData,
  deepMerge,
  type SectionKey,
  type SectionShape,
  type ArrayElement,
  type DeepPartial
} from '@/data/schema'

export const useFRMData = () => {
  const [data, setData] = useState<FRMData>(createEmptyFRMData())

  // Memoized validation state
  const validationState = useMemo(() => {
    return validateFRMDataStructure(data)
  }, [data])

  // Optimized data update with validation
  const updateData = useCallback((partial: DeepPartial<FRMData>) => {
    setData((currentData) => {
      const next = deepMerge(currentData, partial) // Merge with current, not empty
      const validation = validateFRMDataStructure(next)
      
      if (!validation.isValid) {
        console.warn('Data update validation failed:', validation.errors)
      }
      
      return next
    })
  }, [])

  // Optimized section update using schema utilities
  const updateSection = useCallback(
    <K extends SectionKey>(section: K, updates: DeepPartial<SectionShape<K>>) => {
      setData((previous) => updateFRMSection(previous, section, updates))
    },
    []
  )

  // Optimized array item update using schema utilities
  const updateArrayItem = useCallback(
    <K extends SectionKey, A extends keyof SectionShape<K>>(
      section: K,
      arrayKey: A,
      index: number,
      updates: Partial<ArrayElement<SectionShape<K>[A]>>,
    ) => {
      setData((previous) => updateFRMArrayItem(previous, section, arrayKey, index, updates))
    },
    []
  )

  // Optimized array item addition using schema utilities
  const addArrayItem = useCallback(
    <K extends SectionKey, A extends keyof SectionShape<K>>(
      section: K,
      arrayKey: A,
      newItem: ArrayElement<SectionShape<K>[A]>,
    ) => {
      setData((previous) => addFRMArrayItem(previous, section, arrayKey, newItem))
    },
    []
  )

  // Optimized array item removal using schema utilities
  const removeArrayItem = useCallback(
    <K extends SectionKey, A extends keyof SectionShape<K>>(
      section: K,
      arrayKey: A,
      index: number,
    ) => {
      setData((previous) => removeFRMArrayItem(previous, section, arrayKey, index))
    },
    []
  )

  // Reset with validation
  const resetData = useCallback(() => {
    const newData = createEmptyFRMData()
    const validation = validateFRMDataStructure(newData)
    
    if (!validation.isValid) {
      console.warn('Reset data validation failed:', validation.errors)
    }
    
    setData(newData)
  }, [])

  // Set data with validation
  const setDataDirect = useCallback((next: FRMData | unknown) => {
    if (!isFRMData(next)) {
      console.error('Invalid FRMData structure provided to setData')
      return
    }
    
    const validation = validateFRMDataStructure(next)
    if (!validation.isValid) {
      console.warn('Set data validation failed:', validation.errors)
    }
    
    setData(next)
  }, [])

  // Create new data with partial defaults
  const createWithDefaults = useCallback((partial: DeepPartial<FRMData>) => {
    const newData = createFRMDataWithDefaults(partial)
    const validation = validateFRMDataStructure(newData)
    
    if (!validation.isValid) {
      console.warn('Create with defaults validation failed:', validation.errors)
    }
    
    setData(newData)
  }, [])

  return {
    data,
    validationState,
    updateData,
    updateSection,
    updateArrayItem,
    addArrayItem,
    removeArrayItem,
    resetData,
    setData: setDataDirect,
    createWithDefaults,
    isValid: validationState.isValid,
    validationErrors: validationState.errors,
  }
}
