import { useTheme, type ThemePreference } from '../../hooks/useTheme'

export function ThemeSelector() {
  const { preference, setPreference } = useTheme()
  return <fieldset className="theme-selector"><legend className="sr-only">Color theme</legend>
    {(['day', 'auto', 'night'] as ThemePreference[]).map(theme => <label key={theme} className={preference === theme ? 'is-selected' : ''}>
      <input type="radio" name="theme" value={theme} checked={preference === theme} onChange={() => setPreference(theme)} />
      <span>{theme[0].toUpperCase() + theme.slice(1)}</span>
    </label>)}
  </fieldset>
}
