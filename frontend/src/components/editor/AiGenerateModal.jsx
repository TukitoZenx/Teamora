import { useState } from 'react'
import { X, Sparkles, Loader2, Check } from 'lucide-react'
import { getGenerateStream } from '../../services/aiClient'
import toast from 'react-hot-toast'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const detectMode = (promptText, hasSelection) => {
  const p = promptText.toLowerCase()
  if (/\brewrite\b|\brephrase\b/.test(p)) return 'rewrite'
  if (/\bexpand\b|\belaborate\b|\badd (more|detail)/.test(p)) return 'expand'
  if (/\bshorten\b|\bconcise\b|\bsummarize\b|\bsummary\b/.test(p)) return hasSelection ? 'transform' : 'generate'
  if (/\bcontinue\b|\bkeep writing\b|\bnext paragraph\b/.test(p)) return 'continue'
  if (hasSelection) return 'transform'
  return 'generate'
}

export default function AiGenerateModal({ isOpen, onClose, quillRef, onGenerating, hasSelection = false }) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [draftState, setDraftState] = useState(null)

  if (!isOpen && !draftState) return null

  const handleGenerate = async () => {
    if (!prompt.trim() || !quillRef?.current) return

    setIsGenerating(true)
    const editor = quillRef.current

    let range = editor.getSelection()
    if (!range) {
      const end = Math.max(0, editor.getLength() - 1)
      editor.setSelection(end, 0, 'silent')
      range = editor.getSelection() || { index: editor.getLength(), length: 0 }
    }

    const selectedText = range.length > 0 ? editor.getText(range.index, range.length) : ''
    const documentContext = editor.getText(0, Math.min(editor.getLength(), 4000))
    const mode = detectMode(prompt, range.length > 0)

    let insertIndex = range.index
    const originalStartIndex = insertIndex

    try {
      const stream = getGenerateStream(prompt, { selectedText, documentContext, mode })

      // Close modal immediately so user can see it stream
      onClose()
      onGenerating?.(true)

      if (range.length > 0) {
        editor.deleteText(range.index, range.length, 'user')
      } else if (insertIndex > 0 && mode !== 'continue') {
        editor.insertText(insertIndex, '\n\n', 'user')
        insertIndex += 2
      }
      const textStartIndex = insertIndex

      let fullText = ''
      for await (const chunk of stream) {
        editor.insertText(insertIndex, chunk, 'user')
        editor.formatText(insertIndex, chunk.length, 'background', 'rgba(168, 85, 247, 0.2)')
        insertIndex += chunk.length
        editor.setSelection(insertIndex)
        fullText += chunk
      }

      let finalEndIndex = insertIndex
      const hasMarkdown = /#{1,6}\s|\*\*|__|\*|_|- \w|1\. |```|!\[/g.test(fullText)

      if (hasMarkdown) {
        const html = DOMPurify.sanitize(marked.parse(fullText))
        editor.deleteText(textStartIndex, fullText.length, 'user')

        const lenBefore = editor.getLength()
        editor.clipboard.dangerouslyPasteHTML(textStartIndex, html, 'user')
        const lenAfter = editor.getLength()

        const insertedLength = lenAfter - lenBefore
        finalEndIndex = textStartIndex + insertedLength

        editor.formatText(textStartIndex, insertedLength, 'background', 'rgba(168, 85, 247, 0.2)')
        editor.setSelection(finalEndIndex)
      }

      setDraftState({
        startIndex: originalStartIndex,
        endIndex: finalEndIndex
      })
    } catch (err) {
      console.error('Generate Error:', err)
      toast.error(err.message || 'AI generation failed')
    } finally {
      setIsGenerating(false)
      onGenerating?.(false)
      setPrompt('')
    }
  }

  const handleAccept = () => {
    if (quillRef?.current && draftState) {
      // Remove highlight
      quillRef.current.formatText(
        draftState.startIndex,
        draftState.endIndex - draftState.startIndex,
        'background',
        false
      )
    }
    setDraftState(null)
  }

  const handleReject = () => {
    if (quillRef?.current && draftState) {
      quillRef.current.deleteText(draftState.startIndex, draftState.endIndex - draftState.startIndex, 'user')
    }
    setDraftState(null)
  }

  if (draftState) {
    return (
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] shadow-xl rounded-full bg-card border border-border p-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <button
          onClick={handleAccept}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-full transition-colors"
        >
          <Check className="w-4 h-4" /> Accept
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={handleReject}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors"
        >
          <X className="w-4 h-4" /> Reject
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card-sunken">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-text">Smart Document Creation</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text hover:bg-primary/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <label className="block text-sm font-medium text-text mb-2">
            {hasSelection
              ? 'How should the selected text be rewritten, expanded, or transformed?'
              : 'What should the document contain?'}
          </label>
          {hasSelection && (
            <p className="mb-2 text-xs text-muted">
              Selected text will be used as context. Unrelated document content will not be replaced.
            </p>
          )}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              hasSelection
                ? 'e.g., Rewrite this paragraph in simple English. / Expand this section with three advantages.'
                : 'e.g., Write a 500-word professional introduction about cloud computing.'
            }
            className="w-full h-32 p-3 border border-border bg-card-sunken text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-sm"
            autoFocus
          />
        </div>

        <div className="px-5 py-4 bg-card flex justify-end gap-2 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-text hover:bg-primary/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-primary bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
