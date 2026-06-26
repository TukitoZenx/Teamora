import React, { useRef, useEffect, useState } from 'react';
import { Maximize, Minimize, Tv2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ScreenViewer({
  stream,
  presenter,
  isLocal,
  isLoading,
  onStopSharing,
  isHost,
  currentUserSocketId
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [objectFit, setObjectFit] = useState('contain'); // 'contain' | 'cover'
  const [pipSupported, setPipSupported] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    // Check if Picture-in-Picture is supported
    if (document.pictureInPictureEnabled || (videoRef.current && videoRef.current.webkitSupportsPresentationMode)) {
      setPipSupported(true);
    }
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleObjectFit = () => {
    setObjectFit(prev => prev === 'contain' ? 'cover' : 'contain');
  };

  const triggerPictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Failed to enter Picture-in-Picture mode:', err);
      toast.error('Picture-in-Picture failed.');
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-slate-900 flex flex-col justify-between relative overflow-hidden group select-none select-none rounded-2xl border border-slate-200/50 dark:border-slate-800/80"
    >
      {/* Top Overlay: Presenter Details */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 pointer-events-none transition-all duration-300 group-hover:translate-y-0 translate-y-[-10px] opacity-0 group-hover:opacity-100">
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-auto">
          <div 
            className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
            style={{ backgroundColor: presenter?.color }}
          />
          <span className="text-[11px] font-bold text-white whitespace-nowrap">
            {isLocal ? 'You' : presenter?.user || 'Someone'} is presenting
          </span>
        </div>

        {/* Host Control: Terminate Presentation */}
        {isHost && !isLocal && presenter && (
          <button
            onClick={() => onStopSharing(presenter.socketId)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[10px] font-bold border border-rose-500 shadow-lg cursor-pointer pointer-events-auto transition-colors"
          >
            Force Stop
          </button>
        )}
      </div>

      {/* Video element viewport */}
      <div className="flex-1 w-full h-full flex items-center justify-center relative bg-slate-950">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs font-semibold text-slate-400">Establishing peer connection...</span>
          </div>
        )}

        {!stream && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 gap-3 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-slate-500" />
            <span className="text-sm font-semibold text-slate-300">Screen stream disconnected</span>
            <span className="text-xs text-slate-500">Waiting for stream source connection...</span>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ objectFit }}
          className="w-full h-full transition-all duration-200"
        />
      </div>

      {/* Floating Bottom Control Overlay */}
      {stream && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-3 z-10 transition-all duration-300 group-hover:translate-y-0 translate-y-[10px] opacity-0 group-hover:opacity-100 shadow-xl">
          {/* Fit Toggle */}
          <button 
            onClick={toggleObjectFit} 
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer transition-colors text-xs font-semibold flex items-center gap-1"
            title={objectFit === 'contain' ? 'Fill screen' : 'Fit to screen'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{objectFit === 'contain' ? 'Fill' : 'Fit'}</span>
          </button>
          
          <div className="w-px h-4 bg-white/20" />

          {/* Picture in Picture */}
          {pipSupported && (
            <button 
              onClick={triggerPictureInPicture} 
              className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              title="Picture-in-Picture"
            >
              <Tv2 className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen */}
          <button 
            onClick={toggleFullscreen} 
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
