import fs from 'fs'

const file = 'frontend/src/components/Documents.jsx'
let content = fs.readFileSync(file, 'utf8')

// Add Code Block to Insert Menu UI
const insertMenuSearch = `<button onClick={() => handleMenuAction('insertEquation')} className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm hover:bg-primary/10 hover:text-primary">
                      <span className="w-5 text-center font-serif italic text-muted group-hover:text-primary">
                        f(x)
                      </span>
                      Equation
                    </button>`

const insertMenuReplace = `<button onClick={() => handleMenuAction('insertEquation')} className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm hover:bg-primary/10 hover:text-primary">
                      <span className="w-5 text-center font-serif italic text-muted group-hover:text-primary">
                        f(x)
                      </span>
                      Equation
                    </button>
                    <button onClick={() => handleMenuAction('insertCodeBlock')} className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm hover:bg-primary/10 hover:text-primary">
                      <span className="w-5 flex justify-center text-muted group-hover:text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                      </span>
                      Code Block
                    </button>`

if(content.includes(insertMenuSearch)) {
  content = content.replace(insertMenuSearch, insertMenuReplace)
}

// Add the case 'insertCodeBlock'
const caseSearch = `      case 'insertEquation': {`
const caseReplace = `      case 'insertCodeBlock': {
        quill.focus()
        const range = quill.getSelection() || { index: quill.getLength() }
        quill.formatLine(range.index, 1, 'code-block', true)
        toast.success('Code block inserted')
        break
      }
      case 'insertEquation': {`

if(content.includes(caseSearch)) {
  content = content.replace(caseSearch, caseReplace)
}

fs.writeFileSync(file, content)
console.log('Code block fixed')
