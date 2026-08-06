import { beforeEach, describe, expect, it } from 'vitest'
import {
  WORKSPACE_CACHE_KEY,
  WORKSPACE_SECTIONS,
  clearLastWorkspaceId,
  getCachedWorkspace,
  getLastWorkspaceId,
  putCachedWorkspace,
  readJsonCache,
  removeWorkspaceCache,
  setLastWorkspaceId,
  writeJsonCache
} from './workspaceStorage'

describe('workspaceStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reads/writes JSON cache with fallback', () => {
    expect(readJsonCache('missing', [])).toEqual([])
    writeJsonCache('k1', { a: 1 })
    expect(readJsonCache('k1', {})).toEqual({ a: 1 })
  })

  it('returns fallback on corrupt JSON', () => {
    localStorage.setItem('bad', '{not-json')
    expect(readJsonCache('bad', { ok: true })).toEqual({ ok: true })
  })

  it('caches and removes workspaces by id', () => {
    putCachedWorkspace({ _id: 'w1', name: 'Alpha' })
    expect(getCachedWorkspace('w1')).toEqual({ _id: 'w1', name: 'Alpha' })
    removeWorkspaceCache('w1')
    expect(getCachedWorkspace('w1')).toBeNull()
    expect(readJsonCache(WORKSPACE_CACHE_KEY, {})).toEqual({})
  })

  it('ignores put without _id', () => {
    putCachedWorkspace({ name: 'NoId' })
    expect(readJsonCache(WORKSPACE_CACHE_KEY, {})).toEqual({})
  })

  it('manages last workspace pointer', () => {
    setLastWorkspaceId('w9')
    expect(getLastWorkspaceId()).toBe('w9')
    clearLastWorkspaceId('other')
    expect(getLastWorkspaceId()).toBe('w9')
    clearLastWorkspaceId('w9')
    expect(getLastWorkspaceId()).toBeNull()
  })

  it('includes expected workspace sections', () => {
    expect(WORKSPACE_SECTIONS.has('documents')).toBe(true)
    expect(WORKSPACE_SECTIONS.has('meetings')).toBe(true)
    expect(WORKSPACE_SECTIONS.has('not-a-section')).toBe(false)
  })
})
