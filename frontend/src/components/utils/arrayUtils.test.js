import { describe, expect, it, vi, afterEach } from 'vitest'
import { ensureArray } from './arrayUtils'

describe('ensureArray', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns arrays as-is', () => {
    const arr = [1, 2]
    expect(ensureArray(arr)).toBe(arr)
  })

  it('returns empty array for null/undefined', () => {
    expect(ensureArray(null)).toEqual([])
    expect(ensureArray(undefined)).toEqual([])
  })

  it('parses JSON array strings', () => {
    expect(ensureArray('[1,2,3]')).toEqual([1, 2, 3])
  })

  it('returns empty array and warns for non-array values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(ensureArray({ a: 1 })).toEqual([])
    expect(ensureArray('not-json')).toEqual([])
    expect(warn).toHaveBeenCalled()
  })
})
