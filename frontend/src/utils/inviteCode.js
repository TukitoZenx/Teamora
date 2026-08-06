/**
 * Normalize invite input: full URL path last segment or raw code → uppercase.
 */
export function extractInviteCode(value) {
  const trimmed = String(value || '').trim()

  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    const parts = parsed.pathname.split('/').filter(Boolean)
    return (parts[parts.length - 1] || '').toUpperCase()
  } catch {
    return trimmed.split('/').filter(Boolean).pop()?.toUpperCase() || trimmed.toUpperCase()
  }
}
