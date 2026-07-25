import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '../services/apiBaseUrl';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function AiTaskModal({ isOpen, onClose, onInsertTasks, workspaceId }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const url = `${getApiBaseUrl()}/api/v1/ai/generate-tasks`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, workspaceId }),
        credentials: 'include'
      });

      if (!response.ok) {
        let msg = 'Failed to generate tasks.';
        try {
          const data = await response.json();
          if (data.message) msg = data.message;
        } catch {}
        throw new Error(msg);
      }

      const data = await response.json();
      const rawTasks = data.tasks || [];
      
      const formattedTasks = rawTasks.map(t => ({
        id: uuidv4(),
        title: t.title || 'Untitled Task',
        description: t.description || '',
        assignee: t.assignee || '',
        dueDate: t.deadline || '', // YYYY-MM-DD
        priority: t.priority || 'Medium',
        completed: false
      }));

      onInsertTasks(formattedTasks);
      toast.success(`${formattedTasks.length} tasks generated successfully!`);
      onClose();
      setPrompt('');
    } catch (err) {
      console.error('Generate Error:', err);
      toast.error(err.message || 'AI task generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card-sunken">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-text">AI Task Extractor</h3>
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
            <label className="text-sm font-medium text-text-secondary">Paste Meeting Notes or Chat Log</label>
            <textarea
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., John needs to finish the design by Friday. Sarah will update the database schema tomorrow."
              className="w-full h-32 px-3 py-2 text-sm bg-transparent border border-border rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all placeholder:text-muted"
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
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Extract Tasks
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
