#!/usr/bin/env node
/**
 * One-shot codemod: replace hardcoded design values with Teamora tokens.
 * Safe, ordered replacements on className-heavy JSX/JS sources.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'src')

const SKIP = new Set(['index.css'])

/** Ordered replacements: longer / more specific first where needed */
const REPLACEMENTS = [
  // Colors — backgrounds
  [/bg-\[#7C3AED\]/gi, 'bg-primary'],
  [/bg-\[#6D28D9\]/gi, 'bg-primary-hover'],
  [/bg-\[#C4B5FD\]/gi, 'bg-primary-muted'],
  [/bg-\[#F8F5FF\]/gi, 'bg-primary-subtle'],
  [/bg-\[#F5F3FF\]/gi, 'bg-primary-subtle'],
  [/bg-\[#F8FAFC\]/gi, 'bg-background'],
  [/bg-\[#FAFAFB\]/gi, 'bg-background'],
  [/bg-\[#FFFFFF\]/gi, 'bg-card'],
  [/bg-\[#F3F4F6\]/gi, 'bg-card-sunken'],
  [/bg-\[#F1F5F9\]/gi, 'bg-card-sunken'],
  [/bg-\[#DC2626\]/gi, 'bg-danger'],
  [/bg-\[#EF4444\]/gi, 'bg-danger'],
  [/bg-\[#B91C1C\]/gi, 'bg-danger-hover'],
  [/bg-\[#FEF2F2\]/gi, 'bg-danger-subtle'],
  [/bg-\[#FEE2E2\]/gi, 'bg-danger-subtle'],
  [/bg-\[#ECFDF5\]/gi, 'bg-success-subtle'],
  [/bg-\[#D1FAE5\]/gi, 'bg-success-subtle'],
  [/bg-\[#059669\]/gi, 'bg-success-hover'],
  [/bg-\[#10B981\]/gi, 'bg-success'],
  [/bg-\[#FFFBEB\]/gi, 'bg-warning-subtle'],
  [/bg-\[#FEF3C7\]/gi, 'bg-warning-subtle'],

  // Colors — text
  [/text-\[#7C3AED\]/gi, 'text-primary'],
  [/text-\[#6D28D9\]/gi, 'text-primary-hover'],
  [/text-\[#111827\]/gi, 'text-text'],
  [/text-\[#0F172A\]/gi, 'text-text'],
  [/text-\[#374151\]/gi, 'text-text-secondary'],
  [/text-\[#6B7280\]/gi, 'text-muted'],
  [/text-\[#9CA3AF\]/gi, 'text-muted'],
  [/text-\[#64748B\]/gi, 'text-muted'],
  [/text-\[#DC2626\]/gi, 'text-danger'],
  [/text-\[#EF4444\]/gi, 'text-danger'],
  [/text-\[#B91C1C\]/gi, 'text-danger'],
  [/text-\[#059669\]/gi, 'text-success'],
  [/text-\[#10B981\]/gi, 'text-success'],
  [/text-\[#FFFFFF\]/gi, 'text-on-primary'],

  // Colors — borders
  [/border-\[#7C3AED\]/gi, 'border-primary'],
  [/border-\[#DDD6FE\]/gi, 'border-primary-muted'],
  [/border-\[#E5E7EB\]/gi, 'border-border'],
  [/border-\[#E2E8F0\]/gi, 'border-border'],
  [/border-\[#FEE2E2\]/gi, 'border-danger/30'],
  [/border-\[#FCA5A5\]/gi, 'border-danger/40'],
  [/border-\[#DC2626\]/gi, 'border-danger'],

  // Hover / focus color variants often written as full utilities
  [/hover:bg-\[#6D28D9\]/gi, 'hover:bg-primary-hover'],
  [/hover:bg-\[#7C3AED\]/gi, 'hover:bg-primary'],
  [/hover:bg-\[#F8F5FF\]/gi, 'hover:bg-primary-subtle'],
  [/hover:bg-\[#F3F4F6\]/gi, 'hover:bg-card-sunken'],
  [/hover:bg-\[#FEF2F2\]/gi, 'hover:bg-danger-subtle'],
  [/hover:bg-\[#B91C1C\]/gi, 'hover:bg-danger-hover'],
  [/hover:bg-\[#F8FAFC\]/gi, 'hover:bg-background'],
  [/hover:text-\[#7C3AED\]/gi, 'hover:text-primary'],
  [/hover:text-\[#111827\]/gi, 'hover:text-text'],
  [/hover:text-\[#6D28D9\]/gi, 'hover:text-primary-hover'],
  [/hover:border-\[#7C3AED\]/gi, 'hover:border-primary'],
  [/focus:border-\[#7C3AED\]/gi, 'focus:border-primary'],
  [/disabled:bg-\[#C4B5FD\]/gi, 'disabled:bg-primary-muted'],

  // Rings
  [/ring-\[#7C3AED\]\/10/gi, 'ring-primary/10'],
  [/focus:ring-\[#7C3AED\]\/10/gi, 'focus:ring-primary/10'],
  [/focus:ring-4 focus:ring-primary\/10/g, 'focus:ring-4 focus:ring-primary/10'],

  // Radii
  [/rounded-\[24px\]/g, 'rounded-xl'],
  [/rounded-\[20px\]/g, 'rounded-card'],
  [/rounded-\[18px\]/g, 'rounded-lg'],
  [/rounded-\[16px\]/g, 'rounded-input'],
  [/rounded-\[14px\]/g, 'rounded-button'],
  [/rounded-\[12px\]/g, 'rounded-control'],
  [/rounded-\[10px\]/g, 'rounded-sm'],

  // Layout heights / padding that match navbar
  [/h-\[72px\]/g, 'h-navbar'],
  [/pt-\[72px\]/g, 'pt-navbar'],
  [/top-\[72px\]/g, 'top-navbar'],
  [/min-h-\[calc\(100vh-72px\)\]/g, 'min-h-[calc(100vh-var(--tw-navbar-height))]'],
  [/h-\[calc\(100vh-72px\)\]/g, 'h-[calc(100vh-var(--tw-navbar-height))]'],
  [/h-\[calc\(100vh-120px\)\]/g, 'h-[calc(100vh-var(--tw-navbar-height)-3rem)]'],
  [/lg:pl-\[240px\]/g, 'lg:pl-sidebar'],
  [/lg:pl-\[72px\]/g, 'lg:pl-sidebar-collapsed'],
  [/w-\[240px\]/g, 'w-sidebar'],
  [/w-\[72px\]/g, 'w-sidebar-collapsed'],
  [/max-w-\[420px\]/g, 'max-w-auth'],

  // Motion
  [/duration-\[180ms\]/g, 'duration-normal'],
  [/duration-\[150ms\]/g, 'duration-fast'],
  [/duration-\[220ms\]/g, 'duration-slow'],
  [/duration-220/g, 'duration-slow'],

  // Z-index
  [/z-\[1000\]/g, 'z-navbar'],
  [/z-\[1100\]/g, 'z-sidebar'],
  [/z-\[1200\]/g, 'z-modal'],
  [/z-\[1300\]/g, 'z-toast'],

  // Overlay blur / scrims
  [/bg-black\/25 backdrop-blur-\[10px\]/g, 'teamora-scrim'],
  [/bg-slate-950\/40 dark:bg-black\/60 px-4 backdrop-blur-\[10px\]/g, 'teamora-scrim px-4'],
  [/backdrop-blur-\[10px\]/g, 'backdrop-blur-overlay'],

  // Shadow one-offs
  [/shadow-\[0_24px_70px_rgba\(15,23,42,0\.08\)\]/g, 'shadow-modal'],
  [/shadow-\[0_12px_35px_rgba\(15,23,42,0\.06\)\]/g, 'shadow-dropdown']

  // White text on primary — prefer on-primary token when paired with primary bg
  // Keep text-white as fallback for canvas/editor tools that hardcode white
]

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (/\.(jsx?|tsx?)$/.test(entry.name) && !SKIP.has(entry.name)) files.push(full)
  }
  return files
}

let changedFiles = 0
let totalReplacements = 0

for (const file of walk(ROOT)) {
  const original = fs.readFileSync(file, 'utf8')
  let next = original
  let fileHits = 0

  for (const [pattern, replacement] of REPLACEMENTS) {
    const before = next
    next = next.replace(pattern, replacement)
    if (next !== before) {
      const matches = before.match(pattern)
      fileHits += matches ? matches.length : 1
    }
  }

  if (next !== original) {
    fs.writeFileSync(file, next)
    changedFiles += 1
    totalReplacements += fileHits
    console.log(`updated ${path.relative(ROOT, file)} (~${fileHits} hits)`)
  }
}

console.log(`\nDone. ${changedFiles} files, ~${totalReplacements} replacements.`)
