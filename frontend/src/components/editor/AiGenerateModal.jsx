import { useState } from 'react';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import { getGenerateStream } from '../../services/aiClient';
import toast from 'react-hot-toast';

export default function AiGenerateModal({ isOpen, onClose, quillRef, onGenerating }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftState, setDraftState] = useState(null);

  if (!isOpen && !draftState) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || !quillRef?.current) return;
    
    setIsGenerating(true);
    const quill = quillRef.current;
    
    // Determine where to insert. We insert at current cursor, or at the end if none.
    let range = quill.getSelection();
    let insertIndex = range ? range.index : quill.getLength();
    const originalStartIndex = insertIndex;
    
    try {
      const stream = getGenerateStream(prompt);
      
      // Close modal immediately so user can see it stream
      onClose();
      onGenerating?.(true);
      
      // Add a couple newlines if not at start
      if (insertIndex > 0) {
        quill.insertText(insertIndex, '\n\n', 'user');
        insertIndex += 2;
      }
      
      for await (const chunk of stream) {
        quill.insertText(insertIndex, chunk, 'user');
        quill.formatText(insertIndex, chunk.length, 'background', 'rgba(168, 85, 247, 0.2)');
        insertIndex += chunk.length;
        quill.setSelection(insertIndex);
      }
      
      setDraftState({
        startIndex: originalStartIndex,
        endIndex: insertIndex
      });
    } catch (err) {
      console.error('Generate Error:', err);
      toast.error(err.message || 'AI generation failed');
    } finally {
      setIsGenerating(false);
      onGenerating?.(false);
      setPrompt('');
    }
  };

  const handleAccept = () => {
    if (quillRef?.current && draftState) {
      // Remove highlight
      quillRef.current.formatText(draftState.startIndex, draftState.endIndex - draftState.startIndex, 'background', false);
    }
    setDraftState(null);
  };

  const handleReject = () => {
    if (quillRef?.current && draftState) {
      quillRef.current.deleteText(draftState.startIndex, draftState.endIndex - draftState.startIndex, 'user');
    }
    setDraftState(null);
  };

  if (draftState) {
    return (
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] shadow-xl rounded-full bg-card border border-border p-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <button onClick={handleAccept} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-full transition-colors">
          <Check className="w-4 h-4" /> Accept
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button onClick={handleReject} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors">
          <X className="w-4 h-4" /> Reject
        </button>
      </div>
    );
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
            What would you like to write about?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Create a project proposal for an AI-based task manager..."
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
  );
}
