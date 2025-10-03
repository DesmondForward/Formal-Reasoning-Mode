import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'frm-theme'

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches

  return prefersDark ? 'dark' : 'light'
}

const applyThemeClass = (theme: Theme) => {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement

  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const initialTheme = getInitialTheme()
    applyThemeClass(initialTheme)
    return initialTheme
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    applyThemeClass(theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return {
    theme,
    setTheme,
    toggleTheme,
  }
}
