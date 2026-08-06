/**
 * Apply and subscribe to Teamora appearance preferences (theme, density, lang).
 * Preferences live in localStorage key `teamora-appearance`.
 */

const APPEARANCE_KEY = 'teamora-appearance'
const APPEARANCE_EVENT = 'teamora-appearance-changed'

const readPreferences = () => {
  try {
    return JSON.parse(localStorage.getItem(APPEARANCE_KEY) || 'null') || {}
  } catch {
    return {}
  }
}

export const applyAppearance = () => {
  try {
    const preferences = readPreferences()

    const density = preferences?.density || 'Comfortable'
    document.documentElement.dataset.density = String(density).toLowerCase()

    const language = preferences?.language || 'English'
    document.documentElement.lang = language === 'Español' ? 'es' : language === 'Français' ? 'fr' : 'en'

    document.documentElement.dataset.timeZone = preferences?.timeZone || 'UTC'
    document.documentElement.dataset.dateFormat = preferences?.dateFormat || 'MM/DD/YYYY'

    // Theme engine — Light / Dark / System only.
    // Migrate any legacy "High Contrast" preference to Light.
    let theme = preferences?.theme || 'Light'
    if (theme === 'High Contrast') {
      theme = 'Light'
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...preferences, theme: 'Light' }))
    }

    const root = document.documentElement
    root.classList.remove('dark', 'high-contrast')

    if (theme === 'Dark') {
      root.classList.add('dark')
    } else if (theme === 'System') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark')
      }
    }
  } catch {
    // Appearance preferences are optional local UI state.
  }
}

/**
 * Wire storage / settings / system-theme listeners. Returns an unsubscribe fn.
 */
export const subscribeAppearance = () => {
  applyAppearance()

  const onStorage = () => applyAppearance()
  const onCustom = () => applyAppearance()

  window.addEventListener('storage', onStorage)
  window.addEventListener(APPEARANCE_EVENT, onCustom)

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemThemeChange = () => {
    try {
      const preferences = readPreferences()
      if (preferences?.theme === 'System') {
        document.documentElement.classList.toggle('dark', mediaQuery.matches)
      }
    } catch {
      // Ignore errors in system theme detection.
    }
  }
  mediaQuery.addEventListener('change', handleSystemThemeChange)

  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(APPEARANCE_EVENT, onCustom)
    mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }
}
