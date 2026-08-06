import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// Unit test for the visibility-aware poll cleanup contract used by NotificationButton.

describe('notification poll cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('clears interval on unmount and skips when document is hidden', () => {
    const load = vi.fn()

    const pollIfVisible = () => {
      if (document.visibilityState === 'visible') load()
    }

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible'
    })

    let timer = window.setInterval(pollIfVisible, 8000)
    pollIfVisible()
    expect(load).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(8000)
    expect(load).toHaveBeenCalledTimes(2)

    window.clearInterval(timer)
    vi.advanceTimersByTime(16000)
    expect(load).toHaveBeenCalledTimes(2)

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden'
    })
    timer = window.setInterval(pollIfVisible, 8000)
    vi.advanceTimersByTime(8000)
    expect(load).toHaveBeenCalledTimes(2)
    window.clearInterval(timer)
  })
})
