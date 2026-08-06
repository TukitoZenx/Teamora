import { useState } from 'react'
import { X, Sparkles, Loader2, FilePlus, CopyPlus } from 'lucide-react'
import { generateSlides } from '../../services/aiClient'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

export default function AiPresentationModal({ isOpen, onClose, onInsertSlides }) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [appendMode, setAppendMode] = useState(false)

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    try {
      // Fetch slides JSON from backend AI model
      const rawSlides = await generateSlides(prompt)

      // Parse into Teamora slide format
      const formattedSlides = rawSlides.map((slide) => ({
        id: uuidv4(),
        title: slide.title || 'Untitled Slide',
        content: '', // Not using string content directly, we parse into elements
        notes: slide.notes || '',
        layout: 'title', // default layout
        hidden: false,
        elements: [
          {
            id: uuidv4(),
            type: 'text',
            text: slide.title || 'Untitled',
            x: 50,
            y: 40,
            width: 860,
            height: 100,
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            fill: 'transparent',
            stroke: 'transparent',
            color: 'var(--tw-text)',
            fontFamily: 'Inter, sans-serif',
            fontSize: 48,
            fontWeight: 'bold',
            align: 'center'
          },
          {
            id: uuidv4(),
            type: 'text',
            text: slide.content
              ? slide.content
                  .replace(/\n/g, '<br/>')
                  .replace(
                    /!\[([^\]]*)\]\(([^)]+)\)/g,
                    '<img src="$2" alt="$1" style="max-width:100%; max-height: 250px; display:block; margin: 10px auto; border-radius: 8px;" />'
                  )
              : '',
            x: 80,
            y: 160,
            width: 800,
            height: 300,
            rotation: 0,
            opacity: 1,
            zIndex: 2,
            fill: 'transparent',
            stroke: 'transparent',
            color: 'var(--tw-text-secondary)',
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            fontWeight: 'normal',
            align: 'left'
          }
        ]
      }))

      onInsertSlides(formattedSlides, appendMode)
      toast.success('AI slides generated successfully!')
      onClose()
      setPrompt('')
    } catch (err) {
      console.error('Generate Error:', err)
      toast.error(err.message || 'AI generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card-sunken">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-text">AI Presentation Creator</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 text-muted hover:text-text hover:bg-muted/20 rounded-md transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Topic or Content</label>
            <textarea
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A 5-slide pitch deck for a new sustainable coffee brand..."
              className="w-full h-32 px-3 py-2 text-sm bg-transparent border border-border rounded-lg outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none transition-all placeholder:text-muted"
              disabled={isGenerating}
            />
          </div>

          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="insertMode"
                checked={!appendMode}
                onChange={() => setAppendMode(false)}
                disabled={isGenerating}
                className="text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm flex items-center gap-1">
                <FilePlus className="w-4 h-4 text-muted" /> Replace existing
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="insertMode"
                checked={appendMode}
                onChange={() => setAppendMode(true)}
                disabled={isGenerating}
                className="text-purple-500 focus:ring-purple-500"
              />
              <span className="text-sm flex items-center gap-1">
                <CopyPlus className="w-4 h-4 text-muted" /> Append to current
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-card-sunken flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-muted/20 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Slides...
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
