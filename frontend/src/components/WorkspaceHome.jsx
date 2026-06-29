import React, { useState } from 'react';
import { 
  Building2, Plus, Folder, Calendar, CheckSquare, Activity, 
  Video, Clock, Search, Users, Share2, Copy, Check, FileText, 
  TableProperties, Presentation, Paintbrush, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ensureArray } from '../utils/arrayUtils';

export default function WorkspaceHome({
  workspaceName,
  roomId,
  filesList = [],
  onOpenFile,
  onCreateFile,
  activeUsers = [],
  calendarList = [],
  tasksList = [],
  activities = [],
  setActiveApp,
  onSearchClick
}) {
  const [copied, setCopied] = useState(false);

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Recent files (docs, sheets, slides, boards) sorted by lastModified descending
  const recentFiles = ensureArray(filesList)
    .filter(f => ['document', 'spreadsheet', 'presentation', 'whiteboard'].includes(f.type))
    .sort((a, b) => new Date(b.lastModified || b.uploadedAt || 0) - new Date(a.lastModified || a.uploadedAt || 0))
    .slice(0, 4);

  const getFileIcon = (type) => {
    switch (type) {
      case 'document': return FileText;
      case 'spreadsheet': return TableProperties;
      case 'presentation': return Presentation;
      case 'whiteboard': return Paintbrush;
      default: return Folder;
    }
  };

  const getFileIconColor = (type) => {
    switch (type) {
      case 'document': return 'text-blue-500';
      case 'spreadsheet': return 'text-emerald-500';
      case 'presentation': return 'text-orange-500';
      case 'whiteboard': return 'text-purple-500';
      default: return 'text-slate-400';
    }
  };

  // Task Counts
  const pendingTasks = ensureArray(tasksList).filter(t => t.status !== 'completed').length;
  const completedTasks = ensureArray(tasksList).filter(t => t.status === 'completed').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayTasks = ensureArray(tasksList).filter(t => t.dueDate === todayStr && t.status !== 'completed').length;

  // Upcoming meetings (filter calendar events containing video/meeting details, or just next calendar events)
  const upcomingEvents = ensureArray(calendarList)
    .filter(e => new Date(e.date || e.start) >= new Date().setHours(0,0,0,0))
    .sort((a, b) => new Date(a.date || a.start) - new Date(b.date || b.start))
    .slice(0, 3);

  const handleQuickCreate = (type) => {
    const defaultNames = {
      document: 'Untitled Document',
      spreadsheet: 'Untitled Spreadsheet',
      presentation: 'Untitled Presentation',
      whiteboard: 'Untitled Whiteboard'
    };
    const name = prompt(`Enter ${type} name:`, defaultNames[type]);
    if (name && name.trim()) {
      onCreateFile(name.trim(), type);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-slate-900/40 p-6 md:p-10 text-neutral-800 dark:text-neutral-200 transition-colors duration-300">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Workspace Hub Header Info */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 bg-neutral-900 dark:bg-neutral-800 rounded-xl flex items-center justify-center shrink-0 border border-neutral-800 dark:border-neutral-700">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-neutral-950 dark:text-white truncate">{workspaceName || 'Project Workspace'}</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-lg truncate">
                Central collaboration engine. Share spreadsheets, slides, whiteboards, and tasks.
              </p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                  <Users className="w-3.5 h-3.5" />
                  <span>{activeUsers.length} Online</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Secure Workspace</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Search Button */}
            <button
              onClick={onSearchClick}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Search Workspace</span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 text-[9px] text-slate-400 border border-slate-200 dark:border-slate-700 font-mono rounded">Ctrl+K</kbd>
            </button>

            {/* Invite Button */}
            <button
              onClick={copyInviteLink}
              className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-[#222] active:bg-[#111] dark:bg-neutral-800 dark:hover:bg-neutral-750 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs border border-transparent dark:border-neutral-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Invite'}</span>
            </button>
          </div>
        </div>

        {/* Home Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Left: Recent Files & Quick Actions */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Recent Files */}
            <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>Recent Files</span>
                </h2>
                <span className="text-[10px] text-slate-400">Collaborative</span>
              </div>

              {recentFiles.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No files have been opened or edited yet. Use Quick Actions to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentFiles.map(file => {
                    const FileIcon = getFileIcon(file.type);
                    const colorClass = getFileIconColor(file.type);
                    return (
                      <div
                        key={file.id}
                        onClick={() => onOpenFile(file)}
                        className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-850 rounded-xl cursor-pointer hover:border-black dark:hover:border-slate-600 transition-all duration-150 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8.5 h-8.5 bg-white dark:bg-slate-900 border border-slate-200/55 dark:border-slate-800 rounded-lg flex items-center justify-center shrink-0">
                            <FileIcon className={`w-4 h-4 ${colorClass}`} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-black dark:group-hover:text-white truncate">{file.name}</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span>Edited by {file.uploadedBy || 'System'}</span>
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {file.lastModified ? new Date(file.lastModified).toLocaleDateString() : 'Recently'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Quick Actions Grid */}
            <section className="space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'New Document', type: 'document', icon: FileText, color: 'hover:border-blue-500/50 dark:hover:border-blue-500/30' },
                  { label: 'New Spreadsheet', type: 'spreadsheet', icon: TableProperties, color: 'hover:border-emerald-500/50 dark:hover:border-emerald-500/30' },
                  { label: 'New Presentation', type: 'presentation', icon: Presentation, color: 'hover:border-orange-500/50 dark:hover:border-orange-500/30' },
                  { label: 'New Whiteboard', type: 'whiteboard', icon: Paintbrush, color: 'hover:border-purple-500/50 dark:hover:border-purple-500/30' },
                  { label: 'Upload Files', type: 'upload', icon: Folder, color: 'hover:border-slate-500/50', app: 'files' },
                  { label: 'Start Meeting', type: 'meeting', icon: Video, color: 'hover:border-rose-500/50', app: 'meetings' }
                ].map((act, i) => {
                  const ActIcon = act.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (act.app) {
                          setActiveApp(act.app);
                        } else {
                          handleQuickCreate(act.type);
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-xs transition-all cursor-pointer ${act.color} text-center group`}
                    >
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl mb-3 group-hover:bg-slate-100 dark:group-hover:bg-slate-850 transition-colors">
                        <ActIcon className="w-5 h-5 text-slate-600 dark:text-slate-350" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{act.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column: Upcoming Meetings, Tasks, Recent Activity */}
          <div className="space-y-8">
            
            {/* Tasks Summary */}
            <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 cursor-pointer" onClick={() => setActiveApp('tasks')}>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-500" />
                  <span>Tasks Summary</span>
                </h2>
                <span className="text-[10px] text-indigo-500 hover:underline">View All</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-850 p-3.5 rounded-xl">
                  <span className="block text-lg font-black text-slate-900 dark:text-white">{pendingTasks}</span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Pending</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-850 p-3.5 rounded-xl">
                  <span className="block text-lg font-black text-slate-900 dark:text-white">{completedTasks}</span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Done</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-850 p-3.5 rounded-xl">
                  <span className="block text-lg font-black text-rose-600 dark:text-rose-455">{dueTodayTasks}</span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Due Today</span>
                </div>
              </div>
            </section>

            {/* Upcoming Meetings */}
            <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 cursor-pointer" onClick={() => setActiveApp('calendar')}>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Upcoming Meetings</span>
                </h2>
                <span className="text-[10px] text-indigo-500 hover:underline">Calendar</span>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No upcoming meetings scheduled.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((evt, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-850 rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{evt.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="truncate">{evt.time || 'All Day'} | {evt.date || evt.start}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveApp('meetings')}
                        className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-750 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Live Activity Feed */}
            <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span>Recent Activity</span>
                </h2>
                <span className="text-[10px] text-slate-400">Live logs</span>
              </div>

              {ensureArray(activities).length === 0 ? (
                <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                  No activity logs captured.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-56 overflow-y-auto no-scrollbar">
                  {ensureArray(activities).slice(0, 5).map((act, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start text-[11px]">
                      <div className="w-4.5 h-4.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-[8px]">
                        {act.type === 'join' ? '➕' : act.type === 'leave' ? '🏃' : '✏️'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-700 dark:text-slate-350">
                          <strong className="text-slate-900 dark:text-white">{act.user}</strong> {act.action}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{act.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>

      </div>
    </div>
  );
}
