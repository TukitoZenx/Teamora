/**
 * Strip scripts, event handlers, and dangerous URLs from HTML used in
 * collaborative presentation content (stored XSS mitigation).
 */
export function sanitizeHtml(html) {
  if (html == null) return ''
  const input = String(html)
  if (!input.trim()) return ''

  if (typeof DOMParser === 'undefined') {
    return input
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript\s*:/gi, '')
  }

  const doc = new DOMParser().parseFromString(input, 'text/html')
  doc.querySelectorAll('script,iframe,object,embed,link,meta,base,form').forEach((el) => el.remove())

  doc.body.querySelectorAll('*').forEach((el) => {
    ;[...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase()
      const value = attr.value || ''
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name)
        return
      }
      if ((name === 'href' || name === 'src' || name === 'xlink:href') && /^\s*javascript:/i.test(value)) {
        el.removeAttribute(attr.name)
      }
      if (name === 'srcdoc') {
        el.removeAttribute(attr.name)
      }
    })
  })

  return doc.body.innerHTML
}
