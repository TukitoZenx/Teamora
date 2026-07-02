import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Paintbrush, TableProperties, Presentation, Settings, 
  ChevronLeft, ChevronRight, LogOut, Folder, 
  Calendar as CalendarIcon, CheckSquare, Video, Home as HomeIcon
} from 'lucide-react';

function TeamoraMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#teamora-gradient)" />
      <path d="M16 14H32" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M20 14V34" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M28 14V34" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M20 24H28" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      <defs>
        <linearGradient id="teamora-gradient" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Sidebar({
  activeApp,
  setActiveApp,
  recentRooms,
  handleJoinRoom,
  handleLeaveRoom,
  filesList = [],
  activeFileId,
  onOpenFile,
  activeUsers = []
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const isTabActive = (itemId) => {
    if (itemId === 'home') return activeApp === 'home';
    if (itemId === 'docs-list') return activeApp === 'docs' || activeApp === 'docs-list';
    if (itemId === 'sheets-list') return activeApp === 'sheets' || activeApp === 'sheets-list';
    if (itemId === 'slides-list') return activeApp === 'slides' || activeApp === 'slides-list';
    if (itemId === 'whiteboard-list') return activeApp === 'whiteboard' || activeApp === 'whiteboard-list';
    return activeApp === itemId;
  };

  const navItems = [
    { type: 'header', label: 'Workspace' },
    { id: 'home', label: 'Home', icon: HomeIcon },
    { type: 'separator' },
    { id: 'docs-list', label: 'Documents', icon: FileText },
    { id: 'sheets-list', label: 'Spreadsheets', icon: TableProperties },
    { id: 'slides-list', label: 'Presentations', icon: Presentation },
    { id: 'whiteboard-list', label: 'Whiteboards', icon: Paintbrush },
    { type: 'separator' },
    { id: 'meetings', label: 'Meetings', icon: Video },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { type: 'separator' },
    { id: 'files', label: 'Shared Files', icon: Folder },
    { type: 'separator' },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <motion.aside
      animate={{ width: isCollapsed ? '72px' : '280px' }}
      transition={{ duration: 0.18, ease: 'easeInOut' }}
      style={{ backgroundColor: 'var(--sidebar-bg)' }}
      className="h-full shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between relative z-30 select-none transition-colors duration-300"
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-[0_6px_16px_rgba(124,58,237,0.16)] ring-1 ring-slate-200">
            <TeamoraMark />
          </div>
          {!isCollapsed && (
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">Teamora</span>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-all duration-180 ease-out hover:scale-105 hover:bg-violet-50 hover:text-violet-600"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Main sidebar panel content */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col space-y-4 p-3">
        {/* Navigation List */}
        <div className="space-y-1">
          {navItems.map((item, idx) => {
            if (item.type === 'header') {
              if (isCollapsed) return null;
              return (
                <span key={idx} className="block px-3 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5 mt-2">
                  {item.label}
                </span>
              );
            }

            if (item.type === 'separator') {
              if (isCollapsed) return null;
              return (
                <div key={idx} className="border-t border-neutral-100 dark:border-neutral-850/50 my-2 mx-2" />
              );
            }

            const isActive = isTabActive(item.id);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveApp(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group relative cursor-pointer ${
                  isActive 
                    ? 'bg-neutral-150 dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs border border-neutral-200 dark:border-neutral-700/50 border-l-2! border-l-black! dark:border-l-white!' 
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'text-black dark:text-white bg-neutral-200 dark:bg-neutral-700' : 'bg-transparent group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                {isCollapsed && (
                  <div className="absolute left-16 bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Bottom leave button */}
      <div className="p-3 border-t border-neutral-100 dark:border-neutral-850/80">
        <button
          onClick={() => setShowLeaveModal(true)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group relative cursor-pointer border border-neutral-200 dark:border-neutral-800 text-neutral-550 hover:text-red-600 hover:border-red-500 dark:text-neutral-400 dark:hover:text-red-400 dark:hover:border-red-500 hover:bg-red-55/10 dark:hover:bg-red-950/10 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="p-1.5 rounded-lg transition-colors bg-transparent group-hover:bg-red-50 dark:group-hover:bg-red-950/30">
            <LogOut className="w-4 h-4" />
          </div>
          {!isCollapsed && <span className="truncate">Leave Workspace</span>}
          {isCollapsed && (
            <div className="absolute left-16 bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md">
              Leave Workspace
            </div>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showLeaveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs"
              onClick={() => setShowLeaveModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden text-neutral-800 dark:text-neutral-200"
            >
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-2">Leave Workspace?</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
                Are you sure you want to leave this workspace?
              </p>
              <div className="flex items-center gap-3 justify-end font-semibold">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 text-xs text-neutral-600 dark:text-neutral-350 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    handleLeaveRoom();
                  }}
                  className="px-4 py-2 text-xs text-white bg-red-650 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Leave Workspace
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
