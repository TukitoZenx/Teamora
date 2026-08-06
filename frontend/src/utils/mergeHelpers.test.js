import { describe, expect, it } from 'vitest'
import { isAvatarFileTooLarge, MAX_AVATAR_FILE_BYTES, mergeCommentsPayload, mergeFilesPayload } from './mergeHelpers'

describe('mergeFilesPayload (files-v1)', () => {
  it('keeps concurrent creates of different files', () => {
    const a = {
      files: [{ id: 'a', name: 'A', updatedAt: '2026-01-01T00:00:00.000Z' }],
      removed: {}
    }
    const b = {
      files: [{ id: 'b', name: 'B', updatedAt: '2026-01-01T00:00:01.000Z' }],
      removed: {}
    }
    const merged = mergeFilesPayload(a, b)
    expect(merged.files).toHaveLength(2)
    expect(merged.files.map((f) => f.id).sort()).toEqual(['a', 'b'])
  })

  it('applies tombstones unless resurrected with newer updatedAt', () => {
    const existing = {
      files: [{ id: 'x', name: 'X', updatedAt: '2026-01-01T00:00:00.000Z' }],
      removed: {}
    }
    const deleted = mergeFilesPayload(existing, {
      files: [],
      removed: { x: '2026-01-02T00:00:00.000Z' }
    })
    expect(deleted.files).toHaveLength(0)

    const resurrected = mergeFilesPayload(deleted, {
      files: [{ id: 'x', name: 'Back', updatedAt: '2026-01-03T00:00:00.000Z' }],
      removed: {}
    })
    expect(resurrected.files).toHaveLength(1)
    expect(resurrected.files[0].name).toBe('Back')
  })
})

describe('mergeCommentsPayload (comments-v1)', () => {
  it('merges concurrent comment creates', () => {
    const a = {
      comments: [{ id: 'c1', text: 'Hi', createdAt: '2026-01-01T00:00:00.000Z' }],
      removed: {}
    }
    const b = {
      comments: [{ id: 'c2', text: 'Yo', createdAt: '2026-01-01T00:00:01.000Z' }],
      removed: {}
    }
    const merged = mergeCommentsPayload(a, b)
    expect(merged.comments).toHaveLength(2)
  })
})

describe('avatar size guard', () => {
  it(`rejects files over ${MAX_AVATAR_FILE_BYTES} bytes`, () => {
    expect(isAvatarFileTooLarge({ size: MAX_AVATAR_FILE_BYTES + 1 })).toBe(true)
    expect(isAvatarFileTooLarge({ size: MAX_AVATAR_FILE_BYTES })).toBe(false)
    expect(isAvatarFileTooLarge({ size: 10_000 })).toBe(false)
    expect(isAvatarFileTooLarge(null)).toBe(true)
  })
})
