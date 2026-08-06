import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from './sanitizeHtml'

describe('sanitizeHtml', () => {
  it('returns empty for nullish/blank', () => {
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml('   ')).toBe('')
  })

  it('strips script tags and event handlers', () => {
    const dirty = '<p onclick="alert(1)">Hi</p><script>alert(2)</script>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toMatch(/script/i)
    expect(clean).not.toMatch(/onclick/i)
    expect(clean).toMatch(/Hi/)
  })

  it('removes javascript: URLs from href/src', () => {
    const dirty = '<a href="javascript:alert(1)">x</a><img src="javascript:evil()">'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toMatch(/javascript:/i)
  })

  it('removes iframe/object/embed', () => {
    const dirty = '<div><iframe src="https://evil"></iframe><object></object></div>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toMatch(/iframe|object/i)
  })

  it('keeps safe markup', () => {
    const safe = '<p><strong>Hello</strong> <a href="https://example.com">link</a></p>'
    const clean = sanitizeHtml(safe)
    expect(clean).toContain('Hello')
    expect(clean).toContain('https://example.com')
  })
})
