import React, { useState, useEffect } from 'react';
import { 
  User, Globe, Palette, Keyboard, Info, Sun, Moon, ChevronRight, Check, Users, Shield, Type, Sliders
} from 'lucide-react';
import toast from 'react-hot-toast';

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'workspace', label: 'Workspace Settings', icon: Globe },
  { id: 'appearance', label: 'Appearance & Themes', icon: Palette },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'about', label: 'About Teamora', icon: Info },
];

const SHORTCUTS = [
  { keys: ['Ctrl', 'S'], action: 'Save document' },
  { keys: ['Ctrl', 'B'], action: 'Bold selection' },
  { keys: ['Ctrl', 'I'], action: 'Italic selection' },
  { keys: ['Ctrl', 'Z'], action: 'Undo action' },
  { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo action' },
  { keys: ['Ctrl', 'K'], action: 'Insert hyperlink' },
  { keys: ['Esc'], action: 'Exit presentation' },
  { keys: ['Tab'], action: 'Next cell (Spreadsheet)' },
  { keys: ['Enter'], action: 'Confirm cell (Spreadsheet)' },
];

const ACCENT_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Amber', value: '#f59e0b' }
];

const SIDEBAR_COLORS = [
  { name: 'Light Slate', value: '#f8fafc' },
  { name: 'Dark Slate', value: '#0f172a' },
  { name: 'Indigo Navy', value: '#1e1b4b' },
  { name: 'Clean White', value: '#ffffff' }
];

const EDITOR_BACKGROUNDS = [
  { name: 'Clean White', value: '#ffffff' },
  { name: 'Soft Slate', value: '#f8fafc' },
  { name: 'Warm Sepia', value: '#fffbeb' }
];

const FONTS = [
  { name: 'Inter Sans', value: "'Inter', sans-serif" },
  { name: 'Georgia Serif', value: "'Georgia', serif" },
  { name: 'Courier Mono', value: "'Courier New', monospace" }
];

// Helper to inject customizations into DOM style properties
export const applyCustomizations = (customs) => {
  if (!customs) return;
  const root = document.documentElement;
  if (customs.accentColor) root.style.setProperty('--accent-color', customs.accentColor);
  if (customs.sidebarColor) root.style.setProperty('--sidebar-bg', customs.sidebarColor);
  if (customs.editorBg) root.style.setProperty('--editor-bg', customs.editorBg);
  if (customs.fontFamily) root.style.setProperty('--font-family-override', customs.fontFamily);
  if (customs.fontSize) root.style.setProperty('--font-size-override', `${customs.fontSize}px`);
  if (customs.borderRadius) root.style.setProperty('--border-radius', customs.borderRadius === 'compact' ? '4px' : '12px');
  if (customs.glassOpacity) root.style.setProperty('--glass-opacity', customs.glassOpacity);
  if (customs.wallpaperBg && customs.wallpaperBg !== 'none') {
    root.style.setProperty('--wallpaper-pattern', `linear-gradient(135deg, ${customs.accentColor}10 25%, transparent 25%), linear-gradient(225deg, ${customs.accentColor}10 25%, transparent 25%)`);
  } else {
    root.style.setProperty('--wallpaper-pattern', 'none');
  }
};

export default function Settings({ 
  isDarkMode, 
  setIsDarkMode, 
  userName,
  roomId,
  socket,
  roomSettings = {},
  setRoomSettings,
  isHost,
  activeUsers = [],
  userRoles = {},
  onUpdateUserRole
}) {
  const [activeSection, setActiveSection] = useState('profile');
  
  // Customizations state loaded from LocalStorage
  const [customs, setCustoms] = useState(() => {
    const saved = localStorage.getItem('teamora-customization');
    return saved ? JSON.parse(saved) : {
      accentColor: '#6366f1',
      sidebarColor: '#ffffff',
      editorBg: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      fontSize: 14,
      borderRadius: 'comfortable',
      glassOpacity: 0.95,
      wallpaperBg: 'none'
    };
  });

  const handleCustomChange = (key, value) => {
    const updated = { ...customs, [key]: value };
    setCustoms(updated);
    localStorage.setItem('teamora-customization', JSON.stringify(updated));
    applyCustomizations(updated);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6 text-xs">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Profile</h2>
            <p className="text-slate-500">Manage your workspace identity profile details.</p>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200/50 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {(userName || 'U').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-850 dark:text-white">{userName || 'Teammate'}</p>
                  <p className="text-[10px] text-slate-400">Authenticated Member Session</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'workspace':
        return (
          <div className="space-y-6 text-xs">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Workspace Privileges</h2>
            <p className="text-slate-500">Control active workspace configuration details.</p>
            
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200/50 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Room ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={roomId || 'N/A'}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 focus:outline-none"
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Invite Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}?room=${roomId}`}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 focus:outline-none"
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

              <div className="h-px bg-slate-200" />

              {/* Roles */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Teammates Privileges List</span>
                </label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold">
                      <tr>
                        <th className="px-4 py-2">User Name</th>
                        <th className="px-4 py-2">Role Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeUsers.map((member, idx) => {
                        const currentRole = userRoles[member.user] || 'editor';
                        return (
                          <tr key={idx}>
                            <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{member.user}</td>
                            <td className="px-4 py-2.5">
                              <select
                                disabled={!isHost}
                                value={currentRole}
                                onChange={(e) => onUpdateUserRole(member.user, e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                <option value="owner">👑 Owner</option>
                                <option value="editor">✏️ Editor</option>
                                <option value="viewer">👀 Viewer</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6 text-xs select-none">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Appearance & Branding</h2>
            <p className="text-slate-500">Configure theme, page properties, colors and font scaling overrides.</p>
            
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200/50 space-y-5">
              {/* Theme Mode */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Theme Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsDarkMode(false)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      !isDarkMode ? 'border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/20' : 'border-slate-200'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-slate-800">Light Mode</span>
                  </button>
                  <button
                    onClick={() => setIsDarkMode(true)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isDarkMode ? 'border-indigo-500 bg-indigo-500/5 ring-2 ring-indigo-500/20' : 'border-slate-200'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-800">Dark Mode</span>
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Accent Color</label>
                <div className="flex gap-2.5">
                  {ACCENT_COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => handleCustomChange('accentColor', c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-9 h-9 rounded-full border border-white cursor-pointer relative shadow-sm transition-transform hover:scale-105 ${
                        customs.accentColor === c.value ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Sidebar Background */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sidebar Background</label>
                <div className="grid grid-cols-2 gap-2">
                  {SIDEBAR_COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => handleCustomChange('sidebarColor', c.value)}
                      className={`px-3 py-2 rounded-xl text-left border cursor-pointer text-xs font-semibold flex items-center justify-between ${
                        customs.sidebarColor === c.value ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200'
                      }`}
                    >
                      <span>{c.name}</span>
                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: c.value }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor Background */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Editor Background</label>
                <div className="grid grid-cols-3 gap-2">
                  {EDITOR_BACKGROUNDS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => handleCustomChange('editorBg', c.value)}
                      className={`px-3 py-2 rounded-xl border text-center cursor-pointer text-xs font-semibold ${
                        customs.editorBg === c.value ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Font Override</label>
                <select
                  value={customs.fontFamily}
                  onChange={(e) => handleCustomChange('fontFamily', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs cursor-pointer focus:outline-none"
                >
                  {FONTS.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
                </select>
              </div>

              {/* Font Size & Border Density */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Font Scale</label>
                  <input
                    type="range" min="12" max="18"
                    value={customs.fontSize}
                    onChange={(e) => handleCustomChange('fontSize', parseInt(e.target.value))}
                    className="w-full accent-indigo-600 h-1 cursor-pointer"
                  />
                  <div className="text-[10px] text-center text-slate-400 font-bold">{customs.fontSize}px</div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Radius Mode</label>
                  <div className="flex gap-2">
                    {['compact', 'comfortable'].map(r => (
                      <button
                        key={r}
                        onClick={() => handleCustomChange('borderRadius', r)}
                        className={`flex-1 py-1.5 border rounded-lg text-[10px] font-bold capitalize cursor-pointer ${
                          customs.borderRadius === r ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Wallpaper & Glass opacity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Glass Effect</label>
                  <input
                    type="range" min="0.5" max="1.0" step="0.05"
                    value={customs.glassOpacity}
                    onChange={(e) => handleCustomChange('glassOpacity', parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 h-1 cursor-pointer"
                  />
                  <div className="text-[10px] text-center text-slate-400 font-bold">{Math.round(customs.glassOpacity * 100)}% Opacity</div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pattern Overlay</label>
                  <div className="flex gap-2">
                    {['none', 'dots'].map(w => (
                      <button
                        key={w}
                        onClick={() => handleCustomChange('wallpaperBg', w)}
                        className={`flex-1 py-1.5 border rounded-lg text-[10px] font-bold capitalize cursor-pointer ${
                          customs.wallpaperBg === w ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-6 text-xs">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Keyboard Shortcuts</h2>
            <p className="text-slate-550">Workspace key combinations.</p>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 text-xs">
                  <span className="text-slate-700">{s.action}</span>
                  <div className="flex items-center gap-1 font-mono">
                    {s.keys.map((k, j) => (
                      <React.Fragment key={j}>
                        <kbd className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-550 shadow-sm">{k}</kbd>
                        {j < s.keys.length - 1 && <span className="text-slate-300">+</span>}
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
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/50 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">Teamora Workspace</p>
                  <p className="text-[10px] text-slate-400">Release Build v1.1.0</p>
                </div>
              </div>
              <p className="text-slate-550 leading-relaxed">
                All-in-one collaborative workspace supporting document pagination, whiteboard grids, sheet sorting & freezing, slide presentations, meeting signaling, and customized app aesthetics.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex bg-white dark:bg-slate-950 overflow-hidden h-full transition-colors select-none">
      {/* Settings Sidebar Menu */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0 overflow-y-auto no-scrollbar">
        <div className="p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-4 flex items-center gap-1.5"><Sliders className="w-4 h-4" />Settings</h3>
          <div className="space-y-0.5">
            {SETTINGS_SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
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

      {/* Settings Content Screen */}
      <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
        <div className="max-w-xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
