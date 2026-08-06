#!/usr/bin/env node
/**
 * Fail CI on HIGH/CRITICAL advisories except known, mitigated packages:
 * - quill: XSS export path sanitized with DOMPurify in Documents.jsx
 * - react-router / react-router-dom: SPA BrowserRouter only; no RSC/SSR surfaces in this app
 */
import { execSync } from 'node:child_process'

const ALLOWED = new Set(['quill', 'react-router', 'react-router-dom'])

let report
try {
  execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  console.log('npm audit: no vulnerabilities reported')
  process.exit(0)
} catch (error) {
  const out = error.stdout || ''
  try {
    report = JSON.parse(out)
  } catch {
    console.error('npm audit failed and did not return JSON')
    process.exit(1)
  }
}

const vulns = report.vulnerabilities || {}
const blockers = []

for (const [name, info] of Object.entries(vulns)) {
  const severity = String(info.severity || '').toLowerCase()
  if (severity !== 'high' && severity !== 'critical') continue
  if (ALLOWED.has(name)) {
    console.warn(`[audit-allow] ${name} (${severity}) — mitigated in application code`)
    continue
  }
  blockers.push({ name, severity, via: info.via })
}

if (blockers.length > 0) {
  console.error('Blocking HIGH/CRITICAL advisories:')
  for (const b of blockers) {
    console.error(` - ${b.name} (${b.severity})`)
  }
  process.exit(1)
}

console.log('npm audit: no unmitigated HIGH/CRITICAL advisories')
process.exit(0)
