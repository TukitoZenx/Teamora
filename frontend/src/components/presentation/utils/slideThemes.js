/**
 * Presentation design themes that follow the app light/dark mode.
 */

export const SLIDE_THEME_PRESETS = {
  default: {
    id: 'default',
    label: 'Clean',
    light: { gradient: 'from-white to-slate-50', accent: 'from-primary to-indigo-500' },
    dark: { gradient: 'from-slate-900 to-slate-950', accent: 'from-primary to-indigo-400' }
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    light: { gradient: 'from-blue-50 to-cyan-50', accent: 'from-blue-500 to-cyan-500' },
    dark: { gradient: 'from-blue-950 to-cyan-950', accent: 'from-blue-400 to-cyan-400' }
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    light: { gradient: 'from-rose-50 to-amber-50', accent: 'from-rose-500 to-amber-500' },
    dark: { gradient: 'from-rose-950 to-amber-950', accent: 'from-rose-400 to-amber-400' }
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    light: { gradient: 'from-emerald-50 to-teal-50', accent: 'from-emerald-500 to-teal-500' },
    dark: { gradient: 'from-emerald-950 to-teal-950', accent: 'from-emerald-400 to-teal-400' }
  },
  cosmos: {
    id: 'cosmos',
    label: 'Cosmos',
    light: { gradient: 'from-violet-50 to-indigo-50', accent: 'from-violet-500 to-indigo-500' },
    dark: { gradient: 'from-violet-950 to-indigo-950', accent: 'from-violet-400 to-indigo-400' }
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    light: { gradient: 'from-slate-800 to-slate-950', accent: 'from-slate-400 to-slate-200' },
    dark: { gradient: 'from-slate-900 to-black', accent: 'from-slate-300 to-slate-100' }
  }
}

export function isAppDarkMode() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

/** Resolve a theme id (+ optional stored object) into gradient/accent for current mode. */
export function resolveSlideTheme(themeId = 'default', isDark = isAppDarkMode()) {
  const preset = SLIDE_THEME_PRESETS[themeId] || SLIDE_THEME_PRESETS.default
  const mode = isDark ? preset.dark : preset.light
  return {
    id: preset.id,
    label: preset.label,
    gradient: mode.gradient,
    accent: mode.accent,
    isDark
  }
}

/** Theme cards for the Design ribbon (preview uses light + dark classes). */
export function listThemeCards() {
  return Object.values(SLIDE_THEME_PRESETS).map((p) => ({
    id: p.id,
    label: p.label,
    gradient: p.light.gradient,
    darkGradient: p.dark.gradient,
    accent: p.light.accent
  }))
}

/** Default text/fill colors for new objects under current app theme. */
export function defaultObjectColors(isDark = isAppDarkMode()) {
  return {
    color: isDark ? '#f1f5f9' : '#000000',
    shapeFill: isDark ? '#334155' : '#e2e8f0',
    shapeBorder: isDark ? '#64748b' : '#94a3b8',
    shapeText: isDark ? '#f8fafc' : '#1e293b'
  }
}
