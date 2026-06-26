import React from 'react';
import { 
  User, Globe, Palette, Bell, Shield, Keyboard, 
  Monitor, HardDrive, Smartphone, Info, 
  Sun, Moon, ChevronRight, Check
} from 'lucide-react';

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'workspace', label: 'Workspace', icon: Globe },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
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

export default function Settings({ isDarkMode, setIsDarkMode, userName }) {
  const [activeSection, setActiveSection] = React.useState('profile');

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Profile</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your personal information and preferences.</p>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {(userName || 'U').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{userName || 'User'}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Managed by Clerk Authentication</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'workspace':
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Workspace Settings</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configure options for the current collaboration room.</p>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Room ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={window.location.search.replace('?room=', '') || 'N/A'}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 dark:text-slate-100 select-all"
                  />
                  <button
                    onClick={() => {
                      const id = window.location.search.replace('?room=', '');
                      navigator.clipboard.writeText(id);
                      toast.success('Room ID copied!');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Copy ID
                  </button>
                </div>
              </div>
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Workspace Share URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={window.location.href}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 dark:text-slate-100 select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Share link copied!');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Appearance</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Customize how CollabSpace looks.</p>
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Theme</label>
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
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Light</p>
                    <p className="text-xs text-slate-400">Bright and clean</p>
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
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Dark</p>
                    <p className="text-xs text-slate-400">Easy on the eyes</p>
                  </div>
                  {isDarkMode && <Check className="w-4 h-4 text-indigo-500 ml-auto" />}
                </button>
              </div>
            </div>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Keyboard Shortcuts</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Quick keys to speed up your workflow.</p>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 divide-y divide-slate-200 dark:divide-slate-700/50 overflow-hidden">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{s.action}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, j) => (
                      <React.Fragment key={j}>
                        <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono text-slate-600 dark:text-slate-300 shadow-sm">{k}</kbd>
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
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">About CollabSpace</h2>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">CS</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">CollabSpace</p>
                  <p className="text-xs text-slate-400">Version 1.0.0</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                A premium real-time collaboration platform for documents, whiteboards, spreadsheets, and presentations. 
                Built with React, Socket.IO, and Clerk Authentication.
              </p>
              <div className="flex flex-wrap gap-2">
                {['React', 'Vite', 'Tailwind CSS', 'Socket.IO', 'Clerk', 'Quill', 'Framer Motion'].map(tech => (
                  <span key={tech} className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-full border border-indigo-500/20">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label}</h2>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 mb-3">
                {React.createElement(SETTINGS_SECTIONS.find(s => s.id === activeSection)?.icon || Info, { className: 'w-5 h-5' })}
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Coming Soon</p>
              <p className="text-xs text-slate-400 mt-1">This setting is under development.</p>
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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
