import fs from 'fs'

const file = 'frontend/src/components/Documents.jsx'
let content = fs.readFileSync(file, 'utf8')

// Replace the exportPdf block
const searchPdf = `      case 'exportPdf': {
        const format = paperSize === 'Legal' ? 'legal' : paperSize === 'A4' ? 'a4' : 'letter'
        const opt = {
          margin: marginIn,
          filename: \`\${docTitle}.pdf\`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: pageColor || '#ffffff' },
          jsPDF: { unit: 'in', format, orientation: orientation === 'landscape' ? 'landscape' : 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], after: '.page-break' }
        }
        const exportRoot = document.createElement('div')
        exportRoot.innerHTML = DOMPurify.sanitize(stripPaginationFromHtml(quill.root.innerHTML))
        // Dynamic import keeps html2pdf out of the initial documents chunk until export.
        toast.promise(
          import('html2pdf.js').then((mod) => {
            const html2pdf = mod.default || mod
            return html2pdf().set(opt).from(exportRoot).save()
          }),
          {
            loading: 'Preparing PDF export...',
            success: 'Document exported successfully!',
            error: 'Failed to export PDF.'
          }
        )
        break
      }`

const replacePdf = `      case 'exportPdf': {
        const format = paperSize === 'Legal' ? 'legal' : paperSize === 'A4' ? 'a4' : 'letter'
        const opt = {
          margin: marginIn,
          filename: \`\${docTitle || 'document'}.pdf\`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: pageColor || '#ffffff',
            windowWidth: pageDims.w, // Force correct layout width
            onclone: (doc) => {
              // Ensure overlays are positioned correctly in the clone
              doc.querySelectorAll('.overlay').forEach(el => {
                 el.style.position = 'absolute';
              });
            }
          },
          jsPDF: { unit: 'in', format, orientation: orientation === 'landscape' ? 'landscape' : 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], after: '.page-break, [data-page-break="true"]' }
        }

        // We use buildPrintHtml to get the clean HTML + CSS
        const fullHtml = buildPrintHtml({
          title: docTitle || 'Document',
          bodyHtml: DOMPurify.sanitize(stripPaginationFromHtml(quill.root.innerHTML)),
          paperSize,
          orientation,
          marginIn,
          pageColor,
          fontFamily,
          fontSize,
          lineSpacing,
          columnsCount,
          pageBorder,
          overlays,
          pageNumberFormat,
          showPageNumbers
        })

        // Create an invisible iframe to host the styled document
        const iframe = document.createElement('iframe')
        iframe.style.position = 'absolute'
        iframe.style.width = \`\${pageDims.w}px\`
        iframe.style.height = '10000px'
        iframe.style.left = '-20000px'
        iframe.style.top = '0'
        iframe.style.visibility = 'hidden'
        document.body.appendChild(iframe)
        
        const iframeDoc = iframe.contentWindow.document
        iframeDoc.open()
        iframeDoc.write(fullHtml)
        iframeDoc.close()

        toast.promise(
          new Promise((resolve, reject) => {
            // Wait a moment for iframe rendering and images to load
            setTimeout(() => {
              import('html2pdf.js').then((mod) => {
                const html2pdf = mod.default || mod
                const source = iframeDoc.querySelector('.page-root') || iframeDoc.body
                html2pdf().set(opt).from(source).save().then(() => {
                  document.body.removeChild(iframe)
                  resolve()
                }).catch(err => {
                  document.body.removeChild(iframe)
                  reject(err)
                })
              }).catch(err => {
                document.body.removeChild(iframe)
                reject(err)
              })
            }, 800)
          }),
          {
            loading: 'Preparing PDF export...',
            success: 'Document exported successfully!',
            error: 'Failed to export PDF.'
          }
        )
        break
      }`

content = content.replace(searchPdf, replacePdf)
fs.writeFileSync(file, content)
console.log('PDF export fixed')
