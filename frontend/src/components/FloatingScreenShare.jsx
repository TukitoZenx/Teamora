import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  X,
  Volume2,
  VolumeX,
  Pin,
  Settings,
  Tv2,
  Lock,
  MousePointer,
  Keyboard,
  PenTool,
  User,
  Loader2,
  AlertCircle,
  HelpCircle,
  Eye,
  Activity,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FloatingScreenShare({
  stream,
  presenter,
  isLocal,
  isLoading,
  onStopSharing,
  isHost,
  currentUserSocketId,
  socket,
  roomId,
  roomSettings = {},
  onClose
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  // Window placement state
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('teamora_screenshare_position');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Default bottom right
    return { x: window.innerWidth - 440, y: window.innerHeight - 345 };
  });

  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem('teamora_screenshare_size');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { width: 400, height: 280 };
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [resolution, setResolution] = useState('1920x1080');
  const [quality, setQuality] = useState('Excellent');

  // Permissions state (local write, synced via settings)
  const currentPermissions = roomSettings?.presentationPermissions || {
    viewOnly: true,
    allowAnnotation: false,
    allowRemoteMouse: false,
    allowKeyboard: false,
    hostOnly: false
  };

  // Dragging states
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Resizing states
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

  // Monitor screen resize to bounds check
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const maxX = window.innerWidth - size.width - 20;
        const maxY = window.innerHeight - size.height - 20;
        return {
          x: Math.max(10, Math.min(prev.x, maxX)),
          y: Math.max(10, Math.min(prev.y, maxY))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Extract real resolution
  useEffect(() => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        if (settings.width && settings.height) {
          setResolution(`${settings.width}x${settings.height}`);
        }
      }
    }
  }, [stream]);

  const handlePointerDownDrag = (e) => {
    if (isPinned || isMaximized || isMinimized) return;
    // Don't drag if clicking buttons
    if (e.target.closest('button') || e.target.closest('select')) return;
    setDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMoveDrag = (e) => {
    if (!dragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    
    // Bounds check
    const maxX = window.innerWidth - size.width - 10;
    const maxY = window.innerHeight - size.height - 50;
    const boundedX = Math.max(10, Math.min(newX, maxX));
    const boundedY = Math.max(10, Math.min(newY, maxY));
    
    const newPos = { x: boundedX, y: boundedY };
    setPosition(newPos);
    localStorage.setItem('teamora_screenshare_position', JSON.stringify(newPos));
  };

  const handlePointerUpDrag = (e) => {
    setDragging(false);
  };

  // Top-left resize handles (since it floats bottom-right, resizing from top-left is best)
  const handlePointerDownResize = (e) => {
    if (isMaximized || isMinimized) return;
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = {
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMoveResize = (e) => {
    if (!resizing) return;
    const deltaX = e.clientX - resizeStart.current.x;
    const deltaY = e.clientY - resizeStart.current.y;

    // Resizing top-left grows the container up and left, changing both size and position
    const newWidth = Math.max(300, resizeStart.current.width - deltaX);
    const newHeight = Math.max(200, resizeStart.current.height - deltaY);
    
    const newPosX = resizeStart.current.posX + (resizeStart.current.width - newWidth);
    const newPosY = resizeStart.current.posY + (resizeStart.current.height - newHeight);

    const newSize = { width: newWidth, height: newHeight };
    setSize(newSize);
    setPosition({ x: newPosX, y: newPosY });
    
    localStorage.setItem('teamora_screenshare_size', JSON.stringify(newSize));
  };

  const handlePointerUpResize = () => {
    setResizing(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => toast.error('Fullscreen failed.'));
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

  const triggerPictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      toast.error('Picture-in-Picture not supported or failed.');
    }
  };

  const updatePermissions = (field, value) => {
    if (!isLocal) return;
    const newPerms = { ...currentPermissions, [field]: value };
    socket.emit('update-room-settings', {
      roomId,
      settings: { presentationPermissions: newPerms }
    });
    toast.success('Permissions updated');
  };

  // Render minimized floating pill
  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[9999] bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-full shadow-2xl border border-indigo-500 cursor-pointer flex items-center gap-2.5 font-sans font-semibold text-xs transition-all hover:scale-105 active:scale-95 animate-bounce"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span>📺 {isLocal ? 'You' : presenter?.user || 'Someone'} is Presenting</span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:bg-white/20 rounded-full transition-colors text-white"
          title="End share/stop watching"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Position override for Maximized or Responsive Views
  const isMobile = window.innerWidth < 640;
  const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;
  
  let layoutStyle = {};
  let layoutClass = "";

  if (isMobile) {
    // Mobile Bottom Sheet
    layoutClass = "fixed bottom-0 inset-x-0 h-[40vh] z-[9999] rounded-t-2xl border-t shadow-2xl";
  } else if (isTablet) {
    // Tablet Docked Bottom-Right
    layoutClass = "fixed bottom-4 right-4 w-[350px] h-[250px] z-[9999] rounded-2xl shadow-xl border";
  } else if (isMaximized) {
    // Maximized Mode: Desktop Fixed Large Window
    layoutClass = "fixed inset-8 z-[9999] rounded-3xl shadow-2xl border bg-slate-900";
  } else {
    // Desktop Free Floating with Draggable / Resizable properties
    layoutClass = "fixed z-[9999] rounded-2xl shadow-2xl border";
    layoutStyle = {
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${size.width}px`,
      height: `${size.height}px`
    };
  }

  return (
    <div 
      ref={containerRef}
      style={layoutStyle}
      className={`bg-slate-900 border-slate-200/50 dark:border-slate-800 flex flex-col justify-between overflow-hidden select-none select-none transition-shadow ${layoutClass}`}
    >
      
      {/* Top Header Bar */}
      <div 
        onPointerDown={handlePointerDownDrag}
        onPointerMove={handlePointerMoveDrag}
        onPointerUp={handlePointerUpDrag}
        className={`px-4 py-2.5 bg-slate-950/80 dark:bg-slate-950/90 border-b border-white/5 flex items-center justify-between cursor-move text-white ${isPinned ? '!cursor-default' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold truncate">
            📺 {isLocal ? 'You (Presenter)' : `${presenter?.user || 'Someone'} is presenting`}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-slate-300 font-medium shrink-0">
            {quality} • {resolution}
          </span>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
          {/* Pin Toggle */}
          {!isMobile && !isTablet && !isMaximized && (
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isPinned ? 'text-amber-500 bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title={isPinned ? 'Unpin' : 'Pin Always On Top'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Minimize */}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Maximize */}
          {!isMobile && !isTablet && (
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title={isMaximized ? 'Restore Down' : 'Maximize'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Close viewer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Resize Handle (Top-Left corner) - Only visible on desktop, non-maximized, non-minimized */}
      {!isMobile && !isTablet && !isMaximized && !isMinimized && (
        <div
          onPointerDown={handlePointerDownResize}
          onPointerMove={handlePointerMoveResize}
          onPointerUp={handlePointerUpResize}
          className="absolute -top-1 -left-1 w-4 h-4 cursor-nwse-resize z-50 flex items-center justify-center group"
        >
          <div className="w-1.5 h-1.5 border-t-2 border-l-2 border-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Video Viewport Box */}
      <div className="flex-1 w-full h-full relative bg-slate-950 flex items-center justify-center overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs font-semibold text-slate-400">Loading stream...</span>
          </div>
        )}

        {!stream && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 gap-2 p-6 text-center">
            <AlertCircle className="w-6 h-6 text-slate-500" />
            <span className="text-xs font-semibold text-slate-400">Disconnected</span>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="w-full h-full object-contain"
        />

        {/* Floating Settings/Permissions Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-0 bg-slate-950/95 z-30 p-4 overflow-y-auto flex flex-col text-slate-200"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-indigo-500" />
                  Presentation Permissions
                </span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {isLocal ? (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-400 leading-normal">
                    As the presenter, select what actions your collaborators are allowed to perform during your session:
                  </p>
                  
                  {[
                    { id: 'viewOnly', label: 'View Only (Restricted)', icon: Eye },
                    { id: 'allowAnnotation', label: 'Allow Annotation (Draw/Overlay)', icon: PenTool },
                    { id: 'allowRemoteMouse', label: 'Allow Remote Cursor Control', icon: MousePointer },
                    { id: 'allowKeyboard', label: 'Allow Keyboard Input', icon: Keyboard },
                    { id: 'hostOnly', label: 'Host Access Only', icon: Lock }
                  ].map(option => {
                    const Icon = option.icon;
                    const isChecked = currentPermissions[option.id];
                    return (
                      <button
                        key={option.id}
                        onClick={() => updatePermissions(option.id, !isChecked)}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <Icon className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{option.label}</span>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-600 border-indigo-500' : 'border-white/20'}`}>
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Presenter {presenter?.user || 'Host'} has defined these session rules:
                  </p>
                  <div className="space-y-2">
                    {[
                      { id: 'viewOnly', label: 'View Only Mode', icon: Eye },
                      { id: 'allowAnnotation', label: 'Annotation', icon: PenTool },
                      { id: 'allowRemoteMouse', label: 'Remote Cursor', icon: MousePointer },
                      { id: 'allowKeyboard', label: 'Keyboard Input', icon: Keyboard },
                      { id: 'hostOnly', label: 'Host Only access', icon: Lock }
                    ].map(option => {
                      const Icon = option.icon;
                      const isEnabled = currentPermissions[option.id];
                      return (
                        <div key={option.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs opacity-75">
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{option.label}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isEnabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-white/5 flex items-center justify-between gap-3 text-white z-10">
        
        {/* Left Action: Permissions Settings Toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white cursor-pointer ${showSettings ? 'text-indigo-400 bg-white/5' : ''}`}
          title="Session rules & permissions"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Center: Remote Control (mock / info) */}
        <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full">
          <Activity className="w-3 h-3 text-indigo-500 shrink-0" />
          <span className="truncate">Remote Request</span>
        </div>

        {/* Right Actions: Mute, PiP, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Mute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute presentation' : 'Mute presentation'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Picture in Picture */}
          <button
            onClick={triggerPictureInPicture}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Picture-in-Picture"
          >
            <Tv2 className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Fullscreen Mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}
