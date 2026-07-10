/**
 * PPTX import via JSZip — extracts slide text + embedded images.
 * Layout fidelity is best-effort (positions approximate).
 */
import JSZip from 'jszip'

const newId = (p = 'slide') => `${p}-${Math.random().toString(36).slice(2, 10)}`

const extractTexts = (xml) =>
  [...String(xml).matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]).filter((t) => t && t.trim())

const decodeXmlEntities = (s) =>
  String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")

/**
 * Resolve image relationships for a slide XML path.
 * @param {JSZip} zip
 * @param {string} slidePath e.g. ppt/slides/slide1.xml
 */
async function loadSlideImages(zip, slidePath) {
  const relPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels'
  const relFile = zip.file(relPath)
  if (!relFile) return []

  const relXml = await relFile.async('string')
  const rels = [...relXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => ({
    id: m[1],
    target: m[2]
  }))

  const images = []
  for (const rel of rels) {
    if (!/\.(png|jpe?g|gif|webp|emf|wmf)$/i.test(rel.target) && !rel.target.includes('media/')) {
      continue
    }
    // Targets are relative to ppt/slides/
    let mediaPath = rel.target.replace(/^\.\.\//, 'ppt/')
    if (mediaPath.startsWith('/')) mediaPath = mediaPath.slice(1)
    if (!mediaPath.startsWith('ppt/')) mediaPath = `ppt/slides/${rel.target}`

    const mediaFile = zip.file(mediaPath) || zip.file(rel.target.replace(/^\.\.\//, 'ppt/'))
    if (!mediaFile) continue

    try {
      const base64 = await mediaFile.async('base64')
      const ext = (mediaPath.split('.').pop() || 'png').toLowerCase()
      const mime =
        ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'webp'
              ? 'image/webp'
              : 'image/png'
      images.push({
        relId: rel.id,
        src: `data:${mime};base64,${base64}`
      })
    } catch {
      // skip broken media
    }
  }
  return images
}

/**
 * @param {File|Blob|ArrayBuffer} input
 * @returns {Promise<{ slides: object[], warnings: string[] }>}
 */
export async function importPptxToSlides(input) {
  const warnings = []
  const buf = input instanceof ArrayBuffer ? input : await input.arrayBuffer()
  const zip = await JSZip.loadAsync(buf)

  // Discover slide paths in order
  let slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/i)?.[1] || '0', 10)
      const nb = parseInt(b.match(/slide(\d+)/i)?.[1] || '0', 10)
      return na - nb
    })

  if (slidePaths.length === 0) {
    warnings.push('No ppt/slides/slideN.xml entries found')
    return { slides: [], warnings }
  }

  const slides = []
  for (let i = 0; i < slidePaths.length; i += 1) {
    const path = slidePaths[i]
    const xml = await zip.file(path).async('string')
    const texts = extractTexts(xml).map(decodeXmlEntities)
    const images = await loadSlideImages(zip, path)

    const title = texts[0] || `Slide ${i + 1}`
    const content = texts.slice(1).join('\n')

    const elements = images.map((img, idx) => ({
      id: newId('img'),
      type: 'image',
      x: 40 + (idx % 2) * 280,
      y: 120 + Math.floor(idx / 2) * 160,
      width: 260,
      height: 150,
      src: img.src,
      zIndex: 5 + idx
    }))

    // Notes from notesSlide if present
    let notes = ''
    const notesPath = path.replace('/slides/slide', '/notesSlides/notesSlide')
    const notesFile = zip.file(notesPath)
    if (notesFile) {
      try {
        const notesXml = await notesFile.async('string')
        notes = extractTexts(notesXml).map(decodeXmlEntities).join('\n')
      } catch {
        // ignore
      }
    }

    slides.push({
      id: newId('slide'),
      title,
      content,
      notes,
      elements,
      layout: images.length ? 'image-left' : 'title',
      hidden: false,
      section: null,
      order: i
    })
  }

  if (slides.length === 0) {
    warnings.push('ZIP opened but no slides parsed')
  }

  return { slides, warnings }
}
