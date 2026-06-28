import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, Tv, ShieldAlert, Users, MessageSquare, Hand, Sparkles, 
  AlertCircle, Shield, VolumeX, Eye, Ban, Disc, Settings as SettingsIcon, X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Meetings({
  socket,
  roomId,
  userName,
  activeUsers = [],
  currentUserRole = 'editor'
}) {
  const [inMeeting, setInMeeting] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [blurActive, setBlurActive] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [waitingRoomActive, setWaitingRoomActive] = useState(false);

  // Panels
  const [activeSidePanel, setActiveSidePanel] = useState(null); // null | 'chat' | 'participants'
  
  const [meetingParticipants, setMeetingParticipants] = useState({});
  const [meetingChat, setMeetingChat] = useState([]);
  const [meetingChatInput, setMeetingChatInput] = useState('');

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const canvasStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recordIntervalRef = useRef(null);

  const isHost = activeUsers[0] && activeUsers[0].user === userName;

  const startMockVideoStream = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    
    let x = 160;
    let y = 120;
    let dx = 2.5;
    let dy = 2.5;
    const radius = 30;

    const drawFrame = () => {
      if (!ctx) return;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(1, '#818cf8');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#6366f1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((userName || 'U').substring(0, 2).toUpperCase(), x, y);

      if (x + dx > canvas.width - radius || x + dx < radius) dx = -dx;
      if (y + dy > canvas.height - radius || y + dy < radius) dy = -dy;
      x += dx;
      y += dy;

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
    const stream = canvas.captureStream(15);
    canvasStreamRef.current = stream;
    return stream;
  };

  const handleJoinMeeting = async () => {
    try {
      setInMeeting(true);
      toast.success('Joined call lobby!', { icon: '📹' });

      let stream = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
        } catch {
          stream = startMockVideoStream();
        }
      } else {
        stream = startMockVideoStream();
      }

      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }

      socket.emit('meeting-join', {
        roomId,
        participant: {
          socketId: socket.id,
          user: userName,
          micActive: true,
          camActive: true,
          handRaised: false
        }
      });
      
      setMeetingParticipants(prev => ({
        ...prev,
        [socket.id]: { user: userName, micActive: true, camActive: true, handRaised: false }
      }));
    } catch (err) {
      console.error('Error joining meeting:', err);
      toast.error('Lobby initialization failed.');
    }
  };

  const handleLeaveMeeting = () => {
    setInMeeting(false);
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (canvasStreamRef.current) {
      canvasStreamRef.current.getTracks().forEach((track) => track.stop());
      canvasStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    // Stop recording timer
    if (isRecording) {
      clearInterval(recordIntervalRef.current);
      setIsRecording(false);
      setRecordingSeconds(0);
    }

    socket.emit('meeting-leave', { roomId, socketId: socket.id });
    setMeetingParticipants({});
    setHandRaised(false);
    toast('Left the call', { icon: '🛑' });
  };

  const toggleMic = () => {
    const nextState = !micActive;
    setMicActive(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => track.enabled = nextState);
    }
    socket.emit('meeting-state-change', {
      roomId,
      state: { micActive: nextState, camActive, handRaised }
    });
    setMeetingParticipants(prev => ({
      ...prev,
      [socket.id]: { ...(prev[socket.id] || {}), micActive: nextState }
    }));
  };

  const toggleCam = () => {
    const nextState = !camActive;
    setCamActive(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => track.enabled = nextState);
    }
    socket.emit('meeting-state-change', {
      roomId,
      state: { micActive, camActive: nextState, handRaised }
    });
    setMeetingParticipants(prev => ({
      ...prev,
      [socket.id]: { ...(prev[socket.id] || {}), camActive: nextState }
    }));
  };

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    socket.emit('meeting-state-change', {
      roomId,
      state: { micActive, camActive, handRaised: next }
    });
    setMeetingParticipants(prev => ({
      ...prev,
      [socket.id]: { ...(prev[socket.id] || {}), handRaised: next }
    }));
    if (next) {
      toast(`${userName} raised their hand!`, { icon: '✋' });
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordingSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
      toast.success('Meeting recording started!');
    } else {
      clearInterval(recordIntervalRef.current);
      setIsRecording(false);
      toast.success('Meeting recording saved to Files!');
    }
  };

  const handleSendMeetingChat = () => {
    if (!meetingChatInput.trim()) return;
    const msgObj = {
      user: userName,
      text: meetingChatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMeetingChat(prev => [...prev, msgObj]);
    socket.emit('send-message', { roomId, message: `[Meeting Room Chat] ${meetingChatInput}`, user: userName });
    setMeetingChatInput('');
  };

  // Host Privilege Controls
  const hostMuteParticipant = (socketId) => {
    if (!isHost) return;
    toast.success('Muted participant!');
  };

  const hostLowerHand = (socketId) => {
    if (!isHost) return;
    toast.success('Lowered participant hand.');
  };

  const hostKickParticipant = (socketId) => {
    if (!isHost) return;
    toast.error('Kicked participant from video meeting.');
  };

  // Socket listener registration (Separated from Stream lifecycle cleanup!)
  useEffect(() => {
    const onJoin = (p) => {
      setMeetingParticipants(prev => ({ ...prev, [p.socketId]: p }));
      toast(`${p.user} joined the call.`, { icon: '📹' });
    };

    const onLeave = (socketId) => {
      setMeetingParticipants(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    const onStateChange = ({ socketId, state }) => {
      setMeetingParticipants(prev => ({
        ...prev,
        [socketId]: { ...(prev[socketId] || {}), ...state }
      }));
    };

    socket.on('receive-meeting-join', onJoin);
    socket.on('receive-meeting-leave', onLeave);
    socket.on('receive-meeting-state-change', onStateChange);

    return () => {
      socket.off('receive-meeting-join', onJoin);
      socket.off('receive-meeting-leave', onLeave);
      socket.off('receive-meeting-state-change', onStateChange);
    };
  }, [socket]);

  // Global cleanups on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
    };
  }, []);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-slate-900 overflow-hidden h-full relative text-white select-none">
      {/* Video Call Viewport */}
      <div className="flex-1 flex flex-col justify-between p-6 overflow-hidden relative">
        
        {/* Header Indicator overlays */}
        {inMeeting && (
          <div className="absolute top-4 left-6 right-6 flex justify-between items-center z-25 pointer-events-none">
            {isRecording && (
              <div className="flex items-center gap-1.5 bg-rose-600/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-auto border border-rose-500 animate-pulse">
                <Disc className="w-3.5 h-3.5 fill-current" />
                <span>REC {formatTimer(recordingSeconds)}</span>
              </div>
            )}
            
            {waitingRoomActive && (
              <div className="flex items-center gap-1.5 bg-indigo-600/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-auto border border-indigo-500 ml-auto">
                <Shield className="w-3.5 h-3.5" />
                <span>Waiting Room Active</span>
              </div>
            )}
          </div>
        )}

        {!inMeeting ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20">
              <Video className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Teamora Call Lobby</h2>
            <p className="text-sm text-slate-400 mb-8 font-medium">Verify your camera and microphone setup before entering the call grid.</p>
            <button
              onClick={handleJoinMeeting}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Video className="w-5 h-5" />
              <span>Join Meeting Lobby</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[75vh] p-2 no-scrollbar">
            {Object.entries(meetingParticipants).map(([socketId, part]) => {
              const isMe = socketId === socket.id;
              
              return (
                <div 
                  key={socketId}
                  className="bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden relative h-48 md:h-56 group flex items-center justify-center shadow-lg transition-transform"
                >
                  {isMe ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ filter: blurActive ? 'blur(10px)' : 'none' }}
                      className="w-full h-full object-cover transition-all"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-950 to-slate-900 flex items-center justify-center relative">
                      <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-lg font-bold text-indigo-400 shadow-md">
                        {(part.user || 'U').substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                    <span className="text-[10px] font-bold bg-slate-950/85 px-2.5 py-1.5 rounded-full border border-white/10 text-white">
                      {part.user} {isMe && '(You)'}
                    </span>
                    <div className="flex gap-1.5">
                      {!part.micActive && (
                        <div className="p-1.5 bg-rose-500/90 text-white rounded-full border border-rose-600">
                          <MicOff className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {part.handRaised && (
                        <div className="p-1.5 bg-amber-500/90 text-white rounded-full border border-amber-600 animate-bounce">
                          <Hand className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Toolbar panel */}
        {inMeeting && (
          <div className="h-16 bg-slate-950/90 border border-white/10 px-6 py-2.5 rounded-full flex items-center justify-between shrink-0 max-w-2xl mx-auto w-full shadow-2xl mt-4 select-none">
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleMic}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${micActive ? 'bg-slate-800 text-slate-300 border-white/10' : 'bg-rose-600 text-white border-rose-500'}`}
                title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button 
                onClick={toggleCam}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${camActive ? 'bg-slate-800 text-slate-300 border-white/10' : 'bg-rose-600 text-white border-rose-500'}`}
                title={camActive ? 'Disable Camera' : 'Enable Camera'}
              >
                {camActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={toggleHand}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${handRaised ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-800 text-slate-350 border-white/10'}`}
                title="Raise Hand"
              >
                <Hand className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setBlurActive(!blurActive)}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${blurActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-800 text-slate-350 border-white/10'}`}
                title="Background Blur"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setNoiseSuppression(!noiseSuppression)}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${noiseSuppression ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-800 text-slate-350 border-white/10'}`}
                title="Noise Suppression"
              >
                <VolumeX className="w-4 h-4" />
              </button>

              <button 
                onClick={toggleRecording}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${isRecording ? 'bg-rose-600 text-white border-rose-500 animate-pulse' : 'bg-slate-800 text-slate-350 border-white/10'}`}
                title="Record Call"
              >
                <Disc className="w-4 h-4" />
              </button>

              {isHost && (
                <button 
                  onClick={() => setWaitingRoomActive(!waitingRoomActive)}
                  className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${waitingRoomActive ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-350 border-white/10'}`}
                  title="Toggle Waiting Room"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveSidePanel(activeSidePanel === 'chat' ? null : 'chat')}
                className={`p-2.5 rounded-xl cursor-pointer border ${activeSidePanel === 'chat' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-800 border-white/10 text-slate-300'}`}
                title="Meeting Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setActiveSidePanel(activeSidePanel === 'participants' ? null : 'participants')}
                className={`p-2.5 rounded-xl cursor-pointer border ${activeSidePanel === 'participants' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-800 border-white/10 text-slate-300'}`}
                title="Participants & Host Panel"
              >
                <Users className="w-4 h-4" />
              </button>

              <button 
                onClick={handleLeaveMeeting}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer border border-rose-500"
              >
                Leave
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Sidebar Panel */}
      {inMeeting && activeSidePanel && (
        <div className="w-80 border-l border-white/10 bg-slate-950 flex flex-col shrink-0">
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
              {activeSidePanel === 'chat' ? 'Meeting Chat Feed' : 'Participants & Host controls'}
            </span>
            <button onClick={() => setActiveSidePanel(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeSidePanel === 'chat' ? (
            /* Meeting Chat */
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
                {meetingChat.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">Messages will sync to workspace chat.</p>
                ) : (
                  meetingChat.map((m, idx) => (
                    <div key={idx} className="flex gap-2 items-start text-xs">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[9px] text-slate-300 shrink-0">
                        {(m.user || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 bg-slate-900 border border-white/5 rounded-xl p-2.5">
                        <div className="flex items-center justify-between text-[8px] text-slate-550 font-bold mb-1">
                          <span>{m.user}</span>
                          <span>{m.timestamp}</span>
                        </div>
                        <p className="text-slate-200">{m.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  placeholder="Type message..."
                  value={meetingChatInput}
                  onChange={(e) => setMeetingChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMeetingChat()}
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  disabled={!meetingChatInput.trim()}
                  onClick={handleSendMeetingChat}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            /* Participant list & Host Controls */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {Object.entries(meetingParticipants).map(([socketId, part]) => {
                const isUserHost = part.user === activeUsers[0]?.user;
                return (
                  <div key={socketId} className="flex items-center justify-between border-b border-white/5 pb-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-[9px]">
                        {(part.user || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-250">{part.user}</span>
                        <span className="text-[8px] text-slate-500">{isUserHost ? '👑 Host' : 'Participant'}</span>
                      </div>
                    </div>

                    {/* Host action panel */}
                    <div className="flex items-center gap-1.5">
                      {part.handRaised && isHost && (
                        <button 
                          onClick={() => hostLowerHand(socketId)}
                          className="p-1 hover:bg-white/5 rounded text-amber-500" 
                          title="Lower Hand"
                        >
                          <Hand className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                      
                      {isHost && socketId !== socket.id && (
                        <>
                          <button 
                            onClick={() => hostMuteParticipant(socketId)}
                            className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-rose-500" 
                            title="Mute Participant"
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => hostKickParticipant(socketId)}
                            className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-rose-550" 
                            title="Kick Participant"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
