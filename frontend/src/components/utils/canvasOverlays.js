/** Shared helpers for movable page/canvas overlays (text boxes, shapes). */

export const SHAPE_LIBRARY = [
  { id: 'rect', label: 'Rectangle' },
  { id: 'square', label: 'Square' },
  { id: 'circle', label: 'Circle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'arrow-right', label: 'Arrow →' },
  { id: 'arrow-left', label: 'Arrow ←' },
  { id: 'arrow-up', label: 'Arrow ↑' },
  { id: 'arrow-down', label: 'Arrow ↓' },
  { id: 'line', label: 'Line' },
  { id: 'star', label: 'Star' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'callout', label: 'Callout' },
  { id: 'cylinder', label: 'Cylinder' },
  { id: 'parallelogram', label: 'Parallelogram' }
]

export const newOverlayId = (prefix = 'ov') => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

export const newTextBox = (overrides = {}) => ({
  id: newOverlayId('tb'),
  kind: 'textbox',
  x: 72,
  y: 120,
  width: 220,
  height: 100,
  rotation: 0,
  zIndex: 10,
  text: 'Text box',
  fontFamily: 'Sans-Serif',
  fontSize: '16px',
  color: '#0f172a',
  bold: false,
  italic: false,
  underline: false,
  align: 'left',
  fill: '#ffffff',
  borderColor: '#94a3b8',
  borderWidth: 1,
  borderRadius: 4,
  opacity: 1,
  ...overrides
})

export const newShape = (shapeId = 'rect', overrides = {}) => {
  const squareish = ['square', 'circle', 'star', 'diamond', 'hexagon'].includes(shapeId)
  return {
    id: newOverlayId('sh'),
    kind: 'shape',
    shape: shapeId,
    x: 100,
    y: 140,
    width: squareish ? 120 : 160,
    height: squareish ? 120 : 100,
    rotation: 0,
    zIndex: 10,
    text: '',
    fontFamily: 'Sans-Serif',
    fontSize: '14px',
    color: '#0f172a',
    bold: false,
    italic: false,
    underline: false,
    align: 'center',
    fill: '#ede9fe',
    borderColor: '#7c3aed',
    borderWidth: 2,
    borderRadius: 4,
    opacity: 1,
    ...overrides
  }
}

/** Normalize color values for <input type="color"> (needs #rrggbb). */
export function toColorInputValue(value, fallback = '#ffffff') {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const v = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1]
    const g = v[2]
    const b = v[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return fallback
}

/** Convert lightweight latex-ish / ascii math to HTML with unicode + CSS. */
export function renderEquationHtml(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let s = raw.trim()

  // Escape HTML first
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Fractions: a/b or \frac{a}{b}
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_m, a, b) => {
    return `<span class="eq-frac"><span class="eq-num">${a}</span><span class="eq-den">${b}</span></span>`
  })
  s = s.replace(/(\d+(?:\.\d+)?|[A-Za-z])\s*\/\s*(\d+(?:\.\d+)?|[A-Za-z])/g, (_m, a, b) => {
    return `<span class="eq-frac"><span class="eq-num">${a}</span><span class="eq-den">${b}</span></span>`
  })

  // Superscripts: x^2, x^{10}, mc^2
  s = s.replace(/\^(\{([^}]+)\}|([A-Za-z0-9+-]+))/g, (_m, _g1, braced, plain) => {
    const content = braced || plain
    return `<sup>${content}</sup>`
  })

  // Subscripts: x_1, x_{i}
  s = s.replace(/_(\{([^}]+)\}|([A-Za-z0-9+-]+))/g, (_m, _g1, braced, plain) => {
    const content = braced || plain
    return `<sub>${content}</sub>`
  })

  // Common symbols
  const symbols = [
    [/\\int/g, '∫'],
    [/\\sum/g, '∑'],
    [/\\prod/g, '∏'],
    [/\\sqrt\{([^}]+)\}/g, '√($1)'],
    [/\\sqrt/g, '√'],
    [/\\infty/g, '∞'],
    [/\\pm/g, '±'],
    [/\\times/g, '×'],
    [/\\div/g, '÷'],
    [/\\neq/g, '≠'],
    [/\\leq/g, '≤'],
    [/\\geq/g, '≥'],
    [/\\approx/g, '≈'],
    [/\\alpha/g, 'α'],
    [/\\beta/g, 'β'],
    [/\\gamma/g, 'γ'],
    [/\\delta/g, 'δ'],
    [/\\pi/g, 'π'],
    [/\\theta/g, 'θ'],
    [/\\lambda/g, 'λ'],
    [/\\mu/g, 'μ'],
    [/\\sigma/g, 'σ'],
    [/\\omega/g, 'ω'],
    [/\\rightarrow/g, '→'],
    [/\\leftarrow/g, '←'],
    [/\\cdot/g, '·'],
    // Matrix-ish: [[a,b],[c,d]]
    [
      /\[\[([^\]]+)\](?:,\s*\[([^\]]+)\])+\]/g,
      (match) => {
        const rows = match
          .slice(1, -1)
          .split(/\],\s*\[/)
          .map((r) => r.replace(/^\[|\]$/g, ''))
        const cells = rows
          .map(
            (row) =>
              `<tr>${row
                .split(',')
                .map((c) => `<td class="eq-td">${c.trim()}</td>`)
                .join('')}</tr>`
          )
          .join('')
        return `<table class="eq-matrix"><tbody>${cells}</tbody></table>`
      }
    ]
  ]

  symbols.forEach(([re, rep]) => {
    s = s.replace(re, rep)
  })

  // mc2 style trailing digit as superscript when preceded by letter
  s = s.replace(/([A-Za-z])(\d+)\b/g, '$1<sup>$2</sup>')

  return `<span class="eq-math">${s}</span>`
}

export function shapeCss(shape, selected) {
  const base = {
    borderWidth: undefined,
    borderStyle: 'solid',
    borderRadius: '4px',
    clipPath: undefined
  }

  switch (shape) {
    case 'circle':
      return { ...base, borderRadius: '50%' }
    case 'ellipse':
      return { ...base, borderRadius: '50%' }
    case 'square':
    case 'rect':
      return base
    case 'triangle':
      return { ...base, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', borderWidth: 0 }
    case 'diamond':
      return { ...base, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', borderWidth: 0 }
    case 'hexagon':
      return {
        ...base,
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        borderWidth: 0
      }
    case 'star':
      return {
        ...base,
        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
        borderWidth: 0
      }
    case 'parallelogram':
      return { ...base, clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)', borderWidth: 0 }
    case 'arrow-right':
      return {
        ...base,
        clipPath: 'polygon(0% 25%, 60% 25%, 60% 0%, 100% 50%, 60% 100%, 60% 75%, 0% 75%)',
        borderWidth: 0
      }
    case 'arrow-left':
      return {
        ...base,
        clipPath: 'polygon(40% 0%, 40% 25%, 100% 25%, 100% 75%, 40% 75%, 40% 100%, 0% 50%)',
        borderWidth: 0
      }
    case 'arrow-up':
      return {
        ...base,
        clipPath: 'polygon(50% 0%, 100% 40%, 70% 40%, 70% 100%, 30% 100%, 30% 40%, 0% 40%)',
        borderWidth: 0
      }
    case 'arrow-down':
      return {
        ...base,
        clipPath: 'polygon(30% 0%, 70% 0%, 70% 60%, 100% 60%, 50% 100%, 0% 60%, 30% 60%)',
        borderWidth: 0
      }
    case 'line':
      return { ...base, borderRadius: 0, height: '2px' }
    case 'callout':
      return { ...base, borderRadius: '12px' }
    case 'cylinder':
      return { ...base, borderRadius: '50% / 15%' }
    default:
      return { ...base, outline: selected ? '2px solid var(--tw-primary)' : undefined }
  }
}
