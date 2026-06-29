import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Users, HardDriveUpload, Layers, ChevronUp, Globe } from 'lucide-react';

export default function StatusBar({
  isConnected,
  latency,
  isSaving,
  activeApp,
  activeUsersCount,
  wordCount = 0,
  charCount = 0,
  currentPage = 'Page 1 of 1',
  zoom = 100,
  language = 'English (US)'
}) {
  const [selectedLang, setSelectedLang] = useState(language);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langRef = useRef(null);

  const getAppName = (id) => {
    switch(id) {
      case 'home': return 'Home';
      case 'docs': return 'Documents';
      case 'docs-list': return 'Documents';
      case 'whiteboard': return 'Whiteboard';
      case 'whiteboard-list': return 'Whiteboards';
      case 'sheets': return 'Spreadsheet';
      case 'sheets-list': return 'Spreadsheets';
      case 'slides': return 'Slides';
      case 'slides-list': return 'Presentations';
      case 'files': return 'Shared Files';
      case 'calendar': return 'Calendar';
      case 'tasks': return 'Tasks';
      case 'meetings': return 'Meetings';
      case 'settings': return 'Settings';
      default: return 'Workspace';
    }
  };

  const languages = [
    'English (US)',
    'English (UK)',
    'Español',
    'Français',
    'Deutsch',
    '日本語',
    '简体中文'
  ];

  // Close language menu on clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <footer className="h-9 shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 z-40 select-none transition-colors duration-300 relative">
      {/* Left: App telemetry details & Document stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-medium">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>Active: <span className="text-slate-800 dark:text-slate-200 font-semibold">{getAppName(activeApp)}</span></span>
        </div>
        
        {/* Document Stats */}
        {activeApp === 'docs' && (
          <>
            <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800"></div>
            <div className="flex items-center gap-2">
              <span>{currentPage}</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>{wordCount} words</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>{charCount} characters</span>
            </div>
          </>
        )}

        {/* Slide Stats */}
        {activeApp === 'slides' && (
          <>
            <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800"></div>
            <span>{currentPage}</span>
          </>
        )}

        <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800"></div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secure Sandbox ({latency !== undefined ? `${latency}ms` : 'online'})</span>
        </div>
      </div>

      {/* Right: Autosave, Active Collaborators, Zoom & Language */}
      <div className="flex items-center gap-4 relative">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-450" />
          <span>{activeUsersCount} active</span>
        </div>
        <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800"></div>
        
        <div className="flex items-center gap-1.5">
          <HardDriveUpload className={`w-3.5 h-3.5 ${isSaving ? 'text-indigo-500 animate-bounce' : 'text-slate-400'}`} />
          <span>{isSaving ? 'Saving...' : 'Synced'}</span>
        </div>
        <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800"></div>

        {/* Zoom */}
        <span className="hover:text-slate-850 dark:hover:text-white cursor-pointer font-mono font-medium">
          {zoom}%
        </span>
        <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800"></div>

        {/* Language selector popover */}
        <div className="relative flex items-center" ref={langRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1 hover:text-slate-850 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Globe className="w-3 h-3 text-slate-400" />
            <span>{selectedLang}</span>
            <ChevronUp className={`w-3 h-3 text-slate-400 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
          </button>

          {showLangMenu && (
            <div className="absolute right-0 bottom-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 min-w-[130px] z-50 text-left">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setSelectedLang(lang);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                    selectedLang === lang ? 'font-bold text-black dark:text-white bg-slate-50 dark:bg-slate-800' : 'text-slate-600 dark:text-slate-350'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
