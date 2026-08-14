import fs from 'fs'

const file = 'frontend/src/components/editor/pageFlow.js'
let content = fs.readFileSync(file, 'utf8')

const searchStr = `    let crossings = 0
    let pageContentEnd = usable

    blocks.forEach((block) => {
      if (block.dataset.pageFlowPad) {
        block.style.marginBottom = ''
        delete block.dataset.pageFlowPad
      }

      const top = block.offsetTop
      const height = Math.max(0, block.offsetHeight)
      const bottom = top + height

      if (isManualPageBreak(block)) {
        const remain = Math.max(0, pageContentEnd - bottom)
        if (remain > 1 && crossings < MAX_DOCUMENT_PAGES - 1) {
          block.style.marginBottom = \`\${Math.round(remain)}px\`
          block.dataset.pageFlowPad = '1'
          crossings += 1
          pageContentEnd += usable
        }
        return
      }

      // Count crossings in raw (pre-spacer) coordinates — skip bands are not in this height.
      while (bottom > pageContentEnd + 2 && crossings < MAX_DOCUMENT_PAGES - 1) {
        crossings += 1
        pageContentEnd += usable
      }
    })`

const replaceStr = `    let crossings = 0
    let pageContentEnd = usable

    blocks.forEach((block) => {
      if (block.dataset.pageFlowPad) {
        block.style.marginBottom = ''
        delete block.dataset.pageFlowPad
      }

      const top = block.offsetTop
      const height = Math.max(0, block.offsetHeight)
      const bottom = top + height

      // If it's a manual page break, pad it so it reaches the bottom of the current page.
      if (isManualPageBreak(block)) {
        const remain = Math.max(0, pageContentEnd - bottom)
        if (remain > 0 && crossings < MAX_DOCUMENT_PAGES - 1) {
          block.style.marginBottom = \`\${Math.round(remain)}px\`
          block.dataset.pageFlowPad = '1'
          crossings += 1
          pageContentEnd = bottom + remain + usable
        }
        return
      }

      // If the block crosses the boundary, we log a crossing.
      // We ensure we don't infinitely loop by using a simple mathematical division.
      if (bottom > pageContentEnd + 2 && crossings < MAX_DOCUMENT_PAGES - 1) {
        const excess = bottom - pageContentEnd;
        const additionalCrossings = Math.ceil(excess / usable);
        crossings += additionalCrossings;
        pageContentEnd += additionalCrossings * usable;
        
        // Cap crossings to prevent extreme layouts
        if (crossings >= MAX_DOCUMENT_PAGES - 1) {
           crossings = MAX_DOCUMENT_PAGES - 1;
        }
      }
    })`

if(content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr)
  fs.writeFileSync(file, content)
  console.log('pageFlow.js fixed successfully')
} else {
  console.log('Could not find search string in pageFlow.js')
}
