import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import ProfileDropdown from '../features/workspace/components/ProfileDropdown'
import NotificationButton from './ui/NotificationButton'
import TeamoraLogo from './ui/TeamoraLogo'

export default function AppNavbar({ onDashboard }) {
  const [theme, setTheme] = useState(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem('teamora-appearance') || 'null')
      return preferences?.theme || 'Light'
    } catch {
      return 'Light'
    }
  })

  useEffect(() => {
    const handleChanged = () => {
      try {
        const preferences = JSON.parse(localStorage.getItem('teamora-appearance') || 'null')
        setTheme(preferences?.theme || 'Light')
      } catch {
        // Ignore JSON parsing errors.
      }
    }
    window.addEventListener('teamora-appearance-changed', handleChanged)
    return () => window.removeEventListener('teamora-appearance-changed', handleChanged)
  }, [])

  const toggleTheme = () => {
    try {
      const preferences = JSON.parse(localStorage.getItem('teamora-appearance') || 'null') || { theme: 'Light' }
      const currentTheme = preferences.theme || 'Light'
      // Simple Light ↔ Dark. System resolves to whichever is opposite of the
      // current rendered mode so the toggle always flips the visible UI.
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const currentlyDark =
        currentTheme === 'Dark' || currentTheme === 'High Contrast' || (currentTheme === 'System' && systemDark)
      const nextTheme = currentlyDark ? 'Light' : 'Dark'
      const nextPreferences = { ...preferences, theme: nextTheme }
      localStorage.setItem('teamora-appearance', JSON.stringify(nextPreferences))
      window.dispatchEvent(new CustomEvent('teamora-appearance-changed', { detail: nextPreferences }))
    } catch {
      // Ignore setting write errors.
    }
  }

  // Resolve shown theme for styling icon
  const isDarkMode =
    theme === 'Dark' || (theme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <header className="fixed inset-x-0 top-0 z-navbar h-navbar border-b border-border bg-card px-6">
      <div className="flex h-full w-full items-center justify-between">
        <button
          type="button"
          onClick={onDashboard}
          className="flex min-w-0 items-center gap-3 rounded-xl text-left transition duration-normal hover:opacity-80"
          title="Dashboard"
        >
          <TeamoraLogo size="md" />
          <span className="block text-sm font-semibold tracking-tight text-text">Teamora</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition duration-normal hover:bg-primary/10 hover:text-primary"
            aria-label="Toggle theme mode"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <NotificationButton />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}
