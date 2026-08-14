import fs from 'fs'

const file = 'frontend/src/components/Documents.jsx'
let content = fs.readFileSync(file, 'utf8')

const searchTable = `      case 'insertTable': {
        const rows = prompt('Rows count:', '3')
        const cols = prompt('Columns count:', '3')
        if (rows && cols) {
          let tableHTML = '<table class="w-full border-collapse border border-border my-4">'
          for (let r = 0; r < parseInt(rows); r++) {
            tableHTML += '<tr>'
            for (let c = 0; c < parseInt(cols); c++) {
              tableHTML += '<td class="border border-border p-2 min-w-[50px] text-xs">Cell</td>'
            }
            tableHTML += '</tr>'
          }
          tableHTML += '</table>'
          quill.focus()
          const range = quill.getSelection() || { index: quill.getLength() }
          pasteSafeHtml(quill, tableHTML, range.index)
          toast.success('Table inserted!')
        }
        break
      }`

const replaceTable = `      case 'insertTable': {
        const rows = parseInt(prompt('Rows count:', '3'), 10)
        const cols = parseInt(prompt('Columns count:', '3'), 10)
        if (rows && cols && !isNaN(rows) && !isNaN(cols)) {
          quill.focus()
          const tableModule = quill.getModule('table')
          if (tableModule) {
            tableModule.insertTable(rows, cols)
            toast.success('Table inserted!')
          } else {
            toast.error('Table module not initialized.')
          }
        }
        break
      }`

if(content.includes(searchTable)) {
  content = content.replace(searchTable, replaceTable)
  fs.writeFileSync(file, content)
  console.log('insertTable fixed')
} else {
  console.log('Could not find insertTable block')
}
