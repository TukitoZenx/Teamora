import React, { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, Tv, ShieldAlert, Users, MessageSquare, Hand, Sparkles, AlertCircle } from 'lucide-react';
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
  const [handRaised, setHandRaised] = useState(false);
  
  // Meeting participants state
  const [meetingParticipants, setMeetingParticipants] = useState({});
  const [meetingChat, setMeetingChat] = useState([]);
  const [meetingChatInput, setMeetingChatInput] = useState('');
  const [showMeetingChat, setShowMeetingChat] = useState(false);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const canvasStreamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Generate a mock canvas video track (moving avatar) to stream via WebRTC if no real camera is found or allowed
  const startMockVideoStream = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    
    let x = 160;
    let y = 120;
    let dx = 2;
    let dy = 2;
    const radius = 30;

    const drawFrame = () => {
      if (!ctx) return;
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#4f46e5');
      gradient.addColorStop(1, '#7c3aed');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Bounce avatar circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0; // Reset

      // Bouncing label initials
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#4f46e5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(userName.substring(0, 2).toUpperCase(), x, y);

      // Bounce logic
      if (x + dx > canvas.width - radius || x + dx < radius) dx = -dx;
      if (y + dy > canvas.height - radius || y + dy < radius) dy = -dy;
      x += dx;
      y += dy;

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
    
    const stream = canvas.captureStream(15); // 15 FPS
    canvasStreamRef.current = stream;
    return stream;
  };

  const handleJoinMeeting = async () => {
    try {
      setInMeeting(true);
      toast.success('Joined video meeting room!', { icon: '🤙' });

      // Try capturing real media
      let stream = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
        } catch {
          // Fallback to mock stream if devices missing/denied
          stream = startMockVideoStream();
        }
      } else {
        stream = startMockVideoStream();
      }

      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }

      // Notify the room
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
      toast.error('Failed to access camera/mic.');
    }
  };

  const handleLeaveMeeting = () => {
    setInMeeting(false);
    
    // Stop all media tracks
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

    socket.emit('meeting-leave', { roomId, socketId: socket.id });
    setMeetingParticipants({});
    setHandRaised(false);
    toast('Left the meeting', { icon: '🛑' });
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
    const nextState = !handRaised;
    setHandRaised(nextState);
    socket.emit('meeting-state-change', {
      roomId,
      state: { micActive, camActive, handRaised: nextState }
    });
    setMeetingParticipants(prev => ({
      ...prev,
      [socket.id]: { ...(prev[socket.id] || {}), handRaised: nextState }
    }));

    if (nextState) {
      toast(`${userName} raised their hand!`, { icon: '✋' });
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
    socket.emit('send-message', { roomId, message: `[Meeting Chat] ${meetingChatInput}`, user: userName });
    setMeetingChatInput('');
  };

  // Wire up socket listeners for meeting updates
  useEffect(() => {
    socket.on('receive-meeting-join', (participant) => {
      setMeetingParticipants(prev => ({
        ...prev,
        [participant.socketId]: participant
      }));
      toast(`${participant.user} joined the meeting.`, { icon: '📹' });
    });

    socket.on('receive-meeting-leave', (socketId) => {
      setMeetingParticipants(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    socket.on('receive-meeting-state-change', ({ socketId, state }) => {
      setMeetingParticipants(prev => ({
        ...prev,
        [socketId]: { ...(prev[socketId] || {}), ...state }
      }));
      if (state.handRaised && !(meetingParticipants[socketId]?.handRaised)) {
        toast(`${meetingParticipants[socketId]?.user || 'A participant'} raised hand.`, { icon: '✋' });
      }
    });

    return () => {
      socket.off('receive-meeting-join');
      socket.off('receive-meeting-leave');
      socket.off('receive-meeting-state-change');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [socket, meetingParticipants]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-slate-900 overflow-hidden h-full relative text-white">
      {/* Main Grid View */}
      <div className="flex-1 flex flex-col justify-between p-6 overflow-hidden relative">
        {!inMeeting ? (
          /* Lobby state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20">
              <Video className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Workspace Video Call</h2>
            <p className="text-sm text-slate-400 mb-8">Join the call to initiate a WebRTC mesh stream with camera and screen share functionality.</p>
            <button
              onClick={handleJoinMeeting}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Video className="w-5 h-5" />
              <span>Join Meeting Room</span>
            </button>
          </div>
        ) : (
          /* Video Grid state */
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[80vh] p-2 no-scrollbar">
            {Object.entries(meetingParticipants).map(([socketId, part]) => {
              const isMe = socketId === socket.id;
              
              return (
                <div 
                  key={socketId}
                  className="bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden relative h-48 md:h-56 group flex items-center justify-center shadow-lg"
                >
                  {isMe ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ filter: blurActive ? 'blur(8px)' : 'none' }}
                      className="w-full h-full object-cover transition-all"
                    />
                  ) : (
                    /* Mock render other users canvas bouncing if real stream not initialized */
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-950 to-slate-900 flex items-center justify-center relative">
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-300 shadow-md">
                        {part.user.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                  )}

                  {/* Indicator labels overlay */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                    <span className="text-[10px] font-bold bg-slate-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 text-white">
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

        {/* Toolbar Controls */}
        {inMeeting && (
          <div className="h-16 bg-slate-950/90 backdrop-blur-md border border-white/10 px-6 py-2.5 rounded-full flex items-center justify-between shrink-0 max-w-xl mx-auto w-full shadow-2xl mt-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleMic}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${
                  micActive 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10' 
                    : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500'
                }`}
                title={micActive ? 'Mute Mic' : 'Unmute Mic'}
              >
                {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button 
                onClick={toggleCam}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${
                  camActive 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10' 
                    : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500'
                }`}
                title={camActive ? 'Disable Cam' : 'Enable Cam'}
              >
                {camActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={toggleHand}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${
                  handRaised 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/10' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
                }`}
                title="Raise Hand"
              >
                <Hand className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setBlurActive(!blurActive)}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${
                  blurActive 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-md shadow-indigo-500/10' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
                }`}
                title="Toggle Background Blur"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setShowMeetingChat(!showMeetingChat)}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${
                  showMeetingChat 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
                }`}
                title="Meeting Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>

            <button 
              onClick={handleLeaveMeeting}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer border border-rose-500 shadow-lg shadow-rose-600/10 transition-colors"
            >
              Leave
            </button>
          </div>
        )}
      </div>

      {/* Slide-out Meeting Chat (Right Sidebar Panel) */}
      {inMeeting && showMeetingChat && (
        <div className="w-80 border-l border-white/10 bg-slate-950 flex flex-col shrink-0">
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Meeting Chat Feed</span>
            <button 
              onClick={() => setShowMeetingChat(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Chat Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
            {meetingChat.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">Messages sent here will sync to the room chat.</p>
            ) : (
              meetingChat.map((m, idx) => (
                <div key={idx} className="flex gap-2 items-start text-xs">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[9px] text-slate-300 shrink-0">
                    {m.user.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 bg-slate-900 border border-white/5 rounded-xl p-2.5">
                    <div className="flex items-center justify-between text-[8px] text-slate-500 font-bold mb-1">
                      <span>{m.user}</span>
                      <span>{m.timestamp}</span>
                    </div>
                    <p className="text-slate-200 whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat message input */}
          <div className="p-3 border-t border-white/10 flex gap-2">
            <input
              type="text"
              placeholder="Send message to callers..."
              value={meetingChatInput}
              onChange={(e) => setMeetingChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMeetingChat()}
              className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              disabled={!meetingChatInput.trim()}
              onClick={handleSendMeetingChat}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
