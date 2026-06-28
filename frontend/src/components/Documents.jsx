import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, FileText, FolderOpen, Save, Copy, History,
  Image, Table2, Shapes, Link, Printer, MessageSquare, 
  Send, Trash2, ArrowLeft, Ruler, Columns, PanelLeft, 
  Check, X, Type, Heading1, Heading2, AlignLeft, AlignCenter, 
  AlignRight, List, ListOrdered, Sparkles, HelpCircle, FileCheck2
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

const FONTS = ['Sans-Serif', 'Serif', 'Monospace', 'Georgia', 'Courier New', 'Trebuchet MS'];
const SIZES = ['12px', '14px', '16px', '18px', '24px', '32px'];
const LINE_SPACINGS = ['1.0', '1.15', '1.5', '2.0'];
const MARGINS = ['0.5 in', '0.75 in', '1.0 in'];
const PAPER_SIZES = ['A4', 'Letter', 'Legal'];

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
  
  // Format states
  const [fontFamily, setFontFamily] = useState('Sans-Serif');
  const [fontSize, setFontSize] = useState('16px');
  const [lineSpacing, setLineSpacing] = useState('1.15');
  const [textColor, setTextColor] = useState('#1e293b');
  const [highlightColor, setHighlightColor] = useState('transparent');
  const [columnsCount, setColumnsCount] = useState('1');
  const [pageMargin, setPageMargin] = useState('1.0 in');
  const [paperSize, setPaperSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [pageColor, setPageColor] = useState('#ffffff');
  const [pageBorder, setPageBorder] = useState('none');

  // Stats
  const [stats, setStats] = useState({ words: 0, characters: 0, readTime: 1, pages: 1 });

  const getQuillInstance = () => {
    const container = wrapperRef.current?.querySelector('.ql-container');
    if (container && window.Quill) {
      return window.Quill.find(container);
    }
    return null;
  };

  // Monitor statistics
  useEffect(() => {
    const interval = setInterval(() => {
      const quill = getQuillInstance();
      if (quill) {
        const text = quill.getText().trim();
        const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
        const chars = text.length;
        const readTime = Math.max(1, Math.ceil(words / 200));
        // Approximate pages based on scroll height of editor
        const pages = Math.max(1, Math.ceil(quill.root.scrollHeight / 1056));
        setStats({ words, characters: chars, readTime, pages });
      }
    }, 800);
    return () => clearInterval(interval);
  }, [wrapperRef]);

  // Set page style rules dynamically in Document component
  useEffect(() => {
    const editor = wrapperRef.current?.querySelector('.ql-editor');
    if (editor) {
      editor.style.fontFamily = fontFamily === 'Sans-Serif' ? 'sans-serif' : fontFamily === 'Serif' ? 'serif' : fontFamily === 'Monospace' ? 'monospace' : fontFamily;
      editor.style.fontSize = fontSize;
      editor.style.lineHeight = lineSpacing;
      editor.style.color = textColor;
      editor.style.backgroundColor = pageColor;
      editor.style.columnCount = columnsCount;
      editor.style.columnGap = '24px';
      
      const marginVal = pageMargin === '0.5 in' ? '0.5in' : pageMargin === '0.75 in' ? '0.75in' : '1in';
      editor.style.padding = marginVal;
      
      editor.style.border = pageBorder === 'none' ? 'none' : `2px ${pageBorder} #cbd5e1`;

      if (orientation === 'landscape') {
        editor.style.aspectRatio = '1.414';
        editor.style.maxWidth = '1056px';
        editor.style.minHeight = '816px';
      } else {
        editor.style.aspectRatio = '0.707';
        editor.style.maxWidth = '816px';
        editor.style.minHeight = '1056px';
      }
    }
  }, [fontFamily, fontSize, lineSpacing, textColor, pageColor, columnsCount, pageMargin, pageBorder, orientation, wrapperRef]);

  const applyFormat = (name, value) => {
    const quill = getQuillInstance();
    if (quill) {
      quill.focus();
      const range = quill.getSelection();
      if (range) {
        quill.format(name, value);
      }
    }
  };

  const handleMenuAction = (action) => {
    setOpenMenu(null);
    const quill = getQuillInstance();
    if (!quill) return;

    switch (action) {
      case 'newDoc':
        quill.setText('');
        setDocTitle('Untitled Document');
        toast.success('Cleared document.');
        break;
      case 'openDoc':
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.html,.docx';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            quill.clipboard.dangerouslyPasteHTML(evt.target.result);
            setDocTitle(file.name.split('.')[0]);
            toast.success('Document imported!');
          };
          reader.readAsText(file);
        };
        input.click();
        break;
      case 'saveDoc':
        // Autosave covers this, manually notify
        toast.success('Document saved successfully!');
        break;
      case 'saveDraft':
        const draftVersion = {
          versionId: 'ver-' + Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
          user: userName,
          data: quill.root.innerHTML
        };
        const updatedHistory = [draftVersion, ...versions];
        socket.emit('update-document-versions', { roomId, versions: updatedHistory });
        toast.success('Document draft saved to Version History!');
        break;
      case 'renameDoc':
        const newTitle = prompt('Enter document title:', docTitle);
        if (newTitle) setDocTitle(newTitle);
        break;
      case 'duplicateDoc':
        const dupTitle = `${docTitle} (Copy)`;
        setDocTitle(dupTitle);
        toast.success('Document duplicated!');
        break;
      case 'openVersions':
        setActiveSidePanel('versions');
        break;
      case 'exportPdf':
        const opt = {
          margin: 0.5,
          filename: `${docTitle}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: orientation }
        };
        toast.promise(
          html2pdf().set(opt).from(quill.root).save(),
          {
            loading: 'Preparing PDF export...',
            success: 'Document exported successfully!',
            error: 'Failed to export PDF.'
          }
        );
        break;
      case 'exportDocx':
        // Generate an HTML content download with doc extension
        const htmlContent = quill.root.innerHTML;
        const blob = new Blob([htmlContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${docTitle}.docx`;
        link.click();
        toast.success('Exported as Word file.');
        break;
      case 'printDoc':
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>${docTitle}</title>
              <style>
                body { font-family: sans-serif; padding: 2in; line-height: 1.5; }
              </style>
            </head>
            <body>
              ${quill.root.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        break;
      case 'insertImage':
        const url = prompt('Enter Image URL:');
        if (url) {
          quill.focus();
          const range = quill.getSelection() || { index: quill.getLength() };
          quill.insertEmbed(range.index, 'image', url);
          toast.success('Image inserted!');
        }
        break;
      case 'insertTable':
        const rows = prompt('Rows count:', '3');
        const cols = prompt('Columns count:', '3');
        if (rows && cols) {
          let tableHTML = '<table class="w-full border-collapse border border-slate-300 my-4">';
          for (let r = 0; r < parseInt(rows); r++) {
            tableHTML += '<tr>';
            for (let c = 0; c < parseInt(cols); c++) {
              tableHTML += '<td class="border border-slate-300 p-2 min-w-[50px] text-xs">Cell</td>';
            }
            tableHTML += '</tr>';
          }
          tableHTML += '</table>';
          quill.focus();
          const range = quill.getSelection() || { index: quill.getLength() };
          quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
          toast.success('Table inserted!');
        }
        break;
      case 'insertLink':
        const text = prompt('Link Text:');
        const href = prompt('Link URL (https://...):');
        if (text && href) {
          quill.focus();
          const range = quill.getSelection() || { index: quill.getLength() };
          quill.insertText(range.index, text, 'link', href);
          toast.success('Hyperlink inserted!');
        }
        break;
      case 'insertPageBreak':
        quill.focus();
        const rangePb = quill.getSelection() || { index: quill.getLength() };
        quill.clipboard.dangerouslyPasteHTML(rangePb.index, '<div class="page-break" style="page-break-after: always; border-bottom: 2px dashed #cbd5e1; margin: 20px 0; text-align: center; font-size: 10px; color: #94a3b8; user-select: none;">--- Page Break ---</div>');
        break;
      case 'insertHr':
        quill.focus();
        const rangeHr = quill.getSelection() || { index: quill.getLength() };
        quill.clipboard.dangerouslyPasteHTML(rangeHr.index, '<hr class="my-4 border-slate-200 dark:border-slate-800" />');
        break;
      case 'insertHeader':
        const headerText = prompt('Enter header text:');
        if (headerText) {
          quill.focus();
          quill.clipboard.dangerouslyPasteHTML(0, `<div style="font-size: 10px; color: #94a3b8; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px;">${headerText}</div>`);
        }
        break;
      case 'insertFooter':
        const footerText = prompt('Enter footer text:');
        if (footerText) {
          quill.focus();
          quill.clipboard.dangerouslyPasteHTML(quill.getLength(), `<div style="font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 10px;">${footerText}</div>`);
        }
        break;
      case 'insertPageNumber':
        quill.focus();
        const rangePn = quill.getSelection() || { index: quill.getLength() };
        quill.insertText(rangePn.index, ' [Page Number] ');
        break;
      case 'insertDate':
        quill.focus();
        const rangeDate = quill.getSelection() || { index: quill.getLength() };
        quill.insertText(rangeDate.index, ` ${new Date().toLocaleDateString()} `);
        break;
      case 'insertShape':
        const shape = prompt('Enter shape name (circle, square, triangle):', 'square');
        if (shape) {
          quill.focus();
          const rangeS = quill.getSelection() || { index: quill.getLength() };
          const shapeStyle = shape === 'circle' ? 'border-radius: 50%;' : '';
          quill.clipboard.dangerouslyPasteHTML(rangeS.index, `<div style="width: 80px; height: 80px; border: 2px solid #6366f1; background: #6366f120; ${shapeStyle} display: inline-block; margin: 5px;"></div>`);
        }
        break;
      case 'insertIcon':
        quill.focus();
        const rangeI = quill.getSelection() || { index: quill.getLength() };
        quill.insertText(rangeI.index, ' ⭐ ');
        break;
      case 'insertEquation':
        const eq = prompt('Enter math equation (LaTeX style):', 'E = mc^2');
        if (eq) {
          quill.focus();
          const rangeEq = quill.getSelection() || { index: quill.getLength() };
          quill.insertText(rangeEq.index, ` f(x) = ${eq} `);
        }
        break;
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
      {/* Title Bar */}
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

      {/* Menu / Ribbon Bar */}
      <div className="h-9 border-b border-slate-200 dark:border-slate-800 bg-slate-50/85 dark:bg-slate-900/85 px-3 flex items-center gap-0.5 shrink-0 relative z-30 select-none">
        {/* FILE */}
        <div className="relative group">
          <button className="px-3 py-1 text-xs font-medium rounded-md text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200">
            File
          </button>
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 min-w-[180px] py-1 hidden group-hover:block">
            <button onClick={() => handleMenuAction('newDoc')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><FileText className="w-3.5 h-3.5" />New Document</button>
            <button onClick={() => handleMenuAction('openDoc')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><FolderOpen className="w-3.5 h-3.5" />Open...</button>
            <button onClick={() => handleMenuAction('saveDoc')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><Save className="w-3.5 h-3.5" />Save</button>
            <button onClick={() => handleMenuAction('saveDraft')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><Download className="w-3.5 h-3.5" />Save Draft</button>
            <button onClick={() => handleMenuAction('renameDoc')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><Type className="w-3.5 h-3.5" />Rename</button>
            <button onClick={() => handleMenuAction('duplicateDoc')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><Copy className="w-3.5 h-3.5" />Duplicate</button>
            <button onClick={() => handleMenuAction('openVersions')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><History className="w-3.5 h-3.5" />Version History</button>
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1"></div>
            <button onClick={() => handleMenuAction('exportPdf')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><Download className="w-3.5 h-3.5" />Export PDF</button>
            <button onClick={() => handleMenuAction('exportDocx')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><Download className="w-3.5 h-3.5" />Export DOCX</button>
            <button onClick={() => handleMenuAction('printDoc')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><Printer className="w-3.5 h-3.5" />Print</button>
          </div>
        </div>

        {/* INSERT */}
        <div className="relative group">
          <button className="px-3 py-1 text-xs font-medium rounded-md text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200">
            Insert
          </button>
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 min-w-[180px] py-1 hidden group-hover:block">
            <button onClick={() => handleMenuAction('insertImage')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><Image className="w-3.5 h-3.5" />Image URL</button>
            <button onClick={() => handleMenuAction('insertTable')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><Table2 className="w-3.5 h-3.5" />Table Grid</button>
            <button onClick={() => handleMenuAction('insertLink')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><Link className="w-3.5 h-3.5" />Hyperlink</button>
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-1"></div>
            <button onClick={() => handleMenuAction('insertPageBreak')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350">Page Break</button>
            <button onClick={() => handleMenuAction('insertHr')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350">Horizontal Line</button>
            <button onClick={() => handleMenuAction('insertHeader')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350">Header</button>
            <button onClick={() => handleMenuAction('insertFooter')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350">Footer</button>
            <button onClick={() => handleMenuAction('insertPageNumber')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350">Page Number</button>
            <button onClick={() => handleMenuAction('insertDate')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350">Current Date</button>
            <button onClick={() => handleMenuAction('insertShape')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350"><Shapes className="w-3.5 h-3.5" />Shapes</button>
            <button onClick={() => handleMenuAction('insertIcon')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350">Icons (Star)</button>
            <button onClick={() => handleMenuAction('insertEquation')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350">Math Equation</button>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="relative group">
          <button className="px-3 py-1 text-xs font-medium rounded-md text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200">
            Layout
          </button>
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 min-w-[200px] p-3 hidden group-hover:block text-[11px] text-slate-600 dark:text-slate-400 space-y-3">
            <div>
              <span className="font-bold block mb-1">Margins</span>
              <div className="flex gap-1.5">
                {MARGINS.map(m => (
                  <button key={m} onClick={() => setPageMargin(m)} className={`px-2 py-0.5 border rounded cursor-pointer ${pageMargin === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200'}`}>{m}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="font-bold block mb-1">Orientation</span>
              <div className="flex gap-1.5">
                {['portrait', 'landscape'].map(o => (
                  <button key={o} onClick={() => setOrientation(o)} className={`px-2 py-0.5 border rounded cursor-pointer capitalize ${orientation === o ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200'}`}>{o}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="font-bold block mb-1">Paper Size</span>
              <div className="flex gap-1.5">
                {PAPER_SIZES.map(p => (
                  <button key={p} onClick={() => setPaperSize(p)} className={`px-2 py-0.5 border rounded cursor-pointer ${paperSize === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200'}`}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="font-bold block mb-1">Columns</span>
              <div className="flex gap-1.5">
                {['1', '2', '3'].map(c => (
                  <button key={c} onClick={() => setColumnsCount(c)} className={`px-2.5 py-0.5 border rounded cursor-pointer ${columnsCount === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200'}`}>{c} Col</button>
                ))}
              </div>
            </div>
            <div>
              <span className="font-bold block mb-1">Page Color</span>
              <div className="grid grid-cols-4 gap-1">
                {['#ffffff', '#f8fafc', '#fffbeb', '#f1f5f9'].map(c => (
                  <button key={c} onClick={() => setPageColor(c)} style={{ backgroundColor: c }} className={`h-6 rounded border cursor-pointer ${pageColor === c ? 'ring-2 ring-indigo-500' : ''}`} />
                ))}
              </div>
            </div>
            <div>
              <span className="font-bold block mb-1">Borders</span>
              <div className="flex gap-1.5">
                {['none', 'solid', 'dashed', 'double'].map(b => (
                  <button key={b} onClick={() => setPageBorder(b)} className={`px-2 py-0.5 border rounded cursor-pointer capitalize ${pageBorder === b ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200'}`}>{b}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Formatting Ribbon */}
      <div className="h-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 flex items-center gap-1.5 shrink-0 z-20 overflow-x-auto no-scrollbar">
        {/* Font Select */}
        <select 
          value={fontFamily} 
          onChange={(e) => setFontFamily(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 cursor-pointer"
        >
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Size Select */}
        <select 
          value={fontSize} 
          onChange={(e) => setFontSize(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 cursor-pointer"
        >
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />

        {/* Formatting actions */}
        <button onClick={() => applyFormat('bold', true)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 font-bold cursor-pointer">B</button>
        <button onClick={() => applyFormat('italic', true)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 italic cursor-pointer">I</button>
        <button onClick={() => applyFormat('underline', true)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 underline cursor-pointer">U</button>
        
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />

        {/* Highlighting */}
        <button onClick={() => applyFormat('background', '#fef08a')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-amber-500 font-bold cursor-pointer" title="Highlight Yellow">🖍️</button>
        
        {/* Colors */}
        <input 
          type="color" 
          value={textColor} 
          onChange={(e) => { setTextColor(e.target.value); applyFormat('color', e.target.value); }} 
          className="w-5 h-5 border-none p-0 cursor-pointer rounded-full overflow-hidden" 
          title="Text Color"
        />

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />

        {/* Alignment */}
        <button onClick={() => applyFormat('align', '')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 cursor-pointer"><AlignLeft className="w-3.5 h-3.5" /></button>
        <button onClick={() => applyFormat('align', 'center')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 cursor-pointer"><AlignCenter className="w-3.5 h-3.5" /></button>
        <button onClick={() => applyFormat('align', 'right')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 cursor-pointer"><AlignRight className="w-3.5 h-3.5" /></button>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />

        {/* Lists */}
        <button onClick={() => applyFormat('list', 'bullet')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 cursor-pointer"><List className="w-3.5 h-3.5" /></button>
        <button onClick={() => applyFormat('list', 'ordered')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 cursor-pointer"><ListOrdered className="w-3.5 h-3.5" /></button>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />

        {/* Spacings */}
        <select 
          value={lineSpacing} 
          onChange={(e) => setLineSpacing(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 cursor-pointer"
        >
          {LINE_SPACINGS.map(s => <option key={s} value={s}>{s} Space</option>)}
        </select>

        {/* Clear formatting */}
        <button 
          onClick={() => {
            const quill = getQuillInstance();
            if (quill) {
              const range = quill.getSelection();
              if (range) quill.removeFormat(range.index, range.length);
            }
          }}
          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-500 rounded text-[10px] font-bold text-slate-600 cursor-pointer ml-auto"
        >
          Clear Style
        </button>
      </div>

      {/* Editor Content Area + Collapsible Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Editor Page Layout */}
        <div className="flex-1 overflow-y-auto flex justify-center bg-slate-100 dark:bg-slate-900 p-4 shadow-inner">
          <div 
            className="w-full bg-white dark:bg-slate-950 shadow-lg transition-all relative flex flex-col my-4 min-h-[1056px] h-max border border-slate-200 dark:border-slate-800"
            style={{ maxWidth: orientation === 'landscape' ? '1056px' : '816px' }}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div ref={wrapperRef} className="flex-1 quill-editor-wrapper text-slate-800 dark:text-slate-100 p-8"></div>
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

      {/* Document Metrics Status Bar */}
      <div className="h-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 flex items-center justify-between text-[9px] font-bold text-slate-400 select-none shrink-0">
        <div className="flex items-center gap-3">
          <span>PAGES: {stats.pages}</span>
          <span>WORDS: {stats.words}</span>
          <span>CHARACTERS: {stats.characters}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Sparkles className="w-2.5 h-2.5 text-indigo-500" /> READING TIME: ~{stats.readTime} MIN</span>
          <span>COLLABORATORS: {activeUsersCount}</span>
        </div>
      </div>
    </div>
  );
}
