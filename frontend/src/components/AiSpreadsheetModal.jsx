import { useState } from 'react'
import { X, Sparkles, Loader2, FunctionSquare, Database } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateSpreadsheet } from '../services/aiClient'

export default function AiSpreadsheetModal({ isOpen, onClose, onApplyAi }) {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [mode, setMode] = useState('formula') // 'formula' or 'data'

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    try {
      const data = await generateSpreadsheet(prompt, mode)
      onApplyAi(data.result, mode)
      toast.success(`AI ${mode} generated successfully!`)
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
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-text">AI Spreadsheet Assistant</h3>
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
          <div className="flex items-center gap-4 bg-card-sunken p-1 rounded-lg border border-border">
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${mode === 'formula' ? 'bg-card shadow text-text' : 'text-muted hover:text-text'}`}
              onClick={() => setMode('formula')}
            >
              <FunctionSquare className="w-4 h-4" />
              Formula
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${mode === 'data' ? 'bg-card shadow text-text' : 'text-muted hover:text-text'}`}
              onClick={() => setMode('data')}
            >
              <Database className="w-4 h-4" />
              Sample Data
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              {mode === 'formula' ? 'Describe the calculation' : 'Describe the sample data'}
            </label>
            <textarea
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === 'formula'
                  ? "e.g., Calculate the sum of column B if column A is 'Yes'"
                  : 'e.g., Generate 5 rows with columns: Name, Role, Department'
              }
              className="w-full h-32 px-3 py-2 text-sm bg-transparent border border-border rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none transition-all placeholder:text-muted"
              disabled={isGenerating}
            />
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
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
