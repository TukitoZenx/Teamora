import { useEffect, useState, useRef } from 'react';
import { getAutocompleteStream } from '../../services/aiClient';

export default function AiAutocomplete({ quillRef }) {
  const [suggestion, setSuggestion] = useState('');
  const [position, setPosition] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef(null);
  const streamAbortController = useRef(null);

  useEffect(() => {
    if (!quillRef?.current) return;

    const quill = quillRef.current;

    const fetchSuggestion = async (range) => {
      // Abort any existing stream
      if (streamAbortController.current) {
        streamAbortController.current.abort();
      }

      // Get context (last 500 characters)
      const text = quill.getText(0, range.index);
      if (text.trim().length < 20) return; // Need some context to guess

      const contextText = text.slice(-500);
      const bounds = quill.getBounds(range.index);
      
      setPosition({ top: bounds.top, left: bounds.right });
      setSuggestion('');
      setIsLoading(true);

      streamAbortController.current = new AbortController();
      let currentSuggestion = '';

      try {
        const stream = getAutocompleteStream(contextText);
        for await (const chunk of stream) {
          if (streamAbortController.current.signal.aborted) break;
          setIsLoading(false);
          currentSuggestion += chunk;
          setSuggestion(currentSuggestion);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Autocomplete Error:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const handleTextChange = (delta, oldDelta, source) => {
      if (source !== 'user') return;
      
      setSuggestion('');
      setPosition(null);
      setIsLoading(false);
      
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
        const range = quill.getSelection();
        if (range && range.length === 0) { // Only autocomplete if no text is selected
          fetchSuggestion(range);
        }
      }, 500);
    };

    const handleSelectionChange = (range, oldRange, source) => {
      if (!range || range.length > 0) {
        setSuggestion('');
        setPosition(null);
        setIsLoading(false);
        if (streamAbortController.current) streamAbortController.current.abort();
      }
    };

    quill.on('text-change', handleTextChange);
    quill.on('selection-change', handleSelectionChange);

    return () => {
      quill.off('text-change', handleTextChange);
      quill.off('selection-change', handleSelectionChange);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (streamAbortController.current) streamAbortController.current.abort();
    };
  }, [quillRef]);

  useEffect(() => {
    if (!suggestion || !quillRef?.current) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        
        const quill = quillRef.current;
        const range = quill.getSelection();
        if (range) {
          quill.insertText(range.index, suggestion, 'user');
          quill.setSelection(range.index + suggestion.length);
        }
        setSuggestion('');
        setPosition(null);
        setIsLoading(false);
      } else if (e.key === 'Escape' || e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        setSuggestion('');
        setPosition(null);
        setIsLoading(false);
      }
    };

    // Need to attach to the Quill editor's root element to intercept tab
    const editorEl = quillRef.current.root;
    editorEl.addEventListener('keydown', handleKeyDown, true);

    return () => {
      editorEl.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [suggestion, quillRef]);

  if (!suggestion && !isLoading) return null;
  if (!position) return null;

  return (
    <div
      className="pointer-events-none absolute z-50 transition-opacity flex items-center"
      style={{
        top: position.top,
        left: position.left,
        fontSize: '1em',
        fontFamily: 'inherit',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap'
      }}
    >
      {isLoading && (
        <span className="flex items-center gap-1 ml-1 text-purple-400 opacity-60 animate-pulse">
          <svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
      {!isLoading && suggestion && (
        <span className="text-muted-foreground opacity-50">{suggestion}</span>
      )}
    </div>
  );
}
