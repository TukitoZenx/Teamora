import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Paintbrush, TableProperties, Presentation, Settings, 
  ChevronLeft, ChevronRight, Sparkles, LogOut, Folder, 
  Calendar as CalendarIcon, CheckSquare, Video
} from 'lucide-react';

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

  const sections = [
    {
      title: 'Workspace',
      items: [
        { id: 'docs', label: 'Documents', icon: FileText },
        { id: 'whiteboard', label: 'Whiteboard', icon: Paintbrush },
        { id: 'sheets', label: 'Spreadsheet', icon: TableProperties },
        { id: 'slides', label: 'Presentation', icon: Presentation }
      ]
    },
    {
      title: 'Collaboration',
      items: [
        { id: 'meetings', label: 'Meetings', icon: Video },
        { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare }
      ]
    },
    {
      title: 'Resources',
      items: [
        { id: 'files', label: 'Shared Files', icon: Folder }
      ]
    },
    {
      title: 'Settings',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  return (
    <motion.aside
      animate={{ width: isCollapsed ? '64px' : '288px' }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      style={{ backgroundColor: 'var(--sidebar-bg)' }}
      className="h-full shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between relative z-30 select-none transition-colors duration-300"
    >
      {/* Sidebar toggle control */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full flex items-center justify-center text-neutral-500 dark:text-neutral-450 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm z-50 transition-colors cursor-pointer"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Main sidebar panel content */}
      <div className="p-3 flex-1 overflow-y-auto no-scrollbar flex flex-col space-y-4">
        
        {/* Workspace Brand Badge */}
        {!isCollapsed && (
          <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 border-b border-neutral-100 dark:border-neutral-850">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Teamora Space</span>
          </div>
        )}

        {/* Section List */}
        <div className="space-y-4">
          {sections.map((section, idx) => (
            <div key={idx} className="flex flex-col">
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-neutral-450 dark:text-neutral-500 mb-1.5 mt-2">
                  {section.title}
                </span>
              )}
              
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = activeApp === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveApp(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group relative cursor-pointer ${
                        isActive 
                          ? 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-white shadow-xs border border-neutral-200/50 dark:border-neutral-700/50 border-l-2! border-l-indigo-600!' 
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20' : 'bg-transparent group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800'}`}>
                        <Icon className="w-4.5 h-4.5" />
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
              
              {/* Add a subtle separator between sections if collapsed */}
              {isCollapsed && idx < sections.length - 1 && (
                <div className="border-t border-neutral-100 dark:border-neutral-850/50 my-2 mx-2" />
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Bottom leave button */}
      <div className="p-3 border-t border-neutral-100 dark:border-neutral-850/80">
        <button
          onClick={() => setShowLeaveModal(true)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group relative cursor-pointer border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-red-650 hover:border-red-650 dark:text-neutral-400 dark:hover:text-red-400 dark:hover:border-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/10 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="p-1.5 rounded-lg transition-colors bg-transparent group-hover:bg-red-50 dark:group-hover:bg-red-950/30">
            <LogOut className="w-4.5 h-4.5" />
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
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
                  className="px-4 py-2 text-xs text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shadow-sm shadow-red-500/20"
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
