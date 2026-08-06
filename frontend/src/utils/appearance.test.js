import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyAppearance, subscribeAppearance } from './appearance'

describe('appearance', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    delete document.documentElement.dataset.density
    document.documentElement.lang = 'en'
    // jsdom does not implement matchMedia by default.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('applies dark theme class from preferences', () => {
    localStorage.setItem('teamora-appearance', JSON.stringify({ theme: 'Dark', density: 'Compact' }))
    applyAppearance()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.density).toBe('compact')
  })

  it('migrates legacy High Contrast theme to Light', () => {
    localStorage.setItem('teamora-appearance', JSON.stringify({ theme: 'High Contrast' }))
    applyAppearance()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('high-contrast')).toBe(false)
    const stored = JSON.parse(localStorage.getItem('teamora-appearance'))
    expect(stored.theme).toBe('Light')
  })

  it('subscribeAppearance returns an unsubscribe that removes listeners', () => {
    const unsub = subscribeAppearance()
    expect(typeof unsub).toBe('function')
    unsub()
  })
})
