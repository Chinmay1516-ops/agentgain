import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePreference = 'day' | 'auto' | 'night'
const themeKey = 'agentgain.theme'
const ThemeContext = createContext<{ preference: ThemePreference; setPreference: (value: ThemePreference) => void } | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try { const saved = localStorage.getItem(themeKey); return saved === 'day' || saved === 'night' ? saved : 'auto' } catch { return 'auto' }
  })
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { document.documentElement.dataset.theme = preference === 'auto' ? (media.matches ? 'night' : 'day') : preference }
    apply()
    try { localStorage.setItem(themeKey, preference) } catch { /* Preference remains usable without storage. */ }
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [preference])
  return <ThemeContext value={{ preference, setPreference }}>{children}</ThemeContext>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme requires ThemeProvider')
  return context
}
