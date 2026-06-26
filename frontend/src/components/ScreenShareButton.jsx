import React from 'react';
import { Tv, Play, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ScreenShareButton({
  isSharing,
  startSharing,
  stopSharing,
  presenter
}) {
  // Mobile / compatibility check
  const isSupported = React.useMemo(() => {
    return typeof window !== 'undefined' && 
      navigator.mediaDevices && 
      typeof navigator.mediaDevices.getDisplayMedia === 'function';
  }, []);

  const handleClick = () => {
    if (!isSupported) {
      toast.error('Screen sharing is not supported on this device/browser (e.g. mobile phones).');
      return;
    }
    
    if (isSharing) {
      stopSharing();
    } else {
      startSharing();
    }
  };

  if (!isSupported) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-semibold rounded-xl border border-slate-200/50 dark:border-slate-700/50 cursor-not-allowed opacity-50 relative group"
        title="Screen sharing unsupported on mobile/Safari iOS"
      >
        <Ban className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Share Screen</span>
        
        {/* Tooltip explanation */}
        <div className="absolute top-full right-0 mt-2 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50 shadow-md">
          Unsupported on mobile browsers
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={presenter && !isSharing}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer border ${
        isSharing
          ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/10'
          : presenter
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200/50 dark:border-slate-700/50 cursor-not-allowed opacity-60'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-md shadow-indigo-500/10'
      }`}
      title={isSharing ? 'Stop presenting your screen' : presenter ? `${presenter.user} is presenting` : 'Share your screen with the room'}
    >
      <Tv className={`w-3.5 h-3.5 ${isSharing ? 'animate-pulse' : ''}`} />
      <span>{isSharing ? 'Stop Sharing' : 'Share Screen'}</span>
    </button>
  );
}
