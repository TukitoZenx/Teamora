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
  const [waitingUsers, setWaitingUsers] = useState([]); // [ { socketId, user } ]
  const [admitted, setAdmitted] = useState(false); // Used to block users in waiting room

  // Screen share stream
  const [screenSharingActive, setScreenSharingActive] = useState(false);
  const screenStreamRef = useRef(null);

  // WebRTC mesh states
  const [remoteStreams, setRemoteStreams] = useState({}); // { socketId: { stream } }
  const peersRef = useRef({}); // { socketId: RTCPeerConnection }

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

  const initiatePeerConnection = async (targetSocketId, isInitiator) => {
    if (peersRef.current[targetSocketId]) {
      peersRef.current[targetSocketId].close();
      delete peersRef.current[targetSocketId];
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('meeting-signal', {
          roomId,
          targetSocketId,
          signal: { type: 'candidate', candidate: e.candidate }
        });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStreams(prev => ({
        ...prev,
        [targetSocketId]: {
          stream: e.streams[0]
        }
      }));
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peersRef.current[targetSocketId] = pc;

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('meeting-signal', {
          roomId,
          targetSocketId,
          signal: { type: 'offer', sdp: pc.localDescription }
        });
      } catch (err) {
        console.error('Failed to create WebRTC offer:', err);
      }
    }

    return pc;
  };

  const toggleScreenShare = async () => {
    if (!screenSharingActive) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setScreenSharingActive(true);
        
        // Replace video track in all WebRTC peers
        const videoTrack = stream.getVideoTracks()[0];
        Object.values(peersRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        videoTrack.onended = () => {
          stopScreenShare();
        };
        
        toast.success('Screen sharing started!');
      } catch (err) {
        console.error('Screen share error:', err);
        toast.error('Failed to share screen.');
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setScreenSharingActive(false);
    
    // Restore camera video track in all WebRTC peers
    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      if (cameraTrack) {
        Object.values(peersRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(cameraTrack);
          }
        });
      }
    }
    toast('Screen sharing stopped.');
  };

  const handleJoinMeeting = async () => {
    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
      } catch (err) {
        console.error('Real media devices fail, using fallback:', err);
        stream = startMockVideoStream();
      }

      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }

      // Check if we are host or if waiting room is active
      const hostUserObj = activeUsers[0];
      const hostIsMe = hostUserObj && hostUserObj.user === userName;

      if (waitingRoomActive && !hostIsMe && !admitted) {
        // Send join request to host via signaling!
        socket.emit('meeting-signal', {
          roomId,
          targetSocketId: hostUserObj.socketId || '', // Relay to host
          signal: { type: 'waiting-room-request', user: userName, socketId: socket.id }
        });
        toast('Waiting for host to admit you...', { icon: '⏳' });
        setInMeeting(true); // Shows video screen but waiting overlays
        return;
      }

      setInMeeting(true);
      setAdmitted(true);
      toast.success('Joined meeting grid!', { icon: '📹' });

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
      toast.error('Initialization failed.');
    }
  };

  const handleLeaveMeeting = () => {
    setInMeeting(false);
    setAdmitted(false);
    
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

    // Close all WebRTC peer connections
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    setRemoteStreams({});

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
  const hostMuteParticipant = (targetSocketId) => {
    if (!isHost) return;
    socket.emit('meeting-signal', {
      roomId,
      targetSocketId,
      signal: { type: 'host-action', action: 'mute' }
    });
    toast.success('Signaled user to mute mic.');
  };

  const hostLowerHand = (targetSocketId) => {
    if (!isHost) return;
    socket.emit('meeting-signal', {
      roomId,
      targetSocketId,
      signal: { type: 'host-action', action: 'lower-hand' }
    });
    toast.success('Lowered user hand.');
  };

  const hostKickParticipant = (targetSocketId) => {
    if (!isHost) return;
    socket.emit('meeting-signal', {
      roomId,
      targetSocketId,
      signal: { type: 'host-action', action: 'kick' }
    });
    toast.error('Kicked user.');
  };

  const hostAdmitParticipant = (targetSocketId, name) => {
    if (!isHost) return;
    socket.emit('meeting-signal', {
      roomId,
      targetSocketId,
      signal: { type: 'host-action', action: 'admit' }
    });
    setWaitingUsers(prev => prev.filter(u => u.socketId !== targetSocketId));
    toast.success(`Admitted ${name}!`);
  };

  const hostDenyParticipant = (targetSocketId, name) => {
    if (!isHost) return;
    socket.emit('meeting-signal', {
      roomId,
      targetSocketId,
      signal: { type: 'host-action', action: 'kick' }
    });
    setWaitingUsers(prev => prev.filter(u => u.socketId !== targetSocketId));
    toast.error(`Denied ${name}.`);
  };

  // Socket listener registration
  useEffect(() => {
    const onJoin = (p) => {
      // If waiting room is active and we are host, add user to waiting list
      if (waitingRoomActive && isHost) {
        setWaitingUsers(prev => {
          if (prev.some(u => u.socketId === p.socketId)) return prev;
          return [...prev, { socketId: p.socketId, user: p.user }];
        });
        toast(`${p.user} is waiting in the lobby.`, { icon: '⏳' });
        return;
      }

      setMeetingParticipants(prev => ({ ...prev, [p.socketId]: p }));
      toast(`${p.user} joined the call.`, { icon: '📹' });

      // Existing peers initiate WebRTC connection with new joiners
      if (inMeeting && p.socketId !== socket.id) {
        initiatePeerConnection(p.socketId, true);
      }
    };

    const onLeave = (socketId) => {
      setMeetingParticipants(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setWaitingUsers(prev => prev.filter(u => u.socketId !== socketId));
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].close();
        delete peersRef.current[socketId];
      }
    };

    const onStateChange = ({ socketId, state }) => {
      setMeetingParticipants(prev => ({
        ...prev,
        [socketId]: { ...(prev[socketId] || {}), ...state }
      }));
    };

    const onSignal = async ({ senderSocketId, signal }) => {
      if (signal.type === 'waiting-room-request' && isHost) {
        setWaitingUsers(prev => {
          if (prev.some(u => u.socketId === senderSocketId)) return prev;
          return [...prev, { socketId: senderSocketId, user: signal.user }];
        });
        toast(`${signal.user} is waiting to join the call.`, { icon: '⏳' });
      } else if (signal.type === 'offer') {
        const pc = await initiatePeerConnection(senderSocketId, false);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('meeting-signal', {
            roomId,
            targetSocketId: senderSocketId,
            signal: { type: 'answer', sdp: pc.localDescription }
          });
        } catch (err) {
          console.error('Error handling WebRTC offer signal:', err);
        }
      } else if (signal.type === 'answer') {
        const pc = peersRef.current[senderSocketId];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          } catch (err) {
            console.error('Error setting remote description answer:', err);
          }
        }
      } else if (signal.type === 'candidate') {
        const pc = peersRef.current[senderSocketId];
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        }
      } else if (signal.type === 'host-action') {
        if (signal.action === 'mute') {
          setMicActive(false);
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => track.enabled = false);
          }
          socket.emit('meeting-state-change', {
            roomId,
            state: { micActive: false, camActive, handRaised }
          });
          toast.error('The host muted your microphone.');
        } else if (signal.action === 'lower-hand') {
          setHandRaised(false);
          socket.emit('meeting-state-change', {
            roomId,
            state: { micActive, camActive, handRaised: false }
          });
          toast('The host lowered your hand.');
        } else if (signal.action === 'kick') {
          handleLeaveMeeting();
          toast.error('You were disconnected by the host.');
        } else if (signal.action === 'admit') {
          setAdmitted(true);
          toast.success('Admitted into the call!');
          // Now join active participants grid
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
        }
      }
    };

    socket.on('receive-meeting-join', onJoin);
    socket.on('receive-meeting-leave', onLeave);
    socket.on('receive-meeting-state-change', onStateChange);
    socket.on('receive-meeting-signal', onSignal);

    return () => {
      socket.off('receive-meeting-join', onJoin);
      socket.off('receive-meeting-leave', onLeave);
      socket.off('receive-meeting-state-change', onStateChange);
      socket.off('receive-meeting-signal', onSignal);
    };
  }, [socket, inMeeting, waitingRoomActive, isHost, admitted, micActive, camActive, handRaised]);

  // Global cleanups on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
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

        {inMeeting && !admitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mb-6 border border-amber-500/20 animate-pulse">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Teamora Call Lobby</h2>
            <p className="text-sm text-slate-400 mb-8 font-medium">Please wait. The host has enabled the waiting room for this call.</p>
            <button
              onClick={handleLeaveMeeting}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl cursor-pointer border border-white/10"
            >
              Leave Lobby
            </button>
          </div>
        ) : !inMeeting ? (
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
                  ) : remoteStreams[socketId]?.stream ? (
                    <video
                      ref={(el) => {
                        if (el && remoteStreams[socketId]?.stream) {
                          el.srcObject = remoteStreams[socketId].stream;
                        }
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ display: part.camActive ? 'block' : 'none' }}
                    />
                  ) : null}

                  {/* Fallback avatar if not me and camera is disabled or stream not connected yet */}
                  {!isMe && (!part.camActive || !remoteStreams[socketId]?.stream) && (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-950 to-slate-900 flex items-center justify-center absolute inset-0">
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
        {inMeeting && admitted && (
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

              <button 
                onClick={toggleScreenShare}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${screenSharingActive ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-350 border-white/10'}`}
                title={screenSharingActive ? 'Stop Sharing Screen' : 'Share Screen'}
              >
                <Tv className="w-4 h-4" />
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar text-xs">
              {/* Waiting Room Queue for Host */}
              {isHost && waitingUsers.length > 0 && (
                <div className="space-y-2 border-b border-white/10 pb-4 mb-4">
                  <span className="font-bold text-[10px] uppercase text-amber-400 tracking-wider block">Waiting List ({waitingUsers.length})</span>
                  {waitingUsers.map(user => (
                    <div key={user.socketId} className="flex items-center justify-between bg-slate-900 border border-amber-500/20 rounded-xl p-2.5">
                      <span className="font-semibold text-slate-200 truncate flex-1">{user.user}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => hostAdmitParticipant(user.socketId, user.user)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Admit
                        </button>
                        <button
                          onClick={() => hostDenyParticipant(user.socketId, user.user)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
