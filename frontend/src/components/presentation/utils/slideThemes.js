/**
 * Presentation design themes are independent of the app Light/Dark chrome.
 * Each design id has one fixed look so switching window theme does not
 * restyle existing slides.
 */

export const SLIDE_THEME_PRESETS = {
  default: {
    id: 'default',
    label: 'Clean',
    // Fixed light slide design (does not flip with app theme)
    gradient: 'from-white to-slate-50',
    accent: 'from-primary to-indigo-500',
    isDark: false
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    gradient: 'from-blue-50 to-cyan-50',
    accent: 'from-blue-500 to-cyan-500',
    isDark: false
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    gradient: 'from-rose-50 to-amber-50',
    accent: 'from-rose-500 to-amber-500',
    isDark: false
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    gradient: 'from-emerald-50 to-teal-50',
    accent: 'from-emerald-500 to-teal-500',
    isDark: false
  },
  cosmos: {
    id: 'cosmos',
    label: 'Cosmos',
    gradient: 'from-violet-50 to-indigo-50',
    accent: 'from-violet-500 to-indigo-500',
    isDark: false
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    // Explicit dark slide design — only applied when user picks this theme
    gradient: 'from-slate-900 to-slate-950',
    accent: 'from-slate-300 to-slate-100',
    isDark: true
  }
}

/** @deprecated App chrome mode must not drive slide design. Kept for callers. */
export function isAppDarkMode() {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

/**
 * Resolve a presentation design id into fixed gradient/accent colors.
 * Ignores app light/dark — only the design id controls appearance.
 */
export function resolveSlideTheme(themeId = 'default') {
  const preset = SLIDE_THEME_PRESETS[themeId] || SLIDE_THEME_PRESETS.default
  return {
    id: preset.id,
    label: preset.label,
    gradient: preset.gradient,
    accent: preset.accent,
    isDark: Boolean(preset.isDark)
  }
}

/** Theme cards for the Design ribbon (fixed previews). */
export function listThemeCards() {
  return Object.values(SLIDE_THEME_PRESETS).map((p) => ({
    id: p.id,
    label: p.label,
    gradient: p.gradient,
    accent: p.accent,
    isDark: p.isDark
  }))
}

/**
 * Default text/fill colors for new objects.
 * Uses the active *slide design* (not the app chrome theme).
 */
export function defaultObjectColors(isDarkSlide = false) {
  return {
    color: isDarkSlide ? '#f1f5f9' : '#000000',
    shapeFill: isDarkSlide ? '#334155' : '#e2e8f0',
    shapeBorder: isDarkSlide ? '#64748b' : '#94a3b8',
    shapeText: isDarkSlide ? '#f8fafc' : '#1e293b'
  }
}
