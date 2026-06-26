import React from 'react';
import { 
  Download, FileText, 
  Image, Table2, Shapes, Link, 
  BarChart3, File, Type, List,
  Printer,
  Bookmark, Languages, SpellCheck2 as SpellCheck, ZoomIn, ZoomOut, Maximize2, Eye,
  Ruler, Columns, PanelLeft, Replace
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

const MENU_ITEMS = {
  File: [
    { label: 'New Document', icon: FileText },
    { label: 'Save', icon: Download },
    { label: 'Export as PDF', icon: Download, action: 'exportPdf' },
    { label: 'Print', icon: Printer },
  ],
  Insert: [
    { label: 'Image', icon: Image },
    { label: 'Table', icon: Table2 },
    { label: 'Shape', icon: Shapes },
    { label: 'Link', icon: Link },
    { label: 'Chart', icon: BarChart3 },
    { label: 'File', icon: File },
  ],
  Layout: [
    { label: 'Margins', icon: Ruler },
    { label: 'Columns', icon: Columns },
    { label: 'Page Setup', icon: PanelLeft },
  ],
  References: [
    { label: 'Table of Contents', icon: List },
    { label: 'Bookmark', icon: Bookmark },
    { label: 'Footnote', icon: Type },
  ],
  Review: [
    { label: 'Spell Check', icon: SpellCheck },
    { label: 'Language', icon: Languages },
    { label: 'Find & Replace', icon: Replace },
  ],
  View: [
    { label: 'Zoom In', icon: ZoomIn },
    { label: 'Zoom Out', icon: ZoomOut },
    { label: 'Full Width', icon: Maximize2 },
    { label: 'Reading Mode', icon: Eye },
  ],
  Help: [
    { label: 'Keyboard Shortcuts', icon: Type },
    { label: 'About', icon: FileText },
  ],
};

export default function Documents({
  wrapperRef,
  isSaving,
  activeUsersCount
}) {
  const [docTitle, setDocTitle] = React.useState('Untitled Document');
  const [openMenu, setOpenMenu] = React.useState(null);

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
    if (item.action === 'exportPdf') {
      exportToPDF();
    } else {
      toast(`${item.label} (coming soon)`, { icon: '📝' });
    }
    setOpenMenu(null);
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

        <div className="flex items-center gap-1.5">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Word-like Ribbon Menu Bar */}
      <div className="h-9 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 px-3 flex items-center gap-0.5 shrink-0 relative z-30">
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

      {/* Editor Content Area - Full Width, No Side Panel */}
      <div className="flex-1 overflow-hidden">
        <div className="w-full h-full overflow-y-auto flex justify-center no-scrollbar">
          <div className="w-full max-w-none bg-white dark:bg-slate-950 border-x border-slate-200/60 dark:border-slate-800 min-h-full transition-colors relative flex flex-col">
            {/* Top gradient accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            
            {/* Quill editor mounts here */}
            <div ref={wrapperRef} className="flex-1 quill-editor-wrapper"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
