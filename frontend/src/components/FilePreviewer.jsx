import React, { useState } from 'react';
import { 
  Download, Eye, File, FileText, ImageIcon, Play, Volume2, X, Info, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FilePreviewer({
  file,
  onClose,
  onDownload
}) {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'meta'

  const formatSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Syntax highlighting regex-based tokenizer
  const highlightCode = (codeText, type = '') => {
    if (!codeText) return '';
    // Safe HTML Escape
    let escaped = codeText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // RegExp matching comments, strings, numbers, builtins and standard control flow keywords
    const tokenRegex = new RegExp(
      `(?<comment>\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|#[^\\n]*)|` +
      `(?<string>"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`(?:\\\\.|[^\`\\\\])*\`)|` +
      `\\b(?<keyword>const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|import|export|from|class|extends|new|this|typeof|instanceof|in|of|public|private|protected|static|void|int|float|double|char|boolean|string|package|try|catch|finally|throw|throws|struct|enum|type|interface|as|namespace|any|fn|impl|pub|use|mod|mut|match|go|chan|select|defer|map|range)\\b|` +
      `\\b(?<number>\\d+(?:\\.\\d+)?)\\b|` +
      `\\b(?<builtin>console|log|window|document|process|require|module|exports|self|global|Math|JSON|Object|Array|String|Number|Boolean|Map|Set|Promise|Error|print|len|range|str|int|float|dict|list|set|tuple|append|slice|make|panic|recover|fmt|Println|Printf)\\b`,
      'g'
    );

    // Apply spans with styled classes
    return escaped.replace(tokenRegex, (match, ...args) => {
      const groups = args[args.length - 1] || {};
      if (groups.comment) return `<span class="text-slate-500 italic">${match}</span>`;
      if (groups.string) return `<span class="text-amber-300 font-medium">${match}</span>`;
      if (groups.keyword) return `<span class="text-pink-400 font-bold">${match}</span>`;
      if (groups.number) return `<span class="text-emerald-400 font-mono">${match}</span>`;
      if (groups.builtin) return `<span class="text-cyan-400">${match}</span>`;
      return match;
    });
  };

  const isCodeOrText = (mimeType = '', fileName = '') => {
    const textExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.html', '.css', '.json', '.md', '.txt', '.csv'];
    const lowerName = fileName.toLowerCase();
    return textExtensions.some(ext => lowerName.endsWith(ext)) || mimeType.startsWith('text/') || mimeType.includes('json');
  };

  const getLanguage = (fileName = '') => {
    const extMatch = fileName.match(/\.([^.]+)$/);
    return extMatch ? extMatch[1].toUpperCase() : 'TEXT';
  };

  const renderPreview = () => {
    if (!file || !file.content) {
      return (
        <div className="text-center text-slate-400 py-12">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-30 text-slate-450" />
          <p className="text-sm font-semibold">No Preview Available</p>
          <p className="text-xs text-slate-500 mt-1">This file type must be downloaded to be viewed.</p>
          <button
            onClick={() => onDownload(file)}
            className="mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {file.name}</span>
          </button>
        </div>
      );
    }

    const type = file.type || '';
    const name = file.name || '';

    // Images Preview
    if (type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center p-6 bg-slate-900 rounded-2xl border border-white/5 max-h-[50vh] overflow-hidden">
          <img 
            src={file.content} 
            alt={name} 
            className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-lg"
          />
        </div>
      );
    }

    // Video Previews
    if (type.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center p-4 bg-slate-950 rounded-2xl border border-white/5 overflow-hidden">
          <video 
            src={file.content} 
            controls 
            className="w-full max-w-2xl rounded-lg shadow-lg"
          />
        </div>
      );
    }

    // Audio Previews
    if (type.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-2xl border border-white/5 text-center">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-4">
            <Volume2 className="w-7 h-7" />
          </div>
          <p className="text-xs font-semibold text-slate-350 mb-4">{name}</p>
          <audio src={file.content} controls className="w-full max-w-md" />
        </div>
      );
    }

    // PDFs Preview
    if (type === 'application/pdf') {
      return (
        <iframe 
          src={file.content} 
          title={name} 
          className="w-full h-[55vh] rounded-2xl border border-white/5 shadow"
        />
      );
    }

    // Code & Text Syntax Highlighting
    if (isCodeOrText(type, name)) {
      const codeHTML = highlightCode(file.content, getLanguage(name));
      return (
        <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 text-slate-300 w-full text-left font-mono text-[11px] leading-relaxed shadow-lg max-h-[55vh] flex flex-col">
          <div className="h-8 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase select-none">
            <span>{getLanguage(name)} Preview</span>
            <span>{file.content.split('\n').length} Lines</span>
          </div>
          <div className="flex-1 overflow-auto p-4 custom-scrollbar whitespace-pre no-scrollbar">
            <code dangerouslySetInnerHTML={{ __html: codeHTML }} />
          </div>
        </div>
      );
    }

    // Fallback info
    return (
      <div className="text-center text-slate-400 py-12">
        <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-30 text-slate-450" />
        <p className="text-sm font-semibold">Preview Unavailable</p>
        <p className="text-xs text-slate-500 mt-1">Downloading is recommended for this format.</p>
        <button
          onClick={() => onDownload(file)}
          className="mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-md"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download {file.name}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh] overflow-hidden">
        
        {/* Preview Titlebar */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1 bg-indigo-50 dark:bg-indigo-950 rounded text-indigo-500">
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-white truncate" title={file.name}>
              {file.name}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onDownload(file)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-450 rounded-lg cursor-pointer"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-850 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport tabs */}
        <div className="h-8 border-b border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 px-5 flex items-center gap-4 text-[10px] font-bold text-slate-400 shrink-0 select-none">
          <button 
            onClick={() => setActiveTab('preview')}
            className={`border-b-2 py-1 cursor-pointer ${activeTab === 'preview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent hover:text-slate-700'}`}
          >
            File Preview
          </button>
          <button 
            onClick={() => setActiveTab('meta')}
            className={`border-b-2 py-1 cursor-pointer ${activeTab === 'meta' ? 'border-indigo-500 text-indigo-600' : 'border-transparent hover:text-slate-700'}`}
          >
            Properties & History
          </button>
        </div>

        {/* Contents Area */}
        <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
          {activeTab === 'preview' ? (
            renderPreview()
          ) : (
            <div className="space-y-4 text-xs select-none">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 space-y-2">
                <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Metadata Details</span>
                </div>
                <p className="text-slate-700"><span className="font-semibold">Type:</span> {file.type || 'unknown'}</p>
                <p className="text-slate-700"><span className="font-semibold">Size:</span> {formatSize(file.size)}</p>
                <p className="text-slate-700"><span className="font-semibold">Owner:</span> {file.uploadedBy || 'system'}</p>
                <p className="text-slate-700"><span className="font-semibold">Created:</span> {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : '—'}</p>
                <p className="text-slate-700"><span className="font-semibold">Modified:</span> {file.lastModified ? new Date(file.lastModified).toLocaleString() : '—'}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block mb-3">Version History</span>
                {file.versionHistory && file.versionHistory.length > 0 ? (
                  <div className="space-y-2.5">
                    {file.versionHistory.map((ver, idx) => (
                      <div key={idx} className="flex gap-2.5 items-center">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold text-[9px] flex items-center justify-center">
                          v{ver.version || 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 truncate w-48">{ver.name}</p>
                          <p className="text-[8px] text-slate-400 mt-0.5">{ver.uploadedAt || '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="italic text-slate-400">Version history not tracked.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-850 flex justify-end shrink-0 select-none">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
}
