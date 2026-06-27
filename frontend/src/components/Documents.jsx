import React, { useState } from 'react';
import { 
  Download, FileText, 
  Image, Table2, Shapes, Link, 
  BarChart3, File, Type, List,
  Printer, MessageSquare, History, Send, Trash2, ArrowLeft,
  Ruler, Columns, PanelLeft, Replace, Check, X
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

const MENU_ITEMS = {
  File: [
    { label: 'New Document', icon: FileText },
    { label: 'Save Draft', icon: Download, action: 'saveDraft' },
    { label: 'Export as PDF', icon: Download, action: 'exportPdf' },
    { label: 'Print', icon: Printer },
  ],
  Insert: [
    { label: 'Image', icon: Image, action: 'insertImage' },
    { label: 'Table', icon: Table2, action: 'insertTable' },
    { label: 'Link', icon: Link, action: 'insertLink' },
  ],
  Layout: [
    { label: 'Margins', icon: Ruler },
    { label: 'Columns', icon: Columns },
    { label: 'Page Setup', icon: PanelLeft },
  ],
  Review: [
    { label: 'Spell Check', icon: Type },
    { label: 'Word Count', icon: List }
  ]
};

export default function Documents({
  wrapperRef,
  isSaving,
  activeUsersCount,
  comments = [],
  socket,
  roomId,
  userName,
  versions = [],
  onRevertVersion
}) {
  const [docTitle, setDocTitle] = useState('Untitled Document');
  const [openMenu, setOpenMenu] = useState(null);
  const [activeSidePanel, setActiveSidePanel] = useState(null); // null | 'comments' | 'versions'
  const [commentInput, setCommentInput] = useState('');

  const exportToPDF = () => {
    const element = wrapperRef.current?.querySelector('.ql-editor');
    if (!element) {
      toast.error('Unable to find document content to export.');
      return;
    }

    const opt = {
      margin: 1,
      filename: `${docTitle}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    toast.promise(
      html2pdf().set(opt).from(element).save(),
      {
        loading: 'Preparing PDF export...',
        success: 'Document exported successfully!',
        error: 'Failed to export PDF.'
      }
    );
  };

  const handleMenuAction = (item) => {
    setOpenMenu(null);
    if (item.action === 'exportPdf') {
      exportToPDF();
    } else if (item.action === 'saveDraft') {
      // Manual trigger to append a version
      const editor = wrapperRef.current?.querySelector('.ql-editor');
      if (editor) {
        const text = editor.innerHTML;
        const newVersion = {
          versionId: 'ver-' + Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
          user: userName,
          data: text
        };
        const updated = [newVersion, ...versions];
        socket.emit('update-document-versions', { roomId, versions: updated });
        toast.success('Document draft saved in version history!');
      }
    } else if (item.action === 'insertImage') {
      const url = prompt('Enter Image URL:');
      if (url) {
        const editor = wrapperRef.current?.querySelector('.ql-editor');
        if (editor) editor.innerHTML += `<img src="${url}" class="max-w-md my-4 rounded-lg shadow-sm" />`;
        toast.success('Image inserted!');
      }
    } else if (item.action === 'insertTable') {
      const rows = prompt('Rows count:', '3');
      const cols = prompt('Columns count:', '3');
      if (rows && cols) {
        let tableHTML = '<table class="border-collapse border border-slate-300 my-4 w-full">';
        for (let r = 0; r < parseInt(rows); r++) {
          tableHTML += '<tr>';
          for (let c = 0; c < parseInt(cols); c++) {
            tableHTML += '<td class="border border-slate-300 p-2 text-xs">Cell</td>';
          }
          tableHTML += '</tr>';
        }
        tableHTML += '</table>';
        const editor = wrapperRef.current?.querySelector('.ql-editor');
        if (editor) editor.innerHTML += tableHTML;
        toast.success('Table inserted!');
      }
    } else if (item.action === 'insertLink') {
      const text = prompt('Link Text:');
      const url = prompt('Link URL (https://...):');
      if (text && url) {
        const editor = wrapperRef.current?.querySelector('.ql-editor');
        if (editor) editor.innerHTML += ` <a href="${url}" class="text-indigo-600 underline" target="_blank">${text}</a> `;
        toast.success('Link inserted!');
      }
    } else {
      toast(`${item.label} (coming soon)`, { icon: '📝' });
    }
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    const commentObj = {
      id: 'comment-' + Math.random().toString(36).substring(7),
      user: userName,
      text: commentInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [...comments, commentObj];
    socket.emit('update-document-comments', { roomId, comments: updated });
    setCommentInput('');
    toast.success('Comment thread added!');
  };

  const handleDeleteComment = (commentId) => {
    const updated = comments.filter((c) => c.id !== commentId);
    socket.emit('update-document-comments', { roomId, comments: updated });
    toast.success('Comment resolved.');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden h-full">
      {/* Document Title Bar */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="font-semibold text-sm text-slate-800 dark:text-slate-100 bg-transparent border-none focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/40 px-2 py-1 rounded-md max-w-[200px] md:max-w-md transition-colors"
            placeholder="Untitled Document"
          />
          {isSaving ? (
            <span className="text-[10px] text-indigo-500 animate-pulse bg-indigo-500/5 px-2 py-0.5 rounded-full border border-indigo-500/10">Saving...</span>
          ) : (
            <span className="text-[10px] text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">Saved</span>
          )}
        </div>

        {/* Side Panel Toggle Toggles */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveSidePanel(activeSidePanel === 'comments' ? null : 'comments')}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              activeSidePanel === 'comments'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Comments Sidebar"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setActiveSidePanel(activeSidePanel === 'versions' ? null : 'versions')}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              activeSidePanel === 'versions'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Version History"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Word-like Ribbon Menu Bar */}
      <div className="h-9 border-b border-slate-200 dark:border-slate-800 bg-slate-50/85 dark:bg-slate-900/85 px-3 flex items-center gap-0.5 shrink-0 relative z-30">
        {Object.keys(MENU_ITEMS).map((menuName) => (
          <div key={menuName} className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === menuName ? null : menuName)}
              onMouseEnter={() => openMenu && setOpenMenu(menuName)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                openMenu === menuName
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {menuName}
            </button>

            {/* Dropdown */}
            {openMenu === menuName && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 min-w-[200px] py-1.5 overflow-hidden">
                  {MENU_ITEMS[menuName].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleMenuAction(item)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <item.icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Editor Content Area + Collapsible Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Editor */}
        <div className="flex-1 overflow-y-auto flex justify-center no-scrollbar bg-slate-50 dark:bg-slate-900">
          <div className="w-full max-w-none bg-white dark:bg-slate-950 border-x border-slate-200/60 dark:border-slate-800 min-h-full transition-colors relative flex flex-col">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div ref={wrapperRef} className="flex-1 quill-editor-wrapper"></div>
          </div>
        </div>

        {/* Collapsible sidebar panels */}
        {activeSidePanel === 'comments' && (
          <div className="w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col shrink-0 text-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/10 shrink-0">
              <span>Comments Threads</span>
              <button onClick={() => setActiveSidePanel(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Thread list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {comments.length === 0 ? (
                <p className="italic text-slate-400 text-center py-6">No comment threads in this document.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-3 relative">
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="absolute top-2.5 right-2.5 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-300 hover:text-rose-500 rounded-md cursor-pointer"
                      title="Resolve Thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 mb-1">
                      <span>{c.user}</span>
                      <span>{c.timestamp}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 leading-normal">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input field */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              <button 
                onClick={handleAddComment}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {activeSidePanel === 'versions' && (
          <div className="w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col shrink-0 text-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/10 shrink-0">
              <span>Version History</span>
              <button onClick={() => setActiveSidePanel(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {versions.length === 0 ? (
                <p className="italic text-slate-400 text-center py-6">No saved history drafts.</p>
              ) : (
                versions.map((ver, i) => (
                  <div 
                    key={ver.versionId} 
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-400">
                      <span>Draft #{versions.length - i}</span>
                      <span>{ver.timestamp}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Saved by {ver.user}</p>
                    <button
                      onClick={() => onRevertVersion(ver)}
                      className="w-full py-1.5 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-bold transition-all cursor-pointer border border-indigo-100/50 dark:border-indigo-900/20"
                    >
                      Restore Draft
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
