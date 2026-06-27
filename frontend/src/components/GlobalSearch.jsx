import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, TableProperties, Presentation, Folder, Calendar, CheckSquare, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalSearch({
  isOpen,
  onClose,
  activeApp,
  setActiveApp,
  roomId,
  // Search sources passed from parent state
  documentText = '',
  spreadsheetGrid = [],
  slidesList = [],
  chatHistory = [],
  filesList = [],
  tasksList = []
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const tempResults = [];

    // 1. Search Documents
    if (documentText && documentText.toLowerCase().includes(q)) {
      tempResults.push({
        id: 'search-doc',
        app: 'docs',
        type: 'Document',
        icon: FileText,
        title: 'Document Content Match',
        description: `Found: "${documentText.substring(Math.max(0, documentText.toLowerCase().indexOf(q) - 20), Math.min(documentText.length, documentText.toLowerCase().indexOf(q) + 40))}..."`
      });
    }

    // 2. Search Spreadsheets
    let cellMatches = 0;
    spreadsheetGrid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && String(cell).toLowerCase().includes(q)) {
          cellMatches++;
          if (cellMatches <= 3) {
            tempResults.push({
              id: `search-sheet-${r}-${c}`,
              app: 'sheets',
              type: 'Spreadsheet',
              icon: TableProperties,
              title: `Cell ${String.fromCharCode(65 + c)}${r + 1}`,
              description: `Contains: "${cell}"`
            });
          }
        }
      });
    });

    // 3. Search Slides
    slidesList.forEach((slide, idx) => {
      if (
        (slide.title && slide.title.toLowerCase().includes(q)) ||
        (slide.content && slide.content.toLowerCase().includes(q))
      ) {
        tempResults.push({
          id: `search-slide-${idx}`,
          app: 'slides',
          type: 'Presentation',
          icon: Presentation,
          title: `Slide ${idx + 1}: ${slide.title || 'Untitled'}`,
          description: slide.content || ''
        });
      }
    });

    // 4. Search Files
    filesList.forEach((file) => {
      if (file.name && file.name.toLowerCase().includes(q)) {
        tempResults.push({
          id: `search-file-${file.id}`,
          app: 'files',
          type: 'Shared File',
          icon: Folder,
          title: file.name,
          description: `Size: ${(file.size / 1024).toFixed(1)} KB | Uploaded by ${file.uploadedBy || 'system'}`
        });
      }
    });

    // 5. Search Tasks
    tasksList.forEach((task) => {
      if (
        (task.title && task.title.toLowerCase().includes(q)) ||
        (task.description && task.description.toLowerCase().includes(q))
      ) {
        tempResults.push({
          id: `search-task-${task.id}`,
          app: 'tasks',
          type: 'Task',
          icon: CheckSquare,
          title: task.title,
          description: `Status: ${task.status.replace('-', ' ')} | Priority: ${task.priority}`
        });
      }
    });

    // 6. Search Chat Messages
    chatHistory.forEach((msg, idx) => {
      if (msg.message && msg.message.toLowerCase().includes(q)) {
        tempResults.push({
          id: `search-chat-${idx}`,
          app: 'chat',
          type: 'Chat Message',
          icon: MessageSquare,
          title: `${msg.user || 'Collaborator'}`,
          description: `"${msg.message}"`
        });
      }
    });

    setResults(tempResults);
  }, [query, documentText, spreadsheetGrid, slidesList, chatHistory, filesList, tasksList]);

  const handleSelect = (item) => {
    setActiveApp(item.app);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs cursor-pointer"
          />

          {/* Dialog Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[60vh] transition-colors"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents, spreadsheets, slides, files, tasks..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
              <kbd className="px-2 py-0.5 bg-slate-200/50 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-mono rounded border border-slate-300/30 select-none">ESC</kbd>
              <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {!query.trim() ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                  Type a search query to search across the whole workspace.
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No matches found for "{query}".
                </div>
              ) : (
                results.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors shrink-0">
                        <ItemIcon className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{item.title}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 px-1.5 py-0.5 rounded-full">{item.type}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{item.description}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
