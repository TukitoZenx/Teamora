import React from 'react';
import { ShieldCheck, Users, HardDriveUpload, Layers } from 'lucide-react';

export default function StatusBar({
  isConnected,
  latency,
  isSaving,
  activeApp,
  activeUsersCount
}) {
  const getAppName = (id) => {
    switch(id) {
      case 'docs': return 'Documents';
      case 'whiteboard': return 'Whiteboard';
      case 'sheets': return 'Spreadsheet';
      case 'slides': return 'Slides';
      default: return 'Drive';
    }
  };

  return (
    <footer className="h-9 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 z-30 select-none transition-colors duration-300">
      {/* Left: App & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-medium">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>Active Workspace: <span className="text-slate-800 dark:text-slate-200 font-semibold">{getAppName(activeApp)}</span></span>
        </div>
        <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800"></div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secure Sandbox</span>
        </div>
      </div>

      {/* Right: Autosave & Connection stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>{activeUsersCount} collaborators active</span>
        </div>
        <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800"></div>
        <div className="flex items-center gap-1.5">
          <HardDriveUpload className={`w-3.5 h-3.5 ${isSaving ? 'text-indigo-500 animate-bounce' : 'text-slate-400'}`} />
          <span>{isSaving ? 'Synchronizing changes...' : 'Cloud synced'}</span>
        </div>
      </div>
    </footer>
  );
}
