import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Paintbrush, 
  TableProperties, 
  Presentation, 
  FolderOpen, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  History,
  Sparkles
} from 'lucide-react';

export default function Sidebar({
  activeApp,
  setActiveApp,
  recentRooms,
  handleJoinRoom
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const menuItems = [
    { id: 'docs', label: 'Documents', icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
    { id: 'whiteboard', label: 'Whiteboard', icon: Paintbrush, color: 'text-rose-500 bg-rose-500/10' },
    { id: 'sheets', label: 'Spreadsheet', icon: TableProperties, color: 'text-emerald-500 bg-emerald-500/10' },
    { id: 'slides', label: 'Slides', icon: Presentation, color: 'text-amber-500 bg-amber-500/10' },
  ];

  const secondaryItems = [
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
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

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {secondaryItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40 group relative cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-transparent group-hover:bg-slate-200 dark:group-hover:bg-slate-800">
                <item.icon className="w-4 h-4" />
              </div>
              {!isCollapsed && <span className="truncate">{item.label}</span>}

              {isCollapsed && (
                <div className="absolute left-16 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom: Recent Rooms */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
        {isCollapsed ? (
          <div className="flex justify-center py-2 text-slate-400 dark:text-slate-500 relative group">
            <History className="w-5 h-5" />
            <div className="absolute left-16 bottom-4 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md max-w-xs space-y-1">
              <span className="font-semibold block border-b border-white/10 pb-1 mb-1">Recent Rooms</span>
              {recentRooms.map((room, i) => (
                <span key={i} className="block text-slate-300 truncate">{room}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <History className="w-3 h-3" />
              <span>Recent Rooms</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 no-scrollbar pr-1">
              {recentRooms.length === 0 ? (
                <span className="text-xs text-slate-400 dark:text-slate-500 px-3 block italic">No history</span>
              ) : (
                recentRooms.map((room, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleJoinRoom(room)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-all truncate block cursor-pointer"
                  >
                    📄 {room}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
