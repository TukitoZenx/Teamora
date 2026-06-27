import React, { useState } from 'react';
import { 
  User, Globe, Palette, Bell, Shield, Keyboard, 
  Monitor, HardDrive, Smartphone, Info, 
  Sun, Moon, ChevronRight, Check, Users, Key
} from 'lucide-react';
import toast from 'react-hot-toast';

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'workspace', label: 'Workspace', icon: Globe },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'display', label: 'Display', icon: Monitor },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'devices', label: 'Connected Devices', icon: Smartphone },
  { id: 'about', label: 'About', icon: Info },
];

const SHORTCUTS = [
  { keys: ['Ctrl', 'S'], action: 'Save document' },
  { keys: ['Ctrl', 'B'], action: 'Bold text' },
  { keys: ['Ctrl', 'I'], action: 'Italic text' },
  { keys: ['Ctrl', 'Z'], action: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
  { keys: ['Ctrl', 'K'], action: 'Insert link' },
  { keys: ['Esc'], action: 'Exit presentation' },
  { keys: ['Tab'], action: 'Next cell (Spreadsheet)' },
  { keys: ['Enter'], action: 'Confirm cell (Spreadsheet)' },
];

export default function Settings({ 
  isDarkMode, 
  setIsDarkMode, 
  userName,
  roomId,
  socket,
  roomSettings = { screenShareAllowed: 'everyone' },
  setRoomSettings,
  isHost,
  activeUsers = [],
  userRoles = {},
  onUpdateUserRole
}) {
  const [activeSection, setActiveSection] = useState('profile');

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6 text-xs">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Profile</h2>
            <p className="text-slate-500 dark:text-slate-400">Manage your personal information and preferences.</p>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {(userName || 'U').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{userName || 'User'}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Managed by Clerk Authentication</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'workspace':
        return (
          <div className="space-y-6 text-xs">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Workspace Settings</h2>
            <p className="text-slate-500 dark:text-slate-400">Configure options and roles for the current room.</p>
            
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 space-y-6">
              {/* Room ID & Share Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Room ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={roomId || 'N/A'}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 select-all focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(roomId);
                        toast.success('Room ID copied!');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Workspace Share URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}?room=${roomId}`}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 select-all focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`);
                        toast.success('Share link copied!');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

              {/* User Role Settings Panel */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Role Permissions & Access Control</span>
                </label>
                <p className="text-[11px] text-slate-400">Assign viewer / editor privileges to teammates inside the workspace.</p>
                
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold">
                      <tr>
                        <th className="px-4 py-2">User Name</th>
                        <th className="px-4 py-2">Role Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {activeUsers.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-4 text-center italic text-slate-400">No teammates inside the room.</td>
                        </tr>
                      ) : (
                        activeUsers.map((member, idx) => {
                          const currentRole = userRoles[member.user] || 'editor';
                          return (
                            <tr key={idx}>
                              <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{member.user}</td>
                              <td className="px-4 py-2.5">
                                <select
                                  disabled={!isHost}
                                  value={currentRole}
                                  onChange={(e) => onUpdateUserRole(member.user, e.target.value)}
                                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer disabled:opacity-50"
                                >
                                  <option value="owner">👑 Owner</option>
                                  <option value="admin">🛡️ Admin</option>
                                  <option value="editor">✏️ Editor</option>
                                  <option value="viewer">👀 Viewer</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6 text-xs">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Appearance</h2>
            <p className="text-slate-500 dark:text-slate-400">Customize how Teamora looks.</p>
            <div className="space-y-3">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Theme Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsDarkMode(false)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                    !isDarkMode 
                      ? 'border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Sun className="w-5 h-5 text-amber-500" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Light</p>
                    <p className="text-[10px] text-slate-400">Bright and clean</p>
                  </div>
                  {!isDarkMode && <Check className="w-4 h-4 text-indigo-500 ml-auto" />}
                </button>
                <button
                  onClick={() => setIsDarkMode(true)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Dark</p>
                    <p className="text-[10px] text-slate-400">Easy on the eyes</p>
                  </div>
                  {isDarkMode && <Check className="w-4 h-4 text-indigo-500 ml-auto" />}
                </button>
              </div>
            </div>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-6 text-xs">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Keyboard Shortcuts</h2>
            <p className="text-slate-500 dark:text-slate-400">Quick keys to speed up your workflow.</p>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 divide-y divide-slate-200 dark:divide-slate-700/50 overflow-hidden">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 text-xs">
                  <span className="text-slate-700 dark:text-slate-300">{s.action}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, j) => (
                      <React.Fragment key={j}>
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono text-slate-600 dark:text-slate-300 shadow-sm">{k}</kbd>
                        {j < s.keys.length - 1 && <span className="text-slate-300 dark:text-slate-600 text-xs">+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6 text-xs">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">About Teamora</h2>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">Teamora</p>
                  <p className="text-[10px] text-slate-400">Version 1.0.0</p>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                A premium, modern, all-in-one real-time collaboration workspace for documents, whiteboards, spreadsheets, pitches, shared files, tasks, calendars, and audio-video meetings. 
                Built with React, Vite, Node, Socket.IO, Clerk, and MongoDB.
              </p>
              <div className="flex flex-wrap gap-2">
                {['React', 'Vite', 'Tailwind CSS', 'Socket.IO', 'Clerk', 'Quill', 'Framer Motion', 'SheetJS', 'MongoDB'].map(tech => (
                  <span key={tech} className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold rounded-full border border-indigo-500/20">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6 text-xs">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">{SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label}</h2>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 mb-3">
                {React.createElement(SETTINGS_SECTIONS.find(s => s.id === activeSection)?.icon || Info, { className: 'w-5 h-5' })}
              </div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">Coming Soon</p>
              <p className="text-slate-400 mt-1">This setting is under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex bg-white dark:bg-slate-950 overflow-hidden h-full transition-colors">
      {/* Settings Sidebar */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col shrink-0 overflow-y-auto no-scrollbar">
        <div className="p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">Settings</h3>
          <div className="space-y-0.5">
            {SETTINGS_SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  <span className="truncate">{section.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
        <div className="max-w-2xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
