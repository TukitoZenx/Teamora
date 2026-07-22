/**
 * Compress / downscale images before embedding in presentation state.
 * Large base64 data URLs cause 413 Payload Too Large on content save.
 */

const MAX_EDGE = 1280
const JPEG_QUALITY = 0.72
const MAX_DATA_URL_CHARS = 450_000 // ~0.45MB per image after compression

/**
 * @param {Blob|File|string} input - Blob/File or data URL / http(s) URL
 * @returns {Promise<{ dataUrl: string, width: number, height: number }>}
 */
export async function compressImageToDataUrl(input) {
  let blob
  if (typeof input === 'string') {
    if (input.startsWith('data:image/') && input.length <= MAX_DATA_URL_CHARS) {
      // Already small enough — keep as-is (may still re-encode for consistency if huge)
      const dims = await probeDataUrl(input)
      return { dataUrl: input, ...dims }
    }
    if (input.startsWith('data:') || input.startsWith('http://') || input.startsWith('https://')) {
      const res = await fetch(input)
      blob = await res.blob()
    } else {
      throw new Error('Unsupported image source')
    }
  } else if (input instanceof Blob) {
    blob = input
  } else {
    throw new Error('Invalid image input')
  }

  if (!blob.type.startsWith('image/') && blob.type !== '') {
    // some browsers leave type empty for pasted images
  }

  const bitmap = await createImageBitmap(blob)
  try {
    let { width, height } = bitmap
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
    const tw = Math.max(1, Math.round(width * scale))
    const th = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(bitmap, 0, 0, tw, th)

    // Prefer JPEG for photos; keep PNG for transparency if source had alpha and is small
    let dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    if (dataUrl.length > MAX_DATA_URL_CHARS) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.55)
    }
    if (dataUrl.length > MAX_DATA_URL_CHARS) {
      // Further downscale
      const scale2 = Math.sqrt(MAX_DATA_URL_CHARS / dataUrl.length)
      const tw2 = Math.max(1, Math.round(tw * scale2))
      const th2 = Math.max(1, Math.round(th * scale2))
      canvas.width = tw2
      canvas.height = th2
      ctx.drawImage(bitmap, 0, 0, tw2, th2)
      dataUrl = canvas.toDataURL('image/jpeg', 0.5)
    }

    return { dataUrl, width: canvas.width, height: canvas.height }
  } finally {
    try {
      bitmap.close?.()
    } catch {
      // ignore
    }
  }
}

function probeDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth || 300, height: img.naturalHeight || 200 })
    img.onerror = () => resolve({ width: 300, height: 200 })
    img.src = dataUrl
  })
}

/**
 * Walk slides and compress any oversized data:image src fields.
 * Returns a new slides array (does not mutate).
 */
export async function compressSlidesImages(slides) {
  if (!Array.isArray(slides)) return slides
  const out = []
  for (const slide of slides) {
    if (!slide || !Array.isArray(slide.elements)) {
      out.push(slide)
      continue
    }
    const elements = []
    for (const el of slide.elements) {
      if (
        el?.type === 'image' &&
        typeof el.src === 'string' &&
        el.src.startsWith('data:image/') &&
        el.src.length > MAX_DATA_URL_CHARS
      ) {
        try {
          const { dataUrl, width, height } = await compressImageToDataUrl(el.src)
          elements.push({
            ...el,
            src: dataUrl,
            width: el.width || Math.min(320, width),
            height: el.height || Math.min(220, height)
          })
        } catch {
          elements.push(el)
        }
      } else {
        elements.push(el)
      }
    }
    out.push({ ...slide, elements })
  }
  return out
}
