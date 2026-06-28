import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Paintbrush, 
  TableProperties, 
  Presentation, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  History,
  Sparkles,
  Folder,
  Calendar as CalendarIcon,
  CheckSquare,
  Video,
  MessageSquare,
  LogOut
} from 'lucide-react';

export default function Sidebar({
  activeApp,
  setActiveApp,
  recentRooms,
  handleJoinRoom,
  handleLeaveRoom
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const menuItems = [
    { id: 'docs', label: 'Documents', icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
    { id: 'whiteboard', label: 'Whiteboard', icon: Paintbrush, color: 'text-rose-500 bg-rose-500/10' },
    { id: 'sheets', label: 'Spreadsheet', icon: TableProperties, color: 'text-emerald-500 bg-emerald-500/10' },
    { id: 'slides', label: 'Presentation', icon: Presentation, color: 'text-amber-500 bg-amber-500/10' },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon, color: 'text-purple-500 bg-purple-500/10' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, color: 'text-cyan-500 bg-cyan-500/10' },
    { id: 'meetings', label: 'Meetings', icon: Video, color: 'text-red-500 bg-red-500/10' },
  ];

  return (
    <motion.aside
      animate={{ width: isCollapsed ? '64px' : '288px' }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-full shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between relative z-30 select-none transition-colors duration-300"
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 shadow-sm z-50 transition-colors cursor-pointer"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Top: Menu Items */}
      <div className="p-3 space-y-6 flex-1 overflow-y-auto no-scrollbar">
        {/* Workspace Label */}
        {!isCollapsed && (
          <div className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Workspace</span>
          </div>
        )}

        {/* Primary Apps */}
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = activeApp === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveApp(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative cursor-pointer ${
                  isActive 
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? item.color : 'bg-transparent group-hover:bg-slate-200 dark:group-hover:bg-slate-800'}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                
                {/* Tooltip for collapsed view */}
                {isCollapsed && (
                  <div className="absolute left-16 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200 dark:bg-slate-800/80 mx-2"></div>

        {/* Settings Button */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveApp('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative cursor-pointer ${
              activeApp === 'settings'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${activeApp === 'settings' ? 'text-slate-600 bg-slate-500/10' : 'bg-transparent group-hover:bg-slate-200 dark:group-hover:bg-slate-800'}`}>
              <Settings className="w-4 h-4" />
            </div>
            {!isCollapsed && <span className="truncate">Settings</span>}

            {isCollapsed && (
              <div className="absolute left-16 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md">
                Settings
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Bottom section with Leave Workspace button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
        {/* Leave Workspace Button */}
        <button
          onClick={() => setShowLeaveModal(true)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative cursor-pointer border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500 hover:border-red-500 dark:text-slate-400 dark:hover:text-red-400 dark:hover:border-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/10 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="p-1.5 rounded-lg transition-colors bg-transparent group-hover:bg-red-100 dark:group-hover:bg-red-900/30">
            <LogOut className="w-4 h-4" />
          </div>
          {!isCollapsed && <span className="truncate">Leave Workspace</span>}

          {isCollapsed && (
            <div className="absolute left-16 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md">
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowLeaveModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Leave Workspace?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Are you sure you want to leave this workspace?
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    handleLeaveRoom();
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-sm shadow-rose-500/20"
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
