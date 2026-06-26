import React from 'react';
import { Download, FileText, MessageSquare, History, Sparkles } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

export default function Documents({
  wrapperRef,
  isSaving,
  activeUsersCount
}) {
  const [docTitle, setDocTitle] = React.useState('Untitled Document');

  const exportToPDF = () => {
    // Locate the Quill editor element
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

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden h-full">
      {/* Document Topbar */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="font-bold text-sm text-slate-800 dark:text-slate-100 bg-transparent border-none focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/40 px-2 py-1 rounded-md max-w-[240px] md:max-w-md transition-colors"
            placeholder="Untitled Document"
          />
          {isSaving ? (
            <span className="text-[10px] text-indigo-500 animate-pulse bg-indigo-500/5 px-2 py-0.5 rounded-full border border-indigo-500/10">Saving...</span>
          ) : (
            <span className="text-[10px] text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">Saved</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Document Page Wrapper */}
        <div className="flex-1 overflow-y-auto p-0 flex justify-center no-scrollbar">
          <div className="w-full max-w-none bg-white dark:bg-slate-950 border-x border-slate-200/60 dark:border-slate-800 min-h-full transition-colors relative flex flex-col mb-0">
            {/* Embedded document border elements mimicking real paper */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
            
            {/* Quill editor mounts inside wrapperRef */}
            <div ref={wrapperRef} className="flex-1 quill-editor-wrapper"></div>
          </div>
        </div>

        {/* Right Sidebar Placeholder: Comments & History */}
        <div className="w-64 border-l border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 hidden xl:flex flex-col p-4 transition-colors">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 text-slate-700 dark:text-slate-300">
            <MessageSquare className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Comments & Notes</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-slate-500">
            <Sparkles className="w-8 h-8 text-indigo-500/20 mb-2" />
            <span className="text-xs font-semibold">No comments yet</span>
            <span className="text-[10px] mt-1">Highlight text in the editor to leave a comment.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
