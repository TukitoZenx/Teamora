import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Tv,
  Users,
  MessageSquare,
  Hand,
  Sparkles,
  Shield,
  VolumeX,
  Ban,
  Disc,
  X,
  LayoutGrid,
  Maximize2,
  Pin,
  Activity,
  Smile
} from 'lucide-react'
import toast from 'react-hot-toast'
import { describeIceSetup } from '../services/webrtcIce'
import { MeetingPeerManager } from '../services/meetingPeerManager'
import { addWorkspaceNotification, dismissMeetingNotifications } from './utils/notifications'

const REACTIONS = ['👍', '👏', '❤️', '😂', '🎉', '👋']
const MAX_DIAG = 80

function RemoteVideo({ stream, hidden }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    if (video.srcObject !== stream) video.srcObject = stream
    video.play?.().catch(() => {})
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="h-full w-full object-cover"
      style={{ display: hidden ? 'none' : 'block' }}
    />
  )
}

/**
 * Production Teamora meeting room: mesh WebRTC via MeetingPeerManager,
 * hybrid signaling, host controls, chat, views, diagnostics.
 */
export default function Meetings({ socket, roomId, userName }) {
  const [inMeeting, setInMeeting] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [micActive, setMicActive] = useState(true)
  const [camActive, setCamActive] = useState(true)
  const [blurActive, setBlurActive] = useState(false)
  const [noiseSuppression, setNoiseSuppression] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [waitingRoomActive, setWaitingRoomActive] = useState(false)
  const [waitingUsers, setWaitingUsers] = useState([])
  const [admitted, setAdmitted] = useState(false)
  const [screenSharingActive, setScreenSharingActive] = useState(false)
  const [remoteStreams, setRemoteStreams] = useState({})
  const [speakingMap, setSpeakingMap] = useState({})
  const [activeSidePanel, setActiveSidePanel] = useState(null)
  const [meetingParticipants, setMeetingParticipants] = useState({})
  const [meetingChat, setMeetingChat] = useState([])
  const [meetingChatInput, setMeetingChatInput] = useState('')
  const [hostInfo, setHostInfo] = useState({ hostSocketId: '', hostName: '' })
  const [layoutMode, setLayoutMode] = useState('grid') // grid | speaker
  const [pinnedId, setPinnedId] = useState(null)
  const [showDiag, setShowDiag] = useState(false)
  const [diagLines, setDiagLines] = useState([])
  const [peerStates, setPeerStates] = useState({})
  const [reactions, setReactions] = useState([])
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [diagnostics, setDiagnostics] = useState(null)

  const screenStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const canvasStreamRef = useRef(null)
  const animationFrameRef = useRef(null)
  const recordIntervalRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const audioAnalysersRef = useRef({})
  const peerManagerRef = useRef(null)
  const inMeetingRef = useRef(false)
  const admittedRef = useRef(false)
  const participantsRef = useRef({})
  const hostInfoRef = useRef(hostInfo)
  const waitingRoomActiveRef = useRef(false)
  const isHostRef = useRef(false)
  const micCamHandRef = useRef({ micActive: true, camActive: true, handRaised: false })
  const screenSharingRef = useRef(false)
  const handleLeaveRef = useRef(() => {})
  const waitingRoomResolverRef = useRef(null)

  const socketId = socket?.id
  const isHost = hostInfo.hostSocketId === socketId

  useEffect(() => {
    inMeetingRef.current = inMeeting
  }, [inMeeting])
  useEffect(() => {
    admittedRef.current = admitted
  }, [admitted])
  useEffect(() => {
    participantsRef.current = meetingParticipants
  }, [meetingParticipants])
  useEffect(() => {
    hostInfoRef.current = hostInfo
  }, [hostInfo])
  useEffect(() => {
    waitingRoomActiveRef.current = waitingRoomActive
  }, [waitingRoomActive])
  useEffect(() => {
    isHostRef.current = isHost
  }, [isHost])
  useEffect(() => {
    micCamHandRef.current = { micActive, camActive, handRaised }
  }, [micActive, camActive, handRaised])
  useEffect(() => {
    screenSharingRef.current = screenSharingActive
  }, [screenSharingActive])

  const pushDiag = useCallback((line) => {
    const stamped = `${new Date().toLocaleTimeString()} ${line}`
    setDiagLines((prev) => [...prev.slice(-(MAX_DIAG - 1)), stamped])
  }, [])

  const emitSignal = useCallback(
    (targetSocketId, signal) => {
      if (!socket?.emit) return
      socket.emit('meeting-signal', {
        roomId,
        targetSocketId,
        signal
      })
    },
    [socket, roomId]
  )

  const requestWaitingRoomStatus = useCallback(() => {
    if (!socketId) return Promise.resolve({ active: false })

    return new Promise((resolve) => {
      const finish = (status) => {
        if (!waitingRoomResolverRef.current) return
        waitingRoomResolverRef.current = null
        window.clearTimeout(timer)
        resolve(status)
      }
      const timer = window.setTimeout(() => finish({ active: false }), 350)
      waitingRoomResolverRef.current = finish
      emitSignal(undefined, { type: 'waiting-room-status-request', from: socketId })
    })
  }, [socketId, emitSignal])

  const attachSpeakingMonitor = useCallback((socketId, stream) => {
    try {
      if (!stream?.getAudioTracks?.().length) return
      if (audioAnalysersRef.current[socketId]) return
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      audioAnalysersRef.current[socketId] = { ctx, analyser, data }
    } catch {
      // Autoplay / audio context restrictions
    }
  }, [])

  const clearSpeakingMonitor = useCallback((socketId) => {
    const pack = audioAnalysersRef.current[socketId]
    if (!pack) return
    try {
      pack.ctx?.close?.()
    } catch {
      // ignore
    }
    delete audioAnalysersRef.current[socketId]
  }, [])

  const attachRemoteStream = useCallback(
    (peerId, stream) => {
      setRemoteStreams((prev) => {
        const existing = prev[peerId]?.stream
        let nextStream = stream
        if (existing && stream && existing !== stream) {
          nextStream = existing
          stream.getTracks().forEach((t) => {
            if (!nextStream.getTracks().some((x) => x.id === t.id)) nextStream.addTrack(t)
          })
        }
        return { ...prev, [peerId]: { stream: nextStream } }
      })
      attachSpeakingMonitor(peerId, stream)
    },
    [attachSpeakingMonitor]
  )

  const destroyPeerManager = useCallback(() => {
    if (peerManagerRef.current) {
      peerManagerRef.current.destroy()
      peerManagerRef.current = null
    }
  }, [])

  const refreshDiagnostics = useCallback(() => {
    setDiagnostics(peerManagerRef.current?.getDiagnostics?.() || null)
  }, [])

  const ensurePeerManager = useCallback(() => {
    if (!socketId) return null
    if (peerManagerRef.current && peerManagerRef.current.selfId === socketId) {
      return peerManagerRef.current
    }
    destroyPeerManager()
    const mgr = new MeetingPeerManager({
      selfId: socketId,
      emitSignal: (targetId, signal) => emitSignal(targetId, signal),
      onRemoteStream: (peerId, stream) => attachRemoteStream(peerId, stream),
      onPeerState: (peerId, state) => {
        setPeerStates((prev) => ({ ...prev, [peerId]: state }))
        refreshDiagnostics()
      },
      onPeerRemoved: (peerId) => {
        setRemoteStreams((prev) => {
          const next = { ...prev }
          delete next[peerId]
          return next
        })
        setPeerStates((prev) => {
          const next = { ...prev }
          delete next[peerId]
          return next
        })
        clearSpeakingMonitor(peerId)
        refreshDiagnostics()
      },
      onDiag: pushDiag,
      isPeerActive: (peerId) => Boolean(inMeetingRef.current && admittedRef.current && participantsRef.current[peerId])
    })
    if (localStreamRef.current) mgr.setLocalStream(localStreamRef.current)
    peerManagerRef.current = mgr
    refreshDiagnostics()
    return mgr
  }, [socketId, emitSignal, attachRemoteStream, clearSpeakingMonitor, destroyPeerManager, pushDiag, refreshDiagnostics])

  const connectToPeer = useCallback(
    (targetSocketId) => {
      if (!targetSocketId || targetSocketId === socketId) return
      if (!inMeetingRef.current || !admittedRef.current) return
      const mgr = ensurePeerManager()
      mgr?.connect(targetSocketId)
    },
    [socketId, ensurePeerManager]
  )

  const startMockVideoStream = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    let x = 160
    let y = 120
    let dx = 2.5
    let dy = 2.5
    const radius = 30

    const drawFrame = () => {
      if (!ctx) return
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#6366f1')
      gradient.addColorStop(1, '#818cf8')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(0,0,0,0.2)'
      ctx.shadowBlur = 8
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.font = 'bold 16px sans-serif'
      ctx.fillStyle = '#6366f1'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText((userName || 'U').substring(0, 2).toUpperCase(), x, y)
      if (x + dx > canvas.width - radius || x + dx < radius) dx = -dx
      if (y + dy > canvas.height - radius || y + dy < radius) dy = -dy
      x += dx
      y += dy
      animationFrameRef.current = requestAnimationFrame(drawFrame)
    }
    drawFrame()
    const stream = canvas.captureStream(15)
    canvasStreamRef.current = stream
    return stream
  }, [userName])

  // Speaking indicators
  useEffect(() => {
    if (!inMeeting) return undefined
    const tick = () => {
      const next = {}
      Object.entries(audioAnalysersRef.current).forEach(([id, pack]) => {
        try {
          pack.analyser.getByteFrequencyData(pack.data)
          const avg = pack.data.reduce((a, b) => a + b, 0) / (pack.data.length || 1)
          next[id] = avg > 18
        } catch {
          next[id] = false
        }
      })
      if (localStreamRef.current && micActive && socketId) {
        try {
          if (!audioAnalysersRef.current[socketId]) {
            attachSpeakingMonitor(socketId, localStreamRef.current)
          }
          const pack = audioAnalysersRef.current[socketId]
          if (pack) {
            pack.analyser.getByteFrequencyData(pack.data)
            const avg = pack.data.reduce((a, b) => a + b, 0) / (pack.data.length || 1)
            next[socketId] = avg > 18
          }
        } catch {
          // ignore
        }
      }
      setSpeakingMap(next)
    }
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [inMeeting, micActive, socketId, attachSpeakingMonitor])

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
    }
    setScreenSharingActive(false)
    peerManagerRef.current?.setScreenTrack(null)
    toast('Screen sharing stopped.')
  }, [])

  const toggleScreenShare = async () => {
    if (!screenSharingActive) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always', displaySurface: 'monitor' },
          audio: true
        })
        screenStreamRef.current = stream
        setScreenSharingActive(true)
        const videoTrack = stream.getVideoTracks()[0]
        peerManagerRef.current?.setScreenTrack(videoTrack)
        emitSignal(undefined, { type: 'screen-share-started', from: socketId })
        videoTrack.onended = () => stopScreenShare()
        toast.success('Screen sharing started')
        pushDiag('screen share started')
      } catch (err) {
        console.error('Screen share error:', err)
        toast.error('Failed to share screen.')
      }
    } else {
      stopScreenShare()
    }
  }

  const requestScreenControl = (targetSocketId) => {
    emitSignal(targetSocketId, { type: 'control-request', from: socketId, user: userName })
    toast('Control request sent — peer must approve')
  }

  const respondScreenControl = useCallback(
    (requesterId, allowed) => {
      emitSignal(requesterId, { type: 'control-response', allowed, from: socketId })
      toast(allowed ? 'You granted remote control' : 'You denied remote control')
    },
    [emitSignal, socketId]
  )

  const handleLeaveMeeting = useCallback(() => {
    setInMeeting(false)
    setAdmitted(false)

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (canvasStreamRef.current) {
      canvasStreamRef.current.getTracks().forEach((track) => track.stop())
      canvasStreamRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
    }
    setScreenSharingActive(false)
    if (localVideoRef.current) localVideoRef.current.srcObject = null

    destroyPeerManager()
    setRemoteStreams({})
    setPeerStates({})
    Object.keys(audioAnalysersRef.current).forEach(clearSpeakingMonitor)

    if (isRecording) {
      clearInterval(recordIntervalRef.current)
      setIsRecording(false)
      setRecordingSeconds(0)
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore
      }
    }

    socket?.emit?.('meeting-leave', { roomId, socketId })
    const remaining = Object.keys(participantsRef.current).filter((id) => id !== socketId)
    if (remaining.length === 0) {
      socket?.emit?.('meeting-ended', { workspaceId: roomId, meetingId: `meet-${roomId}` })
      dismissMeetingNotifications(roomId)
    }
    setMeetingParticipants({})
    setHandRaised(false)
    setPinnedId(null)
    setActiveSidePanel(null)
    setShowReactionPicker(false)
    toast('Left the call', { icon: '🛑' })
  }, [socket, socketId, roomId, isRecording, destroyPeerManager, clearSpeakingMonitor])

  useEffect(() => {
    handleLeaveRef.current = handleLeaveMeeting
  }, [handleLeaveMeeting])

  const handleJoinMeeting = async () => {
    if (inMeeting || isJoining) return
    setIsJoining(true)
    try {
      // Ask an existing host before joining. This avoids bypassing a waiting
      // room when a participant opens the meeting page after it was enabled.
      const waitingRoomStatus = await requestWaitingRoomStatus()
      let stream = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        localStreamRef.current = stream
      } catch (err) {
        console.error('Real media devices fail, using fallback:', err)
        stream = startMockVideoStream()
        localStreamRef.current = stream
      }

      const host = waitingRoomStatus.hostSocketId
        ? {
            hostSocketId: waitingRoomStatus.hostSocketId,
            hostName: waitingRoomStatus.hostName || ''
          }
        : hostInfoRef.current
      const hostUserObj = host.hostSocketId ? { socketId: host.hostSocketId, user: host.hostName } : null
      const hostIsMe = hostUserObj && hostUserObj.socketId === socketId

      if (waitingRoomStatus.active && !hostIsMe && !admittedRef.current) {
        if (!hostUserObj?.socketId) {
          socket.emit('meeting-claim-host', { hostSocketId: socketId, hostName: userName })
          setHostInfo({ hostSocketId: socketId, hostName: userName })
        } else {
          emitSignal(hostUserObj.socketId, {
            type: 'waiting-room-request',
            user: userName,
            socketId
          })
          toast('Waiting for host to admit you...', { icon: '⏳' })
          setInMeeting(true)
          return
        }
      }

      setInMeeting(true)
      setAdmitted(true)
      const ice = describeIceSetup()
      toast.success(
        ice.hasTurn ? 'Joined meeting (TURN enabled)' : 'Joined — set VITE_TURN_* for multi-network reliability',
        { icon: '📹', duration: ice.hasTurn ? 3000 : 5000 }
      )
      pushDiag(`joined ice hasTurn=${ice.hasTurn} self=${socketId}`)

      if (!hostInfoRef.current.hostSocketId) {
        socket.emit('meeting-claim-host', { hostSocketId: socketId, hostName: userName })
      }

      const selfParticipant = {
        socketId,
        user: userName,
        micActive: true,
        camActive: Boolean(stream?.getVideoTracks?.().length),
        handRaised: false
      }

      const mgr = ensurePeerManager()
      mgr?.setLocalStream(stream)

      socket.emit('meeting-join', { roomId, participant: selfParticipant })
      // Untargeted sync so existing peers re-announce + we mesh
      emitSignal(undefined, {
        type: 'sync-request',
        from: socketId,
        participant: selfParticipant
      })

      const meetingTitle = `Teamora Call · ${userName || 'Host'}`
      socket.emit('meeting-started', {
        workspaceId: roomId,
        meetingId: `meet-${roomId}`,
        title: meetingTitle,
        organizer: userName,
        startedAt: new Date().toISOString()
      })
      addWorkspaceNotification({
        type: 'meeting_started',
        message: `${userName || 'Someone'} started a meeting`,
        workspaceId: roomId,
        workspaceName: meetingTitle,
        action: { type: 'join_meeting', workspaceId: roomId },
        meta: { meetingId: `meet-${roomId}`, organizer: userName, title: meetingTitle },
        dedupeKey: `meeting-started:${roomId}`
      })

      setMeetingParticipants((prev) => ({
        ...prev,
        [socketId]: {
          user: userName,
          micActive: true,
          camActive: Boolean(stream?.getVideoTracks?.().length),
          handRaised: false
        }
      }))

      // Connect to any peers already known (late join after others)
      Object.keys(participantsRef.current).forEach((id) => {
        if (id !== socketId) connectToPeer(id)
      })

      requestAnimationFrame(() => {
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current
          localVideoRef.current.play?.().catch(() => {})
        }
      })
    } catch (err) {
      console.error('Error joining meeting:', err)
      toast.error('Initialization failed.')
    } finally {
      setIsJoining(false)
    }
  }

  const toggleMic = () => {
    const nextState = !micActive
    setMicActive(nextState)
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState
      })
    }
    socket.emit('meeting-state-change', {
      roomId,
      state: { micActive: nextState, camActive, handRaised }
    })
    setMeetingParticipants((prev) => ({
      ...prev,
      [socketId]: { ...(prev[socketId] || {}), micActive: nextState }
    }))
  }

  const toggleCam = () => {
    const nextState = !camActive
    setCamActive(nextState)
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState
      })
    }
    socket.emit('meeting-state-change', {
      roomId,
      state: { micActive, camActive: nextState, handRaised }
    })
    setMeetingParticipants((prev) => ({
      ...prev,
      [socketId]: { ...(prev[socketId] || {}), camActive: nextState }
    }))
  }

  const toggleHand = () => {
    const next = !handRaised
    setHandRaised(next)
    socket.emit('meeting-state-change', {
      roomId,
      state: { micActive, camActive, handRaised: next }
    })
    setMeetingParticipants((prev) => ({
      ...prev,
      [socketId]: { ...(prev[socketId] || {}), handRaised: next }
    }))
    if (next) toast(`${userName} raised their hand!`, { icon: '✋' })
  }

  const sendReaction = (emoji) => {
    emitSignal(undefined, { type: 'reaction', emoji, from: socketId, user: userName })
    spawnReaction(emoji, userName)
    setShowReactionPicker(false)
  }

  const spawnReaction = useCallback((emoji, who) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setReactions((prev) => [...prev, { id, emoji, user: who }])
    window.setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id))
    }, 2800)
  }, [])

  const toggleRecording = () => {
    if (!isRecording) {
      if (!localStreamRef.current) {
        toast.error('No video stream available to record.')
        return
      }
      setIsRecording(true)
      setRecordingSeconds(0)
      recordIntervalRef.current = setInterval(() => setRecordingSeconds((p) => p + 1), 1000)
      recordedChunksRef.current = []
      let mediaRecorder
      try {
        mediaRecorder = new MediaRecorder(localStreamRef.current, {
          mimeType: 'video/webm; codecs=vp9'
        })
      } catch {
        try {
          mediaRecorder = new MediaRecorder(localStreamRef.current, { mimeType: 'video/webm' })
        } catch {
          mediaRecorder = new MediaRecorder(localStreamRef.current)
        }
      }
      mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size > 0) recordedChunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `meeting-recording-${Date.now()}.webm`
        a.click()
        URL.revokeObjectURL(url)
      }
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000)
      toast.success('Meeting recording started!')
    } else {
      if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop()
      clearInterval(recordIntervalRef.current)
      setIsRecording(false)
      toast.success('Meeting recording downloaded!')
    }
  }

  const handleSendMeetingChat = () => {
    if (!meetingChatInput.trim()) return
    const msgObj = {
      user: userName,
      text: meetingChatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setMeetingChat((prev) => [...prev, msgObj])
    socket.emit('send-message', {
      roomId,
      message: meetingChatInput,
      user: userName,
      timestamp: msgObj.timestamp
    })
    setMeetingChatInput('')
  }

  const hostMuteParticipant = (targetSocketId) => {
    if (!isHost) return
    emitSignal(targetSocketId, { type: 'host-action', action: 'mute' })
    toast.success('Signaled user to mute mic.')
  }
  const hostLowerHand = (targetSocketId) => {
    if (!isHost) return
    emitSignal(targetSocketId, { type: 'host-action', action: 'lower-hand' })
    toast.success('Lowered user hand.')
  }
  const hostKickParticipant = (targetSocketId) => {
    if (!isHost) return
    emitSignal(targetSocketId, { type: 'host-action', action: 'kick' })
    toast.error('Kicked user.')
  }
  const hostAdmitParticipant = (targetSocketId, name) => {
    if (!isHost) return
    emitSignal(targetSocketId, { type: 'host-action', action: 'admit' })
    setWaitingUsers((prev) => prev.filter((u) => u.socketId !== targetSocketId))
    toast.success(`Admitted ${name}!`)
  }
  const hostDenyParticipant = (targetSocketId, name) => {
    if (!isHost) return
    emitSignal(targetSocketId, { type: 'host-action', action: 'kick' })
    setWaitingUsers((prev) => prev.filter((u) => u.socketId !== targetSocketId))
    toast.error(`Denied ${name}.`)
  }
  const toggleWaitingRoom = () => {
    const active = !waitingRoomActiveRef.current
    waitingRoomActiveRef.current = active
    setWaitingRoomActive(active)
    emitSignal(undefined, {
      type: 'waiting-room-status',
      active,
      hostSocketId: socketId,
      hostName: userName
    })
  }

  // Single socket listener lifecycle — deps only socket identity, refs for live state
  useEffect(() => {
    if (!socket?.on || !socketId) return undefined

    const onJoin = (p) => {
      if (!p?.socketId) return
      if (waitingRoomActiveRef.current && isHostRef.current && p.socketId !== socketId) {
        setWaitingUsers((prev) => {
          if (prev.some((u) => u.socketId === p.socketId)) return prev
          return [...prev, { socketId: p.socketId, user: p.user }]
        })
        toast(`${p.user} is waiting in the lobby.`, { icon: '⏳' })
        return
      }

      setMeetingParticipants((prev) => {
        if (!prev[p.socketId] && p.socketId !== socketId) {
          toast(`${p.user || 'Someone'} joined the call.`, { icon: '📹' })
        }
        return { ...prev, [p.socketId]: { ...prev[p.socketId], ...p } }
      })

      if (inMeetingRef.current && admittedRef.current && p.socketId !== socketId) {
        pushDiag(`peer join → connect ${p.socketId}`)
        connectToPeer(p.socketId)
      }
    }

    const onLeave = (socketId) => {
      if (!socketId) return
      pushDiag(`peer leave ${socketId}`)
      setMeetingParticipants((prev) => {
        const next = { ...prev }
        delete next[socketId]
        return next
      })
      setWaitingUsers((prev) => prev.filter((u) => u.socketId !== socketId))
      peerManagerRef.current?.removePeer(socketId)
      setPinnedId((cur) => (cur === socketId ? null : cur))
    }

    const onStateChange = ({ socketId, state }) => {
      if (!socketId) return
      setMeetingParticipants((prev) => ({
        ...prev,
        [socketId]: { ...(prev[socketId] || {}), ...state }
      }))
    }

    const onSignal = async (raw) => {
      const senderSocketId = raw?.senderSocketId
      const signal = raw?.signal
      const targetSocketId = raw?.targetSocketId
      if (!signal) return
      // Targeted signals: only process if for us (or untargeted broadcast)
      if (targetSocketId && targetSocketId !== socketId) return
      if (!senderSocketId || senderSocketId === socketId) return

      // Media negotiation
      if (signal.type === 'offer' || signal.type === 'answer' || signal.type === 'candidate') {
        if (!inMeetingRef.current || !admittedRef.current) return
        const mgr = ensurePeerManager()
        await mgr?.handleSignal(senderSocketId, signal)
        return
      }

      if (signal.type === 'waiting-room-request' && isHostRef.current) {
        setWaitingUsers((prev) => {
          if (prev.some((u) => u.socketId === senderSocketId)) return prev
          return [...prev, { socketId: senderSocketId, user: signal.user }]
        })
        toast(`${signal.user} is waiting to join the call.`, { icon: '⏳' })
        return
      }

      if (signal.type === 'waiting-room-status-request' && isHostRef.current) {
        emitSignal(senderSocketId, {
          type: 'waiting-room-status',
          active: waitingRoomActiveRef.current,
          hostSocketId: socketId,
          hostName: userName
        })
        return
      }

      if (signal.type === 'waiting-room-status') {
        const status = {
          active: Boolean(signal.active),
          hostSocketId: signal.hostSocketId,
          hostName: signal.hostName
        }
        setWaitingRoomActive(status.active)
        if (status.hostSocketId) {
          setHostInfo({ hostSocketId: status.hostSocketId, hostName: status.hostName || '' })
        }
        waitingRoomResolverRef.current?.(status)
        return
      }

      if (signal.type === 'screen-share-started') {
        toast(`${signal.from || 'A participant'} is sharing their screen`, { icon: '🖥️' })
        return
      }

      if (signal.type === 'control-request' && screenSharingRef.current) {
        const who = signal.user || 'A participant'
        const allowed = window.confirm(`${who} requests control of your shared screen. Allow?`)
        respondScreenControl(senderSocketId || signal.from, allowed)
        return
      }

      if (signal.type === 'control-response') {
        if (signal.allowed) toast.success('Remote control granted')
        else toast.error('Remote control request was denied')
        return
      }

      if (signal.type === 'reaction' && signal.emoji) {
        spawnReaction(signal.emoji, signal.user || 'Someone')
        return
      }

      if (signal.type === 'sync-request' && inMeetingRef.current && admittedRef.current) {
        const { micActive: m, camActive: c, handRaised: h } = micCamHandRef.current
        socket.emit('meeting-join', {
          roomId,
          participant: {
            socketId,
            user: userName,
            micActive: m,
            camActive: c,
            handRaised: h
          }
        })
        if (senderSocketId) connectToPeer(senderSocketId)
        return
      }

      if (signal.type === 'host-action') {
        const { micActive: m, camActive: c, handRaised: h } = micCamHandRef.current
        if (signal.action === 'mute') {
          setMicActive(false)
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
              track.enabled = false
            })
          }
          socket.emit('meeting-state-change', {
            roomId,
            state: { micActive: false, camActive: c, handRaised: h }
          })
          toast.error('The host muted your microphone.')
        } else if (signal.action === 'lower-hand') {
          setHandRaised(false)
          socket.emit('meeting-state-change', {
            roomId,
            state: { micActive: m, camActive: c, handRaised: false }
          })
          toast('The host lowered your hand.')
        } else if (signal.action === 'kick') {
          handleLeaveRef.current()
          toast.error('You were disconnected by the host.')
        } else if (signal.action === 'admit') {
          setAdmitted(true)
          toast.success('Admitted into the call!')
          let stream = localStreamRef.current
          if (!stream) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
              localStreamRef.current = stream
            } catch {
              stream = startMockVideoStream()
              localStreamRef.current = stream
            }
          }
          const mgr = ensurePeerManager()
          mgr?.setLocalStream(stream)
          socket.emit('meeting-join', {
            roomId,
            participant: {
              socketId,
              user: userName,
              micActive: true,
              camActive: true,
              handRaised: false
            }
          })
          setMeetingParticipants((prev) => ({
            ...prev,
            [socketId]: {
              user: userName,
              micActive: true,
              camActive: true,
              handRaised: false
            }
          }))
          emitSignal(undefined, { type: 'sync-request', from: socketId })
        }
      }
    }

    const onHostUpdate = ({ hostSocketId, hostName }) => {
      setHostInfo({ hostSocketId, hostName })
    }

    const onMessage = (msg) => {
      if (msg.senderSocketId === socketId) return
      setMeetingChat((prev) => [
        ...prev,
        {
          user: msg.user,
          text: msg.message || msg.text,
          timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    }

    socket.on('receive-meeting-join', onJoin)
    socket.on('receive-meeting-leave', onLeave)
    socket.on('receive-meeting-state-change', onStateChange)
    socket.on('receive-meeting-signal', onSignal)
    socket.on('receive-meeting-host', onHostUpdate)
    socket.on('receive-message', onMessage)

    return () => {
      socket.off?.('receive-meeting-join', onJoin)
      socket.off?.('receive-meeting-leave', onLeave)
      socket.off?.('receive-meeting-state-change', onStateChange)
      socket.off?.('receive-meeting-signal', onSignal)
      socket.off?.('receive-meeting-host', onHostUpdate)
      socket.off?.('receive-message', onMessage)
    }
  }, [
    socket,
    roomId,
    userName,
    connectToPeer,
    ensurePeerManager,
    emitSignal,
    pushDiag,
    startMockVideoStream,
    socketId,
    respondScreenControl,
    spawnReaction
  ])

  useEffect(() => {
    if (!inMeeting || !showDiag) return undefined
    refreshDiagnostics()
    const timer = window.setInterval(refreshDiagnostics, 1000)
    return () => window.clearInterval(timer)
  }, [inMeeting, showDiag, refreshDiagnostics])

  // Host election
  useEffect(() => {
    if (!inMeeting || !socketId) return
    const activeSocketIds = Object.keys(meetingParticipants).sort()
    if (activeSocketIds.length > 0 && (!hostInfo.hostSocketId || !meetingParticipants[hostInfo.hostSocketId])) {
      if (activeSocketIds[0] === socketId) {
        socket.emit('meeting-claim-host', { hostSocketId: socketId, hostName: userName })
      }
    }
  }, [meetingParticipants, hostInfo.hostSocketId, inMeeting, socket, socketId, userName])

  // Local video attach
  useEffect(() => {
    if (!inMeeting || !admitted) return
    const video = localVideoRef.current
    const stream = localStreamRef.current
    if (!video || !stream) return
    if (video.srcObject !== stream) video.srcObject = stream
    video.muted = true
    video.playsInline = true
    video.play?.().catch(() => {})
  }, [inMeeting, admitted, meetingParticipants, camActive])

  // Cleanup unmount
  useEffect(() => {
    const analysers = audioAnalysersRef.current
    return () => {
      destroyPeerManager()
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current)
      Object.keys(analysers).forEach((id) => {
        try {
          analysers[id].ctx?.close?.()
        } catch {
          // ignore
        }
      })
    }
  }, [destroyPeerManager])

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const speakerId = useMemo(() => {
    if (pinnedId && meetingParticipants[pinnedId]) return pinnedId
    const speaking = Object.entries(speakingMap).find(([, v]) => v)
    if (speaking?.[0] && meetingParticipants[speaking[0]]) return speaking[0]
    return Object.keys(meetingParticipants)[0] || socketId
  }, [pinnedId, speakingMap, meetingParticipants, socketId])

  const iceInfo = useMemo(() => describeIceSetup(), [])

  const renderParticipantTile = (participantId, part, { large = false } = {}) => {
    const isMe = participantId === socketId
    const heightClass = large ? 'h-full min-h-[280px]' : 'h-48 md:h-56'
    return (
      <div
        key={participantId}
        className={`bg-card rounded-2xl border border-border overflow-hidden relative ${heightClass} group flex items-center justify-center shadow-card transition-transform`}
      >
        {isMe ? (
          <>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                filter: blurActive ? 'blur(10px)' : 'none',
                display: camActive ? 'block' : 'none'
              }}
              className="w-full h-full object-cover transition-all scale-x-[-1]"
            />
            {!camActive && (
              <div className="w-full h-full bg-gradient-to-tr from-primary/10 to-card-sunken flex items-center justify-center absolute inset-0">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-lg font-bold text-primary shadow-md">
                  {(userName || 'U').substring(0, 2).toUpperCase()}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <RemoteVideo
              stream={remoteStreams[participantId]?.stream}
              hidden={!remoteStreams[participantId]?.stream || part.camActive === false}
            />
            {(!remoteStreams[participantId]?.stream || part.camActive === false) && (
              <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-tr from-primary/10 to-card-sunken">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-lg font-bold text-primary shadow-md">
                  {(part.user || 'U').substring(0, 2).toUpperCase()}
                </div>
                {!remoteStreams[participantId]?.stream && (
                  <span className="absolute bottom-12 text-[10px] font-semibold text-muted">
                    {peerStates[participantId] === 'connecting' ? 'Connecting…' : 'Waiting for media…'}
                  </span>
                )}
              </div>
            )}
          </>
        )}

        <div
          className={`absolute inset-0 pointer-events-none z-[5] rounded-[inherit] ring-2 transition ${
            speakingMap[participantId] ? 'ring-success/80' : 'ring-transparent'
          }`}
        />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
          <span className="text-[10px] font-bold bg-card/85 px-2.5 py-1.5 rounded-full border border-border text-text pointer-events-none">
            {part.user} {isMe && '(You)'}
            {speakingMap[participantId] ? ' · Speaking' : ''}
            {pinnedId === participantId ? ' · Pinned' : ''}
          </span>
          <div className="flex gap-1.5 items-center">
            {!isMe && (
              <button
                type="button"
                onClick={() => setPinnedId((cur) => (cur === participantId ? null : participantId))}
                className={`p-1.5 rounded-full border pointer-events-auto cursor-pointer ${
                  pinnedId === participantId
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-card/85 border-border text-muted hover:text-primary'
                }`}
                title={pinnedId === participantId ? 'Unpin' : 'Pin / spotlight'}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )}
            {!isMe && remoteStreams[participantId]?.stream && (
              <button
                type="button"
                onClick={() => requestScreenControl(participantId)}
                className="p-1.5 rounded-full border bg-card/85 border-border text-muted hover:text-primary pointer-events-auto cursor-pointer"
                title="Request remote control of shared screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
            {!part.micActive && (
              <div className="p-1.5 bg-danger/90 text-on-primary rounded-full border border-danger">
                <MicOff className="w-3.5 h-3.5" />
              </div>
            )}
            {part.handRaised && (
              <div className="p-1.5 bg-warning/90 text-on-primary rounded-full border border-warning animate-bounce">
                <Hand className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card-sunken text-text select-none lg:flex-row">
      {/* Floating reactions */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-40 flex justify-center gap-2">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="animate-bounce rounded-full bg-card/90 border border-border px-3 py-1.5 text-lg shadow-lg"
            title={r.user}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-between p-6 overflow-hidden relative">
        {inMeeting && (
          <div className="absolute top-4 left-6 right-6 flex justify-between items-center z-25 pointer-events-none">
            {isRecording && (
              <div className="flex items-center gap-1.5 bg-danger/90 text-on-primary text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-auto border border-danger animate-pulse">
                <Disc className="w-3.5 h-3.5 fill-current" />
                <span>REC {formatTimer(recordingSeconds)}</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2 pointer-events-auto">
              {waitingRoomActive && (
                <div className="flex items-center gap-1.5 bg-primary/90 text-on-primary text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-primary">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Waiting Room</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-card/90 text-muted text-[10px] font-bold px-3 py-1.5 rounded-full shadow border border-border">
                <Users className="w-3.5 h-3.5" />
                <span>{Object.keys(meetingParticipants).length || 0}</span>
                {!iceInfo.hasTurn && <span className="text-warning">· No TURN</span>}
              </div>
            </div>
          </div>
        )}

        {inMeeting && !admitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
            <div className="w-16 h-16 bg-warning/10 rounded-2xl flex items-center justify-center text-warning mb-6 border border-warning/20 animate-pulse">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-text mb-2">Teamora Call Lobby</h2>
            <p className="text-sm text-muted mb-8 font-medium">
              Please wait. The host has enabled the waiting room for this call.
            </p>
            <button
              type="button"
              onClick={handleLeaveMeeting}
              className="px-5 py-3 bg-card hover:bg-primary/10 text-text font-bold rounded-2xl cursor-pointer border border-border"
            >
              Leave Lobby
            </button>
          </div>
        ) : !inMeeting ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 border border-primary/20">
              <Video className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-text mb-2">Teamora Call Lobby</h2>
            <p className="text-sm text-muted mb-4 font-medium">
              Verify camera and microphone before joining. Mesh A/V works across tabs and devices via hybrid signaling
              {iceInfo.hasTurn ? ' with TURN' : ''}.
            </p>
            <button
              type="button"
              onClick={handleJoinMeeting}
              disabled={isJoining}
              className="w-full py-4 bg-primary hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70 text-on-primary font-semibold rounded-2xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Video className="w-5 h-5" />
              <span>{isJoining ? 'Joining…' : 'Join Meeting'}</span>
            </button>
          </div>
        ) : layoutMode === 'speaker' ? (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
            <div className="flex-1 min-h-0">
              {speakerId && meetingParticipants[speakerId]
                ? renderParticipantTile(speakerId, meetingParticipants[speakerId], { large: true })
                : null}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
              {Object.entries(meetingParticipants)
                .filter(([id]) => id !== speakerId)
                .map(([id, part]) => (
                  <div key={id} className="w-36 shrink-0">
                    {renderParticipantTile(id, part)}
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[75vh] p-2 no-scrollbar">
            {Object.entries(meetingParticipants).map(([socketId, part]) => renderParticipantTile(socketId, part))}
          </div>
        )}

        {inMeeting && admitted && (
          <div className="h-16 bg-card/90 border border-border px-4 py-2.5 rounded-full flex items-center justify-between shrink-0 max-w-3xl mx-auto w-full shadow-card mt-4 select-none gap-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMic}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${micActive ? 'bg-card border-border text-text hover:bg-primary/10' : 'bg-danger text-on-primary border-danger'}`}
                title={micActive ? 'Mute' : 'Unmute'}
              >
                {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleCam}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${camActive ? 'bg-card border-border text-text hover:bg-primary/10' : 'bg-danger text-on-primary border-danger'}`}
                title={camActive ? 'Camera off' : 'Camera on'}
              >
                {camActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleScreenShare}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${screenSharingActive ? 'bg-success text-on-primary border-success' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                title={screenSharingActive ? 'Stop sharing' : 'Share screen'}
              >
                <Tv className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleHand}
                className={`p-2.5 rounded-xl cursor-pointer border ${handRaised ? 'bg-warning text-on-primary border-warning' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                title="Raise hand"
              >
                <Hand className="w-4 h-4" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowReactionPicker((v) => !v)}
                  className={`p-2.5 rounded-xl cursor-pointer border ${showReactionPicker ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                  title="Reactions"
                >
                  <Smile className="w-4 h-4" />
                </button>
                {showReactionPicker && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-1 bg-card border border-border rounded-xl p-2 shadow-lg z-50">
                    {REACTIONS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => sendReaction(e)}
                        className="text-lg hover:scale-125 transition-transform cursor-pointer px-1"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setBlurActive(!blurActive)}
                className={`p-2.5 rounded-xl cursor-pointer border ${blurActive ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                title="Background blur"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !noiseSuppression
                  setNoiseSuppression(next)
                  toast(
                    next ? 'Noise suppression preference on (browser-dependent).' : 'Noise suppression preference off.',
                    { icon: '🎙️' }
                  )
                }}
                className={`p-2.5 rounded-xl cursor-pointer border ${noiseSuppression ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                title="Noise suppression"
                aria-pressed={noiseSuppression}
              >
                <VolumeX className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={toggleRecording}
                className={`p-2.5 rounded-xl cursor-pointer border ${isRecording ? 'bg-danger text-on-primary border-danger animate-pulse' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                title="Record"
              >
                <Disc className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode((m) => (m === 'grid' ? 'speaker' : 'grid'))}
                className={`p-2.5 rounded-xl cursor-pointer border ${layoutMode === 'speaker' ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                title={layoutMode === 'grid' ? 'Speaker view' : 'Grid view'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              {isHost && (
                <button
                  type="button"
                  onClick={toggleWaitingRoom}
                  className={`p-2.5 rounded-xl cursor-pointer border ${waitingRoomActive ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                  title="Waiting room"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowDiag((v) => !v)}
                className={`p-2.5 rounded-xl cursor-pointer border ${showDiag ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                title="WebRTC diagnostics"
              >
                <Activity className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSidePanel(activeSidePanel === 'chat' ? null : 'chat')}
                className={`p-2.5 rounded-xl cursor-pointer border ${activeSidePanel === 'chat' ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                title="Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSidePanel(activeSidePanel === 'participants' ? null : 'participants')}
                className={`p-2.5 rounded-xl cursor-pointer border ${activeSidePanel === 'participants' ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                title="Participants"
              >
                <Users className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleLeaveMeeting}
                className="px-4 py-2.5 bg-danger hover:bg-danger-hover text-on-primary rounded-xl text-xs font-semibold cursor-pointer border border-danger shadow-sm"
              >
                Leave
              </button>
            </div>
          </div>
        )}

        {/* Diagnostics overlay */}
        {showDiag && inMeeting && (
          <div className="absolute bottom-24 left-6 right-6 max-h-48 overflow-auto rounded-xl border border-border bg-card/95 p-3 text-[10px] font-mono text-muted shadow-lg z-30">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-text uppercase tracking-wider">WebRTC diagnostics</span>
              <button type="button" onClick={() => setShowDiag(false)} className="cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mb-2 text-text">
              self={socketId} · peers={diagnostics?.peerCount ?? 0} · TURN=
              {iceInfo.hasTurn ? 'yes' : 'no'} · WS=
              {socket?.readyState === 1 ? 'open' : String(socket?.readyState ?? 'n/a')}
            </div>
            {(diagnostics?.peers || []).map((p) => (
              <div key={p.id}>
                {p.id.slice(0, 12)}… conn={p.connection} ice={p.ice} sig={p.signaling} media=
                {p.hasRemote ? 'yes' : 'no'}
              </div>
            ))}
            <div className="mt-2 border-t border-border pt-2 space-y-0.5 max-h-24 overflow-y-auto">
              {diagLines.slice(-20).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {inMeeting && activeSidePanel && (
        <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <span className="font-bold text-xs uppercase tracking-wider text-muted">
              {activeSidePanel === 'chat' ? 'Meeting Chat' : 'Participants & Host'}
            </span>
            <button
              type="button"
              onClick={() => setActiveSidePanel(null)}
              className="text-muted hover:text-primary cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeSidePanel === 'chat' ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
                {meetingChat.length === 0 ? (
                  <p className="text-xs text-muted italic text-center py-6">
                    Messages sync to everyone in this meeting.
                  </p>
                ) : (
                  meetingChat.map((m, idx) => (
                    <div key={idx} className="flex gap-2 items-start text-xs">
                      <div className="w-6 h-6 rounded-full bg-card-sunken border border-border flex items-center justify-center font-bold text-[9px] text-text shrink-0">
                        {(m.user || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 bg-card-sunken border border-border rounded-xl p-2.5">
                        <div className="flex items-center justify-between text-[8px] text-muted font-bold mb-1">
                          <span>{m.user}</span>
                          <span>{m.timestamp}</span>
                        </div>
                        <p className="text-text">{m.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <input
                  type="text"
                  placeholder="Type message..."
                  value={meetingChatInput}
                  onChange={(e) => setMeetingChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMeetingChat()}
                  className="flex-1 bg-card-sunken border border-border rounded-xl px-3 py-2 text-xs text-text placeholder-muted/65 focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  disabled={!meetingChatInput.trim()}
                  onClick={handleSendMeetingChat}
                  className="px-3 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar text-xs">
              {isHost && waitingUsers.length > 0 && (
                <div className="space-y-2 border-b border-border pb-4 mb-4">
                  <span className="font-bold text-[10px] uppercase text-warning tracking-wider block">
                    Waiting List ({waitingUsers.length})
                  </span>
                  {waitingUsers.map((user) => (
                    <div
                      key={user.socketId}
                      className="flex items-center justify-between bg-card-sunken border border-warning/20 rounded-xl p-2.5"
                    >
                      <span className="font-semibold text-text truncate flex-1">{user.user}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => hostAdmitParticipant(user.socketId, user.user)}
                          className="px-2.5 py-1 bg-success hover:bg-success-hover text-on-primary rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Admit
                        </button>
                        <button
                          type="button"
                          onClick={() => hostDenyParticipant(user.socketId, user.user)}
                          className="px-2.5 py-1 bg-card border border-border text-muted hover:bg-danger/10 hover:text-danger rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {Object.entries(meetingParticipants).map(([socketId, part]) => {
                const isUserHost = socketId === hostInfo.hostSocketId
                return (
                  <div
                    key={socketId}
                    className="flex items-center justify-between border-b border-border/50 pb-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-[9px] text-primary shrink-0">
                        {(part.user || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-text truncate">{part.user}</span>
                        <span className="text-[8px] text-muted">
                          {isUserHost ? 'Host' : 'Participant'}
                          {peerStates[socketId] ? ` · ${peerStates[socketId]}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {part.handRaised && isHost && (
                        <button
                          type="button"
                          onClick={() => hostLowerHand(socketId)}
                          className="p-1 hover:bg-primary/10 rounded text-warning cursor-pointer"
                          title="Lower hand"
                        >
                          <Hand className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                      {isHost && socketId !== socket.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => hostMuteParticipant(socketId)}
                            className="p-1 hover:bg-primary/10 rounded text-muted hover:text-danger cursor-pointer"
                            title="Mute"
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => hostKickParticipant(socketId)}
                            className="p-1 hover:bg-primary/10 rounded text-muted hover:text-danger cursor-pointer"
                            title="Kick"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
