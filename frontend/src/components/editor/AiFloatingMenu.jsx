import { useEffect, useState, useRef } from 'react';
import { Sparkles, Replace, Type, AlignLeft, Scissors, Check, Wand2, Lightbulb, X } from 'lucide-react';
import { getCommandStream } from '../../services/aiClient';
import toast from 'react-hot-toast';

const COMMANDS = [
  { id: 'rewrite', icon: <Replace className="w-4 h-4" />, label: 'Rewrite' },
  { id: 'professional', icon: <Type className="w-4 h-4" />, label: 'Professional' },
  { id: 'shorter', icon: <Scissors className="w-4 h-4" />, label: 'Make Shorter' },
  { id: 'expand', icon: <AlignLeft className="w-4 h-4" />, label: 'Expand' },
  { id: 'grammar', icon: <Check className="w-4 h-4" />, label: 'Fix Grammar' },
  { id: 'ideas', icon: <Lightbulb className="w-4 h-4" />, label: 'Generate Ideas' },
  { id: 'summarize', icon: <Wand2 className="w-4 h-4" />, label: 'Summarize' }
];

export default function AiFloatingMenu({ quillRef, onGenerating }) {
  const [position, setPosition] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftState, setDraftState] = useState(null);
  
  useEffect(() => {
    if (!quillRef?.current) return;
    const quill = quillRef.current;

    const handleSelection = () => {
      const range = quill.getSelection();
      if (range && range.length > 0) {
        const bounds = quill.getBounds(range.index, range.length);
        setSelectedRange(range);
        setPosition({
          top: bounds.bottom + 10,
          left: bounds.left + (bounds.width / 2)
        });
      } else if (!isGenerating && !draftState) {
        setIsOpen(false);
        setPosition(null);
        setSelectedRange(null);
      }
    };

    quill.on('selection-change', handleSelection);
    return () => quill.off('selection-change', handleSelection);
  }, [quillRef]);

  const executeCommand = async (commandId) => {
    if (!quillRef?.current || !selectedRange) return;
    const quill = quillRef.current;
    const selectedText = quill.getText(selectedRange.index, selectedRange.length);
    const fullText = quill.getText();
    
    setIsOpen(false);
    setIsGenerating(true);
    onGenerating?.(true);
    
    // We replace the selection with the streaming response.
    // To do this smoothly, we clear the selection and start inserting.
    quill.deleteText(selectedRange.index, selectedRange.length, 'user');
    
    let currentIndex = selectedRange.index;
    
    try {
      const stream = getCommandStream(commandId, selectedText, fullText);
      for await (const chunk of stream) {
        quill.insertText(currentIndex, chunk, 'user');
        quill.formatText(currentIndex, chunk.length, 'background', 'rgba(168, 85, 247, 0.2)');
        currentIndex += chunk.length;
        // Keep scrolling to cursor if needed
        quill.setSelection(currentIndex);
      }
      
      setDraftState({
        startIndex: selectedRange.index,
        endIndex: currentIndex,
        originalText: selectedText
      });
      
      const bounds = quill.getBounds(currentIndex, 0);
      setPosition({
        top: bounds.bottom + 10,
        left: bounds.left
      });
    } catch (err) {
      console.error('Command Error:', err);
      toast.error('AI command failed');
    } finally {
      setIsGenerating(false);
      onGenerating?.(false);
      quill.setSelection(currentIndex);
    }
  };

  if (!position) return null;

  return (
    <div 
      className="absolute z-50 flex items-center -translate-x-1/2 shadow-lg rounded-full bg-card border border-border p-1 animate-in fade-in zoom-in-95 duration-200"
      style={{ top: position.top, left: position.left }}
    >
      {!isOpen && !isGenerating && !draftState && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
        >
          <Sparkles className="w-4 h-4" /> Ask AI
        </button>
      )}

      {isOpen && !isGenerating && !draftState && (
        <div className="flex items-center gap-1">
          {COMMANDS.map(cmd => (
            <button
              key={cmd.id}
              onClick={() => executeCommand(cmd.id)}
              className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
              title={cmd.label}
            >
              {cmd.icon}
            </button>
          ))}
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => setIsOpen(false)}
            className="px-2 py-1 text-xs text-muted hover:text-text"
          >
            Close
          </button>
        </div>
      )}

      {isGenerating && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-600">
          <Sparkles className="w-4 h-4 animate-pulse" />
          Generating...
        </div>
      )}

      {draftState && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (quillRef?.current) {
                quillRef.current.formatText(draftState.startIndex, draftState.endIndex - draftState.startIndex, 'background', false);
              }
              setDraftState(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-full transition-colors"
          >
            <Check className="w-4 h-4" /> Accept
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => {
              const quill = quillRef.current;
              if (quill) {
                quill.deleteText(draftState.startIndex, draftState.endIndex - draftState.startIndex, 'user');
                if (draftState.originalText) {
                  quill.insertText(draftState.startIndex, draftState.originalText, 'user');
                }
              }
              setDraftState(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors"
          >
            <X className="w-4 h-4" /> Reject
          </button>
        </div>
      )}
    </div>
  );
}
