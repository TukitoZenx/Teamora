import React from 'react';
import { UserButton } from "@clerk/clerk-react";
import { 
  Building2, 
  Check, 
  Wifi, 
  WifiOff, 
  Moon, 
  Sun, 
  Share2,
  CloudLightning
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TopNavbar({
  workspaceName,
  roomId,
  isDarkMode,
  setIsDarkMode,
  activeUsers,
  isConnected,
  latency,
  isSaving
}) {
  const [copied, setCopied] = React.useState(false);

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-40 transition-colors duration-300">
      {/* Left: Brand & Workspace */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-800 dark:text-slate-100 hidden sm:inline-block">CollabSpace</span>
        </div>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
            {workspaceName || 'Team Workspace'}
          </span>
        </div>
      </div>

      {/* Center: Room Actions */}
      <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 max-w-md w-96 hidden md:flex">
        <span className="text-xs text-slate-500 font-mono select-all truncate flex-1">
          Room: {roomId}
        </span>
        <button
          onClick={copyInviteLink}
          className="text-slate-400 hover:text-indigo-500 transition-colors p-1 rounded-full hover:bg-white dark:hover:bg-slate-800"
          title="Copy Invite Link"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Right: Status, Avatars, Actions, User */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/50 text-slate-500 dark:text-slate-400">
          {isConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span className="hidden lg:inline">{latency ? `${latency}ms` : 'Connected'}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden lg:inline">Disconnected</span>
            </>
          )}
        </div>

        {/* Save Status */}
        <div className="text-xs font-medium text-slate-400 dark:text-slate-500 hidden lg:flex items-center gap-1">
          <CloudLightning className={`w-3.5 h-3.5 ${isSaving ? 'text-indigo-500 animate-bounce' : 'text-slate-400'}`} />
          {isSaving ? 'Saving...' : 'Saved'}
        </div>

        {/* Collaborative Avatars */}
        <div className="flex -space-x-2 overflow-hidden mr-2 max-w-[120px] lg:max-w-none">
          {activeUsers.slice(0, 4).map((activeUser, idx) => (
            <img 
              key={idx}
              src={activeUser.imageUrl || 'https://www.gravatar.com/avatar/?d=mp'} 
              alt={activeUser.user} 
              title={`${activeUser.user} (${activeUser.activeApp || 'viewing'})`}
              style={{ borderColor: activeUser.color || '#6366f1' }}
              className="w-8 h-8 rounded-full border-2 object-cover ring-2 ring-white dark:ring-slate-950" 
            />
          ))}
          {activeUsers.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-950 flex items-center justify-center text-xs font-semibold text-slate-500">
              +{activeUsers.length - 4}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="flex items-center">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
}
