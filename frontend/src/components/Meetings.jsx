import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Tv,
  Users,
  MessageSquare,
  Hand,
  Ban,
  Disc,
  X,
  LayoutGrid,
  Maximize2,
  Pin,
  Wifi,
  WifiOff,
  Settings,
  PhoneOff,
  VolumeX
} from 'lucide-react'
import toast from 'react-hot-toast'
import { describeIceSetup } from '../services/webrtcIce'
import { MeetingPeerManager } from '../services/meetingPeerManager'
import { dismissMeetingNotifications } from './utils/notifications'
import { useMeeting } from '../contexts/MeetingContext'

function rtcLog(...args) {
  if (import.meta.env.DEV) console.info('[meeting-rtc]', ...args)
}

function pickRecorderMime() {
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4'
  ]
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return ''
  }
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function RemoteAudio({ stream, audioOutputDeviceId }) {
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    rtcLog(
      `[RTC-AUDIO-AUDIT] [RemoteAudio SinkId] deviceId=${audioOutputDeviceId} hasSetSinkId=${typeof audio.setSinkId === 'function'}`
    )
    if (audioOutputDeviceId && typeof audio.setSinkId === 'function') {
      audio
        .setSinkId(audioOutputDeviceId)
        .then(() => rtcLog(`[RTC-AUDIO-AUDIT] [RemoteAudio SinkId Success] deviceId=${audioOutputDeviceId}`))
        .catch((e) => console.error(`[RTC-AUDIO-AUDIT] [RemoteAudio SinkId Failure]`, e))
    }
  }, [audioOutputDeviceId])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !stream) return

    const audioTracks = stream.getAudioTracks()
    rtcLog(`[RTC-AUDIO-AUDIT] [RemoteAudio Attach] streamId=${stream.id} tracks=${audioTracks.length}`)
    audioTracks.forEach((t, i) => {
      rtcLog(
        `[RTC-AUDIO-AUDIT]   - Remote Audio Track #${i}: id=${t.id} enabled=${t.enabled} readyState=${t.readyState} muted=${t.muted}`
      )
    })

    if (audio.srcObject !== stream) {
      audio.srcObject = stream
    }

    audio
      .play?.()
      .then(() => {
        rtcLog(`[RTC-AUDIO-AUDIT] [RemoteAudio Play Success] streamId=${stream.id}`)
      })
      .catch((err) => {
        console.error(`[RTC-AUDIO-AUDIT] [RemoteAudio Play Failed] streamId=${stream.id}:`, err)
      })

    return () => {
      rtcLog(`[RTC-AUDIO-AUDIT] [RemoteAudio Cleanup] detaching streamId=${stream.id}`)
      if (audio) audio.srcObject = null
    }
  }, [stream])

  return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
}

function RemoteVideo({ stream, hidden }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return

    if (video.srcObject !== stream) {
      video.srcObject = stream
    }

    video.play?.().catch(() => {})

    return () => {
      if (video) video.srcObject = null
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`h-full w-full bg-black object-contain object-center ${hidden ? 'opacity-0 absolute pointer-events-none' : ''}`}
    />
  )
}

function MiniVideo({ stream, isMe }) {
  const videoRef = useRef(null)
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play?.().catch(() => {})
    }
  }, [stream])
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMe}
      className={`h-full w-full bg-black object-contain object-center ${isMe ? 'scale-x-[-1]' : ''}`}
    />
  )
}

function initialsFor(name) {
  return String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function hasLiveVideoTrack(stream) {
  return Boolean(stream?.getVideoTracks?.().some((track) => track.readyState === 'live' && track.enabled !== false))
}

function ParticipantTile({
  participantId,
  part,
  isMe,
  localVideoRef,
  localStream,
  remoteStream,
  selectedSpeaker,
  speaking,
  networkQualityValue,
  pinnedId,
  setPinnedId,
  toggleFullscreen,
  camActive,
  peerState,
  userName
}) {
  const showLocalVideo = isMe && camActive && hasLiveVideoTrack(localStream)
  const showRemoteVideo = !isMe && part.camActive !== false && hasLiveVideoTrack(remoteStream)
  const label = isMe ? userName : part.user

  return (
    <div
      id={`participant-tile-${participantId}`}
      className="bg-card rounded-2xl border border-border overflow-hidden relative w-full h-full min-h-0 group flex items-center justify-center shadow-card transition-all duration-300"
    >
      {isMe ? (
        <>
          <video
            ref={(el) => {
              if (localVideoRef) localVideoRef.current = el
              if (el && localStream) {
                if (el.srcObject !== localStream) el.srcObject = localStream
                el.muted = true
                el.play?.().catch(() => {})
              }
            }}
            autoPlay
            playsInline
            muted
            style={{
              filter: 'none',
              display: showLocalVideo ? 'block' : 'none'
            }}
            className="h-full w-full bg-black object-contain object-center transition-all scale-x-[-1]"
          />
          {!showLocalVideo && (
            <div className="w-full h-full bg-gradient-to-tr from-primary/10 to-card-sunken flex items-center justify-center absolute inset-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-xl font-bold text-primary shadow-md">
                {initialsFor(label)}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <RemoteVideo stream={remoteStream} hidden={!showRemoteVideo} />
          {remoteStream && <RemoteAudio stream={remoteStream} audioOutputDeviceId={selectedSpeaker} />}
          {!showRemoteVideo && (
            <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-tr from-primary/10 to-card-sunken">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-xl font-bold text-primary shadow-md">
                {initialsFor(label)}
              </div>
              {!remoteStream && (
                <span className="absolute bottom-14 text-[10px] font-semibold text-muted">
                  {peerState === 'connecting' ? 'Connecting…' : 'Waiting for media…'}
                </span>
              )}
            </div>
          )}
        </>
      )}

      <div
        className={`absolute inset-0 pointer-events-none z-[5] rounded-[inherit] ring-[3px] transition-all duration-300 ${
          speaking ? 'ring-primary shadow-[0_0_20px_rgba(var(--color-primary),0.6)] scale-[0.98]' : 'ring-transparent'
        }`}
      />
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold bg-card/85 px-2.5 py-1.5 rounded-full border border-border text-text pointer-events-none flex items-center gap-1.5 shadow-sm">
            {part.user} {isMe && '(You)'}
            {pinnedId === participantId && <span className="text-primary">• Pinned</span>}
          </span>
          {!isMe && networkQualityValue && (
            <div
              className={`p-1 rounded-full bg-card/85 border border-border backdrop-blur-sm ${
                networkQualityValue === 'good'
                  ? 'text-success'
                  : networkQualityValue === 'fair'
                    ? 'text-warning'
                    : 'text-danger'
              }`}
              title={`Network: ${networkQualityValue}`}
            >
              {networkQualityValue === 'poor' ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            </div>
          )}
        </div>
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
          {!isMe && remoteStream && (
            <button
              type="button"
              onClick={() => toggleFullscreen(participantId)}
              className="p-1.5 rounded-full border bg-card/85 border-border text-muted hover:text-primary pointer-events-auto cursor-pointer"
              title="Fullscreen"
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

function ActiveSpeakerVideo({
  participant,
  isMe,
  localVideoRef,
  localStream,
  remoteStream,
  selectedSpeaker,
  speaking,
  networkQualityValue,
  pinnedId,
  setPinnedId,
  toggleFullscreen,
  camActive,
  peerState,
  userName
}) {
  if (!participant) {
    return (
      <div className="w-full h-full bg-gradient-to-tr from-primary/10 to-card-sunken flex items-center justify-center rounded-2xl border border-border">
        <span className="text-muted text-sm">No active speaker</span>
      </div>
    )
  }
  return (
    <ParticipantTile
      participantId={participant.id}
      part={participant}
      isMe={isMe}
      localVideoRef={localVideoRef}
      localStream={localStream}
      remoteStream={remoteStream}
      selectedSpeaker={selectedSpeaker}
      speaking={speaking}
      networkQualityValue={networkQualityValue}
      pinnedId={pinnedId}
      setPinnedId={setPinnedId}
      toggleFullscreen={toggleFullscreen}
      camActive={camActive}
      peerState={peerState}
      userName={userName}
    />
  )
}

function ParticipantThumbnailList({
  participants,
  socketId,
  localVideoRef,
  localStream,
  remoteStreams,
  selectedSpeaker,
  speakingMap,
  networkQuality,
  pinnedId,
  setPinnedId,
  toggleFullscreen,
  camActive,
  peerStates,
  userName
}) {
  return (
    <div className="flex flex-row overflow-x-auto overflow-y-hidden pb-2 shrink-0 w-full h-36 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:w-64 md:h-full md:pb-0 md:pr-2 gap-3 no-scrollbar">
      {participants.map((part) => (
        <div key={part.id} className="w-48 h-28 md:w-full md:h-36 shrink-0 relative">
          <ParticipantTile
            participantId={part.id}
            part={part}
            isMe={part.id === socketId}
            localVideoRef={localVideoRef}
            localStream={localStream}
            remoteStream={remoteStreams[part.id]?.stream}
            selectedSpeaker={selectedSpeaker}
            speaking={speakingMap[part.id]}
            networkQualityValue={networkQuality[part.id]}
            pinnedId={pinnedId}
            setPinnedId={setPinnedId}
            toggleFullscreen={toggleFullscreen}
            camActive={camActive}
            peerState={peerStates[part.id]}
            userName={userName}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Production Teamora meeting room: mesh WebRTC via MeetingPeerManager,
 * hybrid signaling, host controls, chat, views, diagnostics.
 */
export default function Meetings({ socket, roomId, userName, isMaximized = true }) {
  const navigate = useNavigate()
  const {
    isMinimized,
    toggleMinimize,
    inMeeting: contextInMeeting,
    activeMeetingWorkspace,
    meetingEpoch,
    leaveMeeting: globalLeaveMeeting,
    joinMeeting: globalJoinMeeting
  } = useMeeting()
  const [activeSpeakerId, setActiveSpeakerId] = useState(null)
  // Ref mirror avoids re-subscribing the speaking-interval effect on every speaker change.
  const activeSpeakerIdRef = useRef(null)
  const lastSpeakerUpdateRef = useRef(0)
  const [inMeeting, setInMeeting] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [position, setPosition] = useState(() => {
    const x = Math.max(16, window.innerWidth - 340)
    const y = Math.max(16, window.innerHeight - 280)
    return { x, y }
  })
  const dragRef = useRef(null)
  const [micActive, setMicActive] = useState(true)
  const [camActive, setCamActive] = useState(true)
  /** Browser audio processing preference (re-applies on track re-acquire). */
  const [noiseSuppression, setNoiseSuppression] = useState(true)
  const [handRaised, setHandRaised] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
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
  const [peerStates, setPeerStates] = useState({})
  const [networkQuality, setNetworkQuality] = useState({}) // peerId -> 'good' | 'fair' | 'poor'
  const [devices, setDevices] = useState([])
  const [selectedMic, setSelectedMic] = useState('')
  const [selectedCam, setSelectedCam] = useState('')
  const [selectedSpeaker, setSelectedSpeaker] = useState('')
  const [showDeviceSettings, setShowDeviceSettings] = useState(false)

  const screenStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  /** Mirror of localStreamRef for render (react-hooks/refs forbids reading refs in JSX). */
  const [localStream, setLocalStream] = useState(null)
  const [lobbyPreview, setLobbyPreview] = useState(null)
  const lobbyVideoRef = useRef(null)
  const canvasStreamRef = useRef(null)
  const animationFrameRef = useRef(null)
  const recordIntervalRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const audioAnalysersRef = useRef({})
  const speakingScoresRef = useRef({})
  const peerManagerRef = useRef(null)
  const inMeetingRef = useRef(false)
  const admittedRef = useRef(false)
  const participantsRef = useRef({})
  const hostInfoRef = useRef(hostInfo)
  const isHostRef = useRef(false)
  const micCamHandRef = useRef({ micActive: true, camActive: true, handRaised: false })
  const screenSharingRef = useRef(false)
  const handleLeaveRef = useRef(() => {})

  const socketId = socket?.id
  const isHost = hostInfo.hostSocketId === socketId
  const meetingSignalRef = useRef({ socket: null, roomId: null, socketId: null })

  useEffect(() => {
    meetingSignalRef.current = { socket, roomId, socketId }
  }, [socket, roomId, socketId])

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
    isHostRef.current = isHost
  }, [isHost])
  useEffect(() => {
    micCamHandRef.current = { micActive, camActive, handRaised }
  }, [micActive, camActive, handRaised])
  useEffect(() => {
    screenSharingRef.current = screenSharingActive
  }, [screenSharingActive])

  // WebRTC Stats Polling for Network Quality
  useEffect(() => {
    if (!inMeeting) return
    const interval = setInterval(async () => {
      if (!peerManagerRef.current) return
      const pcs = peerManagerRef.current.pcs
      const newQual = {}
      for (const [peerId, pc] of pcs.entries()) {
        try {
          const stats = await pc.getStats()
          let isGood = true
          let isFair = false
          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              const rtt = report.currentRoundTripTime || 0 // in seconds
              if (rtt > 0.5) isGood = false
              else if (rtt > 0.15) isFair = true
            }
          })
          newQual[peerId] = !isGood ? 'poor' : isFair ? 'fair' : 'good'
        } catch {
          newQual[peerId] = 'good'
        }
      }
      setNetworkQuality(newQual)
    }, 3000)
    return () => clearInterval(interval)
  }, [inMeeting])

  const pushDiag = useCallback(() => {}, [])

  const loadDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      setDevices(list)

      const defaultMic = list.find((d) => d.kind === 'audioinput')?.deviceId || ''
      const defaultCam = list.find((d) => d.kind === 'videoinput')?.deviceId || ''
      const defaultSpeaker = list.find((d) => d.kind === 'audiooutput')?.deviceId || ''

      setSelectedMic((prev) => prev || defaultMic)
      setSelectedCam((prev) => prev || defaultCam)
      setSelectedSpeaker((prev) => prev || defaultSpeaker)
    } catch (err) {
      console.error('[RTC-AUDIO-AUDIT] Failed to list devices:', err)
    }
  }, [])
  const attachSpeakingMonitor = useCallback((socketId, stream) => {
    try {
      if (!stream || !stream.getAudioTracks?.().length) return
      if (audioAnalysersRef.current[socketId]) return

      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioContextClass()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      // Connect to a GainNode with 0 gain connected to destination
      // This keeps the Web Audio API graph active and prevents browsers from silencing or garbage-collecting the audio tracks!
      const gainNode = ctx.createGain()
      gainNode.gain.value = 0
      analyser.connect(gainNode)
      gainNode.connect(ctx.destination)

      const data = new Uint8Array(analyser.frequencyBinCount)
      audioAnalysersRef.current[socketId] = { ctx, analyser, data }
      rtcLog(`[RTC-AUDIO-AUDIT] Speaking monitor attached: socketId=${socketId}`)
    } catch (err) {
      console.warn('[RTC-AUDIO-AUDIT] Speaking monitor attachment failed:', err)
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

  const changeDevice = useCallback(
    async (kind, deviceId) => {
      rtcLog(`[RTC-AUDIO-AUDIT] Changing device kind=${kind} to deviceId=${deviceId}`)
      if (kind === 'audioinput') {
        if (localStreamRef.current) {
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                echoCancellation: true,
                noiseSuppression,
                autoGainControl: true
              }
            })
            const newTrack = newStream.getAudioTracks()[0]

            // Stop old tracks only after success
            const oldTracks = localStreamRef.current.getAudioTracks()
            oldTracks.forEach((t) => {
              t.stop()
              localStreamRef.current.removeTrack(t)
            })

            localStreamRef.current.addTrack(newTrack)
            newTrack.enabled = micActive

            setSelectedMic(deviceId)

            if (peerManagerRef.current) {
              peerManagerRef.current.setLocalStream(localStreamRef.current)
            }

            if (socketId) {
              clearSpeakingMonitor(socketId)
              attachSpeakingMonitor(socketId, localStreamRef.current)
            }

            toast.success('Microphone switched')
          } catch (err) {
            console.error('[RTC-AUDIO-AUDIT] Failed to switch microphone:', err)
            toast.error('Failed to switch microphone')
          }
        }
      } else if (kind === 'videoinput') {
        setSelectedCam(deviceId)
        if (localStreamRef.current) {
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: deviceId ? { exact: deviceId } : undefined
              }
            })
            const newTrack = newStream.getVideoTracks()[0]
            const oldTracks = localStreamRef.current.getVideoTracks()
            oldTracks.forEach((t) => {
              t.stop()
              localStreamRef.current.removeTrack(t)
            })
            localStreamRef.current.addTrack(newTrack)
            newTrack.enabled = camActive

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current
            }
            if (peerManagerRef.current) {
              peerManagerRef.current.setLocalStream(localStreamRef.current)
            }
            toast.success('Camera switched')
          } catch (err) {
            console.error('[RTC-AUDIO-AUDIT] Failed to switch camera:', err)
            toast.error('Failed to switch camera')
          }
        }
      } else if (kind === 'audiooutput') {
        setSelectedSpeaker(deviceId)
        toast.success('Speaker output device updated')
      }
    },
    [micActive, camActive, socketId, noiseSuppression, attachSpeakingMonitor, clearSpeakingMonitor]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDevices()
    navigator.mediaDevices.addEventListener?.('devicechange', loadDevices)
    return () => {
      navigator.mediaDevices.removeEventListener?.('devicechange', loadDevices)
    }
  }, [loadDevices])

  const emitSignal = useCallback(
    (targetSocketId, signal) => {
      if (!socket?.emit) return
      // Never emit an empty-string target (ambiguous broadcast). Undefined = broadcast.
      if (targetSocketId === '') {
        console.warn('[meetings] Skipping signal with empty targetSocketId')
        return
      }
      socket.emit('meeting-signal', {
        roomId,
        targetSocketId,
        signal
      })
    },
    [socket, roomId]
  )

  const attachRemoteStream = useCallback(
    (peerId, stream) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: { stream } }))
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

  const refreshDiagnostics = useCallback(() => {}, [])

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
      setSpeakingMap((prev) => {
        const next = { ...prev }
        let changed = false
        let currentLoudest = null
        let maxAvg = 0

        const allIds = new Set([...Object.keys(audioAnalysersRef.current), socketId])
        allIds.forEach((id) => {
          let isLoud = false
          let avg = 0
          if (id === socketId && localStreamRef.current && micActive) {
            try {
              if (!audioAnalysersRef.current[socketId]) {
                attachSpeakingMonitor(socketId, localStreamRef.current)
              }
              const pack = audioAnalysersRef.current[socketId]
              if (pack) {
                pack.analyser.getByteFrequencyData(pack.data)
                avg = pack.data.reduce((a, b) => a + b, 0) / (pack.data.length || 1)
                isLoud = avg > 25
              }
            } catch {
              /* ignore */
            }
          } else if (audioAnalysersRef.current[id]) {
            try {
              const pack = audioAnalysersRef.current[id]
              pack.analyser.getByteFrequencyData(pack.data)
              avg = pack.data.reduce((a, b) => a + b, 0) / (pack.data.length || 1)
              isLoud = avg > 25
            } catch {
              /* ignore */
            }
          }

          if (isLoud && avg > maxAvg) {
            maxAvg = avg
            currentLoudest = id
          }

          const score = speakingScoresRef.current[id] || 0
          const newScore = isLoud ? Math.min(score + 2, 6) : Math.max(score - 1, 0)
          speakingScoresRef.current[id] = newScore

          const wasSpeaking = prev[id] || false
          let nowSpeaking = wasSpeaking
          if (newScore >= 4) nowSpeaking = true
          if (newScore <= 0) nowSpeaking = false

          if (wasSpeaking !== nowSpeaking) {
            next[id] = nowSpeaking
            changed = true
          }
        })

        // Active Speaker debounce/smoothing logic
        const now = Date.now()
        if (currentLoudest) {
          if (currentLoudest !== activeSpeakerIdRef.current) {
            const candidateScore = speakingScoresRef.current[currentLoudest] || 0
            // Require consistent speaking (score >= 4) and debounce switches to at most once per 1.5 seconds
            if (candidateScore >= 4 && now - lastSpeakerUpdateRef.current > 1500) {
              activeSpeakerIdRef.current = currentLoudest
              setActiveSpeakerId(currentLoudest)
              lastSpeakerUpdateRef.current = now
            }
          } else {
            // Keep updating speaker timestamp while they speak
            lastSpeakerUpdateRef.current = now
          }
        }

        return changed ? next : prev
      })
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
    peerManagerRef.current?.setScreenStream(null)
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
        peerManagerRef.current?.setScreenStream(stream)
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

  const toggleFullscreen = (targetSocketId) => {
    const tile = document.getElementById(`participant-tile-${targetSocketId}`)
    if (!tile) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error)
    } else {
      tile.requestFullscreen().catch(console.error)
    }
  }

  const respondScreenControl = useCallback(
    (requesterId, allowed) => {
      emitSignal(requesterId, { type: 'control-response', allowed, from: socketId })
      toast(allowed ? 'You granted remote control' : 'You denied remote control')
    },
    [emitSignal, socketId]
  )

  const handleLeaveMeeting = useCallback(
    (opts = {}) => {
      rtcLog(`[RTC-AUDIO-AUDIT] [Leave Meeting] Starting cleanup. isRecording=${isRecording}`)
      inMeetingRef.current = false
      setInMeeting(false)
      setAdmitted(false)

      if (localStreamRef.current) {
        rtcLog(`[RTC-AUDIO-AUDIT] [Leave Meeting] Stopping localStream tracks`)
        localStreamRef.current.getTracks().forEach((track) => {
          rtcLog(`[RTC-AUDIO-AUDIT]   - Stopping track id=${track.id} kind=${track.kind}`)
          track.stop()
        })
        localStreamRef.current = null
        setLocalStream(null)
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

      rtcLog(`[RTC-AUDIO-AUDIT] [Leave Meeting] Destroying peer manager and remote streams`)
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

      socket?.emit?.('meeting-leave', { roomId, socketId, type: 'meeting-leave' })
      const remaining = Object.keys(participantsRef.current).filter((id) => id !== socketId)
      if (remaining.length === 0) {
        socket?.emit?.('meeting-ended', { workspaceId: roomId, meetingId: `meet-${roomId}` })
        dismissMeetingNotifications(roomId)
      }
      setMeetingParticipants({})
      setHandRaised(false)
      setPinnedId(null)
      setActiveSidePanel(null)
      if (!opts.silent) toast('Left the call', { icon: '🛑' })
      try {
        sessionStorage.removeItem('teamora-in-call')
      } catch {
        // ignore
      }
      if (!opts.fromContext) {
        globalLeaveMeeting?.()
      }
      rtcLog(`[RTC-AUDIO-AUDIT] [Leave Meeting] Cleanup finished`)
    },
    [socket, socketId, roomId, isRecording, destroyPeerManager, clearSpeakingMonitor, globalLeaveMeeting]
  )

  useEffect(() => {
    handleLeaveRef.current = handleLeaveMeeting
  }, [handleLeaveMeeting])

  useEffect(() => {
    if (!isMaximized || inMeeting) return undefined
    let cancelled = false
    let stream = null
    const startPreview = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: selectedCam ? { deviceId: { exact: selectedCam } } : true,
          audio: false
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        setLobbyPreview(stream)
      } catch {
        if (!cancelled) setLobbyPreview(null)
      }
    }
    startPreview()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
      setLobbyPreview(null)
    }
  }, [isMaximized, inMeeting, selectedCam])

  useEffect(() => {
    const video = lobbyVideoRef.current
    if (!video || !lobbyPreview) return
    if (video.srcObject !== lobbyPreview) video.srcObject = lobbyPreview
    video.play?.().catch(() => {})
  }, [lobbyPreview])

  useEffect(() => {
    if (!contextInMeeting && inMeetingRef.current) {
      handleLeaveRef.current({ fromContext: true, silent: true })
    }
  }, [contextInMeeting, meetingEpoch])

  const handleJoinMeeting = async () => {
    if (inMeeting || isJoining) return
    if (!socketId) {
      toast.error('Connecting to server... please wait.')
      return
    }
    if (typeof socket.whenReady === 'function') {
      await socket.whenReady(4000)
    }
    if (!socket?.connected) {
      toast.error('Connecting to server... please wait.')
      return
    }
    setIsJoining(true)
    try {
      if (lobbyPreview) {
        lobbyPreview.getTracks().forEach((track) => track.stop())
        setLobbyPreview(null)
      }
      let stream = null
      const audioConstraints = {
        deviceId: selectedMic ? { exact: selectedMic } : undefined,
        echoCancellation: true,
        noiseSuppression,
        autoGainControl: true
      }
      try {
        rtcLog(`[RTC-AUDIO-AUDIT] [GetUserMedia] Requesting getUserMedia with video=true and full audio settings.`)
        stream = await navigator.mediaDevices.getUserMedia({
          video: selectedCam ? { deviceId: { exact: selectedCam } } : true,
          audio: audioConstraints
        })
        rtcLog(`[RTC-AUDIO-AUDIT] [GetUserMedia Success] streamId=${stream.id}`)
        stream.getTracks().forEach((track, idx) => {
          rtcLog(
            `[RTC-AUDIO-AUDIT]   - Track #${idx}: id=${track.id} kind=${track.kind} enabled=${track.enabled} readyState=${track.readyState}`
          )
        })
        localStreamRef.current = stream
        setLocalStream(stream)
      } catch (err) {
        console.error('[RTC-AUDIO-AUDIT] [GetUserMedia Failure] Trying audio-only before mock fallback:', err)
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: audioConstraints })
          localStreamRef.current = stream
          setLocalStream(stream)
        } catch (audioErr) {
          console.error('[RTC-AUDIO-AUDIT] [GetUserMedia Failure] Audio-only failed, using fallback:', audioErr)
          stream = startMockVideoStream()
          localStreamRef.current = stream
          setLocalStream(stream)
        }
      }

      setInMeeting(true)
      setAdmitted(true)
      const ice = describeIceSetup()
      rtcLog(`[RTC-AUDIO-AUDIT] Joined call: hasTurn=${ice.hasTurn} turnCount=${ice.turnCount}`)
      toast.success('Joined the meeting', { icon: '📹' })
      pushDiag(`joined ice hasTurn=${ice.hasTurn} self=${socketId}`)

      // First joiner claims host so waiting-room / host signals always have a target.
      if (!hostInfoRef.current.hostSocketId) {
        socket.emit('meeting-claim-host', { hostSocketId: socketId, hostName: userName })
        hostInfoRef.current = { hostSocketId: socketId, hostName: userName }
        setHostInfo({ hostSocketId: socketId, hostName: userName })
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
      // Untargeted sync so existing peers re-announce + we mesh (undefined target = broadcast)
      emitSignal(undefined, {
        type: 'sync-request',
        from: socketId,
        participant: selfParticipant
      })

      const knownPeers = Object.keys(participantsRef.current).filter((id) => id !== socketId)
      if (knownPeers.length === 0) {
        const meetingTitle = `Teamora Call · ${userName || 'Host'}`
        socket.emit('meeting-started', {
          workspaceId: roomId,
          meetingId: `meet-${roomId}`,
          title: meetingTitle,
          organizer: userName,
          startedAt: new Date().toISOString()
        })
      }
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
      try {
        sessionStorage.setItem('teamora-in-call', roomId)
        const workspace = activeMeetingWorkspace?._id === roomId ? activeMeetingWorkspace : { _id: roomId }
        globalJoinMeeting?.(workspace)
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('Error joining meeting:', err)
      toast.error('Initialization failed.')
    } finally {
      setIsJoining(false)
    }
  }

  useEffect(() => {
    const restoredCall = sessionStorage.getItem('teamora-in-call') === roomId
    const restoredContext = Boolean(
      contextInMeeting && (activeMeetingWorkspace?._id === roomId || !activeMeetingWorkspace)
    )
    if (restoredCall || restoredContext) {
      if (!inMeeting && !isJoining && socketId && socket?.connected) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        handleJoinMeeting()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, inMeeting, isJoining, socketId, socket?.connected, contextInMeeting])

  const toggleMic = () => {
    const nextState = !micActive
    rtcLog(`[RTC-AUDIO-AUDIT] [Toggle Mic] current=${micActive} next=${nextState}`)
    setMicActive(nextState)
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        rtcLog(`[RTC-AUDIO-AUDIT]   - Setting audio track enabled state: trackId=${track.id} enabled=${nextState}`)
        track.enabled = nextState
      })
    } else {
      console.warn(`[RTC-AUDIO-AUDIT] [Toggle Mic] No localStream available to toggle!`)
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
    rtcLog(`[RTC-AUDIO-AUDIT] [Toggle Cam] current=${camActive} next=${nextState}`)
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

  const recordingCleanupRef = useRef(null)

  const buildRecordingStream = () => {
    const mixed = new MediaStream()
    const local = localStreamRef.current
    const remoteList = Object.values(remoteStreams || {})
      .map((entry) => entry?.stream)
      .filter(Boolean)

    const videoTrack =
      local?.getVideoTracks?.().find((t) => t.readyState === 'live') ||
      remoteList.flatMap((stream) => stream.getVideoTracks()).find((t) => t.readyState === 'live')
    if (videoTrack) mixed.addTrack(videoTrack)

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const dest = audioCtx.createMediaStreamDestination()
    const connectAudio = (stream) => {
      const tracks = stream?.getAudioTracks?.() || []
      if (!tracks.length) return
      try {
        const src = audioCtx.createMediaStreamSource(new MediaStream(tracks))
        src.connect(dest)
      } catch {
        // Some remote streams cannot be mixed if they have no frames yet.
      }
    }
    if (local) connectAudio(local)
    remoteList.forEach(connectAudio)
    dest.stream.getAudioTracks().forEach((track) => mixed.addTrack(track))

    if (!mixed.getTracks().length) {
      audioCtx.close?.().catch(() => {})
      return null
    }

    return {
      stream: mixed,
      cleanup: () => {
        dest.stream.getTracks().forEach((t) => t.stop())
        audioCtx.close?.().catch(() => {})
      }
    }
  }

  const toggleRecording = async () => {
    if (!isRecording) {
      const composed = buildRecordingStream()
      if (!composed) {
        toast.error('No audio or video is available to record.')
        return
      }
      recordingCleanupRef.current = composed.cleanup
      setIsRecording(true)
      setRecordingSeconds(0)
      recordIntervalRef.current = setInterval(() => setRecordingSeconds((p) => p + 1), 1000)
      recordedChunksRef.current = []

      const mimeType = pickRecorderMime()
      let mediaRecorder
      try {
        mediaRecorder = mimeType
          ? new MediaRecorder(composed.stream, {
              mimeType,
              videoBitsPerSecond: 1_500_000,
              audioBitsPerSecond: 128_000
            })
          : new MediaRecorder(composed.stream)
      } catch {
        try {
          mediaRecorder = new MediaRecorder(composed.stream, { mimeType: 'video/webm' })
        } catch {
          mediaRecorder = new MediaRecorder(composed.stream)
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('[recording] MediaRecorder error', event)
        toast.error('Recording failed. Try again.')
      }
      mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size > 0) recordedChunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = () => {
        recordingCleanupRef.current?.()
        recordingCleanupRef.current = null
        const chunks = recordedChunksRef.current
        if (!chunks.length) {
          toast.error('Recording produced no data.')
          return
        }
        const type = mediaRecorder.mimeType || mimeType || 'video/webm'
        const blob = new Blob(chunks, { type })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `meeting-recording-${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
      }
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000)
      toast.success('Meeting recording started!')
    } else {
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.requestData?.()
        } catch {
          // ignore
        }
        recorder.stop()
      }
      clearInterval(recordIntervalRef.current)
      setIsRecording(false)
      toast.success('Meeting recording saved!')
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

  // Single socket listener lifecycle — deps only socket identity, refs for live state
  useEffect(() => {
    if (!socket?.on || !socketId) return undefined

    const onJoin = (raw) => {
      const p = raw?.participant && typeof raw.participant === 'object' ? { ...raw, ...raw.participant } : raw
      if (!p?.socketId) return

      setMeetingParticipants((prev) => {
        if (!prev[p.socketId] && p.socketId !== socketId) {
          toast(`${p.user || 'Someone'} joined the call.`, { icon: '📹' })
        }
        return { ...prev, [p.socketId]: { ...prev[p.socketId], ...p } }
      })

      if (inMeetingRef.current && admittedRef.current && p.socketId !== socketId) {
        pushDiag(`peer join → connect ${p.socketId}`)
        const existingPc = peerManagerRef.current?.pcs?.get(p.socketId)
        if (
          existingPc &&
          (existingPc.connectionState === 'failed' ||
            existingPc.connectionState === 'closed' ||
            existingPc.connectionState === 'disconnected')
        ) {
          peerManagerRef.current.removePeer(p.socketId)
        }
        connectToPeer(p.socketId)
      }
    }

    const onLeave = (raw) => {
      const peerId = typeof raw === 'string' ? raw : raw?.socketId || raw?.clientId
      if (!peerId || peerId === socketId) return
      pushDiag(`peer leave ${peerId}`)
      setMeetingParticipants((prev) => {
        const next = { ...prev }
        delete next[peerId]
        return next
      })

      peerManagerRef.current?.removePeer(peerId)
      setPinnedId((cur) => (cur === peerId ? null : cur))
    }

    const hydrateRoster = (payload) => {
      const roster = payload?.participants
      if (!roster || typeof roster !== 'object') return
      setMeetingParticipants((prev) => {
        const next = { ...prev }
        Object.entries(roster).forEach(([id, part]) => {
          const participant = part?.socketId ? part : { ...part, socketId: id }
          next[participant.socketId || id] = { ...next[participant.socketId || id], ...participant }
        })
        return next
      })
      if (payload.hostSocketId) {
        setHostInfo((cur) =>
          cur.hostSocketId ? cur : { hostSocketId: payload.hostSocketId, hostName: payload.hostName || '' }
        )
      }
      if (inMeetingRef.current && admittedRef.current) {
        Object.keys(roster).forEach((id) => {
          if (id !== socketId) connectToPeer(id)
        })
      }
    }

    const onWsJoined = () => {
      if (!inMeetingRef.current || !admittedRef.current || !socketId) return
      const { micActive: m, camActive: c, handRaised: h } = micCamHandRef.current
      socket.emit('meeting-join', {
        roomId,
        participant: { socketId, user: userName, micActive: m, camActive: c, handRaised: h }
      })
      emitSignal(undefined, { type: 'sync-request', from: socketId })
      Object.keys(participantsRef.current).forEach((id) => {
        if (id !== socketId) connectToPeer(id)
      })
    }

    const onStateChange = ({ socketId: peerSocketId, state }) => {
      if (!peerSocketId) return
      setMeetingParticipants((prev) => ({
        ...prev,
        [peerSocketId]: { ...(prev[peerSocketId] || {}), ...state }
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
              setLocalStream(stream)
            } catch {
              stream = startMockVideoStream()
              localStreamRef.current = stream
              setLocalStream(stream)
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
    socket.on('meeting-active-session', hydrateRoster)
    socket.on('ws-joined', onWsJoined)

    return () => {
      socket.off?.('receive-meeting-join', onJoin)
      socket.off?.('receive-meeting-leave', onLeave)
      socket.off?.('receive-meeting-state-change', onStateChange)
      socket.off?.('receive-meeting-signal', onSignal)
      socket.off?.('receive-meeting-host', onHostUpdate)
      socket.off?.('receive-message', onMessage)
      socket.off?.('meeting-active-session', hydrateRoster)
      socket.off?.('ws-joined', onWsJoined)
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
    respondScreenControl
  ])

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
  // Cleanup unmount — do not emit leave or clear teamora-in-call here.
  // Refresh must reconnect to the same meeting; only explicit leave removes the user.
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
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch (err) {
          console.error('[meeting-rtc] failed to stop recorder on unmount', err)
        }
      }
      try {
        recordingCleanupRef.current?.()
      } catch (err) {
        console.error('[meeting-rtc] failed to release recording mix on unmount', err)
      }
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
    if (activeSpeakerId && meetingParticipants[activeSpeakerId]) return activeSpeakerId
    return Object.keys(meetingParticipants)[0] || socketId
  }, [pinnedId, activeSpeakerId, meetingParticipants, socketId])

  const participantsList = useMemo(() => {
    return Object.entries(meetingParticipants).map(([id, part]) => ({
      id,
      ...part
    }))
  }, [meetingParticipants])

  const activeParticipant = useMemo(() => {
    return participantsList.find((p) => p.id === speakerId)
  }, [participantsList, speakerId])

  const otherParticipants = useMemo(() => {
    return participantsList.filter((p) => p.id !== speakerId)
  }, [participantsList, speakerId])

  const participantCount = participantsList.length || Object.keys(meetingParticipants).length || (inMeeting ? 1 : 0)
  const gridColsClass =
    participantCount <= 1
      ? 'grid-cols-1'
      : participantCount === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : participantCount <= 4
          ? 'grid-cols-2'
          : participantCount <= 9
            ? 'grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'

  const meetingContent = (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card-sunken text-text select-none">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
          {inMeeting && (
            <div className="absolute top-4 left-6 right-6 flex justify-between items-center z-25 pointer-events-none">
              {isRecording && (
                <div className="flex items-center gap-1.5 bg-danger/90 text-on-primary text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-auto border border-danger animate-pulse">
                  <Disc className="w-3.5 h-3.5 fill-current" />
                  <span>REC {formatTimer(recordingSeconds)}</span>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2 pointer-events-auto">
                <div className="flex items-center gap-1.5 bg-card/90 text-muted text-[10px] font-bold px-3 py-1.5 rounded-full shadow border border-border">
                  <Users className="w-3.5 h-3.5" />
                  <span>{Object.keys(meetingParticipants).length || 0}</span>
                </div>
              </div>
            </div>
          )}

          {!inMeeting ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
              <div className="relative mb-5 h-48 w-full overflow-hidden rounded-2xl border border-border bg-card-sunken">
                {lobbyPreview ? (
                  <video
                    ref={lobbyVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-contain scale-x-[-1] bg-black"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-primary/10 to-card-sunken">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-lg font-bold text-primary">
                      {initialsFor(userName)}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 rounded-full border border-border bg-card/90 px-2.5 py-1 text-[10px] font-bold text-text">
                  {userName} (You)
                </div>
              </div>
              <h2 className="text-xl font-bold text-text mb-2">Teamora Call Lobby</h2>
              <p className="text-sm text-muted mb-4 font-medium">
                Check your camera, then join. Others in this workspace will see and hear you.
              </p>
              <button
                type="button"
                onClick={handleJoinMeeting}
                disabled={isJoining || !socketId || !socket?.connected}
                className="w-full py-4 bg-primary hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70 text-on-primary font-semibold rounded-2xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Video className="w-5 h-5" />
                <span>
                  {!socketId || !socket?.connected ? 'Connecting to Server…' : isJoining ? 'Joining…' : 'Join Meeting'}
                </span>
              </button>
            </div>
          ) : layoutMode === 'speaker' ? (
            <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-0 w-full h-full">
              {/* Active Speaker Container */}
              <div className="flex-grow flex-1 min-h-0 relative flex items-center justify-center bg-black/20 rounded-2xl overflow-hidden h-[65vh] md:h-full">
                <ActiveSpeakerVideo
                  participant={activeParticipant}
                  isMe={activeParticipant?.id === socketId}
                  localVideoRef={localVideoRef}
                  localStream={localStream}
                  remoteStream={activeParticipant ? remoteStreams[activeParticipant.id]?.stream : null}
                  selectedSpeaker={selectedSpeaker}
                  speaking={activeParticipant ? speakingMap[activeParticipant.id] : false}
                  networkQualityValue={activeParticipant ? networkQuality[activeParticipant.id] : null}
                  pinnedId={pinnedId}
                  setPinnedId={setPinnedId}
                  toggleFullscreen={toggleFullscreen}
                  camActive={camActive}
                  peerState={activeParticipant ? peerStates[activeParticipant.id] : null}
                  userName={userName}
                />
              </div>
              {/* Participant Sidebar */}
              {otherParticipants.length > 0 && (
                <ParticipantThumbnailList
                  participants={otherParticipants}
                  socketId={socketId}
                  localVideoRef={localVideoRef}
                  localStream={localStream}
                  remoteStreams={remoteStreams}
                  selectedSpeaker={selectedSpeaker}
                  speakingMap={speakingMap}
                  networkQuality={networkQuality}
                  pinnedId={pinnedId}
                  setPinnedId={setPinnedId}
                  toggleFullscreen={toggleFullscreen}
                  camActive={camActive}
                  peerStates={peerStates}
                  userName={userName}
                />
              )}
            </div>
          ) : (
            <div className={`grid min-h-0 h-full flex-1 gap-3 overflow-hidden ${gridColsClass}`}>
              {Object.entries(meetingParticipants).map(([id, part]) => (
                <div key={id} className="relative min-h-0 h-full overflow-hidden rounded-2xl border border-border">
                  <ParticipantTile
                    participantId={id}
                    part={part}
                    isMe={id === socketId}
                    localVideoRef={localVideoRef}
                    localStream={localStream}
                    remoteStream={remoteStreams[id]?.stream}
                    selectedSpeaker={selectedSpeaker}
                    speaking={speakingMap[id]}
                    networkQualityValue={networkQuality[id]}
                    pinnedId={pinnedId}
                    setPinnedId={setPinnedId}
                    toggleFullscreen={toggleFullscreen}
                    camActive={camActive}
                    peerState={peerStates[id]}
                    userName={userName}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {inMeeting && admitted && (
        <div className="z-20 flex h-[4.5rem] w-full shrink-0 items-center justify-center border-t border-border bg-card-sunken/95 px-3 py-2">
          <div className="flex h-16 w-full max-w-3xl items-center justify-between gap-1 rounded-full border border-border bg-card/90 px-4 py-2.5 shadow-card">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMic}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${micActive ? 'bg-card border-border text-text hover:bg-primary/10' : 'bg-danger text-on-primary border-danger'}`}
                title={micActive ? 'Mute' : 'Unmute'}
                aria-label={micActive ? 'Mute microphone' : 'Unmute microphone'}
                aria-pressed={!micActive}
              >
                {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleCam}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${camActive ? 'bg-card border-border text-text hover:bg-primary/10' : 'bg-danger text-on-primary border-danger'}`}
                title={camActive ? 'Camera off' : 'Camera on'}
                aria-label={camActive ? 'Turn camera off' : 'Turn camera on'}
                aria-pressed={camActive}
              >
                {camActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleScreenShare}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${screenSharingActive ? 'bg-success text-on-primary border-success' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                title={screenSharingActive ? 'Stop sharing' : 'Share screen'}
                aria-label={screenSharingActive ? 'Stop sharing screen' : 'Share screen'}
                aria-pressed={screenSharingActive}
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
                aria-label="Raise hand"
                aria-pressed={handRaised}
              >
                <Hand className="w-4 h-4" />
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

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDeviceSettings((v) => !v)}
                  className={`p-2.5 rounded-xl cursor-pointer border ${showDeviceSettings ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'}`}
                  title="Device settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {showDeviceSettings && (
                  <div className="absolute bottom-full mb-2 right-0 flex flex-col gap-2.5 bg-card border border-border rounded-2xl p-4 shadow-lg z-50 w-72 select-text">
                    <h4 className="font-bold text-xs text-text border-b border-border pb-1.5 mb-1 flex items-center justify-between">
                      <span>Device Settings</span>
                      <button
                        onClick={() => setShowDeviceSettings(false)}
                        className="text-muted hover:text-text cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </h4>

                    {/* Microphone Select */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Microphone</label>
                      <select
                        value={selectedMic}
                        onChange={(e) => changeDevice('audioinput', e.target.value)}
                        className="bg-card-sunken border border-border rounded-lg text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-text max-w-full"
                      >
                        {devices
                          .filter((d) => d.kind === 'audioinput')
                          .map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label || `Microphone ${d.deviceId.substring(0, 5)}`}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Camera Select */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Camera</label>
                      <select
                        value={selectedCam}
                        onChange={(e) => changeDevice('videoinput', e.target.value)}
                        className="bg-card-sunken border border-border rounded-lg text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-text max-w-full"
                      >
                        {devices
                          .filter((d) => d.kind === 'videoinput')
                          .map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label || `Camera ${d.deviceId.substring(0, 5)}`}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Speaker Select */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Speaker</label>
                      <select
                        value={selectedSpeaker}
                        onChange={(e) => changeDevice('audiooutput', e.target.value)}
                        className="bg-card-sunken border border-border rounded-lg text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-text max-w-full"
                      >
                        {devices
                          .filter((d) => d.kind === 'audiooutput')
                          .map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label || `Speaker ${d.deviceId.substring(0, 5)}`}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                      <div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Noise suppression</p>
                        <p className="text-[10px] text-muted/80">Browser-dependent audio constraint</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={noiseSuppression}
                        onClick={async () => {
                          const next = !noiseSuppression
                          setNoiseSuppression(next)
                          if (!localStreamRef.current || !inMeeting) {
                            toast(
                              next
                                ? 'Noise suppression will apply when you join.'
                                : 'Noise suppression off for next join.'
                            )
                            return
                          }
                          try {
                            const newStream = await navigator.mediaDevices.getUserMedia({
                              audio: {
                                deviceId: selectedMic ? { exact: selectedMic } : undefined,
                                echoCancellation: true,
                                noiseSuppression: next,
                                autoGainControl: true
                              }
                            })
                            const newTrack = newStream.getAudioTracks()[0]
                            localStreamRef.current.getAudioTracks().forEach((t) => {
                              t.stop()
                              localStreamRef.current.removeTrack(t)
                            })
                            localStreamRef.current.addTrack(newTrack)
                            newTrack.enabled = micActive
                            peerManagerRef.current?.setLocalStream?.(localStreamRef.current)
                            toast.success(next ? 'Noise suppression on' : 'Noise suppression off')
                          } catch (err) {
                            setNoiseSuppression(!next)
                            toast.error('Could not update microphone settings')
                            console.error('[RTC] noise suppression toggle failed', err)
                          }
                        }}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                          noiseSuppression ? 'bg-primary' : 'bg-border'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                            noiseSuppression ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                aria-label="Leave meeting"
                className="px-4 py-2.5 bg-danger hover:bg-danger-hover text-on-primary rounded-xl text-xs font-semibold cursor-pointer border border-danger shadow-sm"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {inMeeting && activeSidePanel && (
        <div className="absolute top-0 right-0 bottom-[4.5rem] z-30 flex w-80 max-w-[90vw] flex-col border-l border-border bg-card shadow-xl">
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
              {Object.entries(meetingParticipants).map(([participantSocketId, part]) => {
                const isUserHost = participantSocketId === hostInfo.hostSocketId
                return (
                  <div
                    key={participantSocketId}
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
                          {peerStates[participantSocketId] ? ` · ${peerStates[participantSocketId]}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {part.handRaised && isHost && (
                        <button
                          type="button"
                          onClick={() => hostLowerHand(participantSocketId)}
                          className="p-1 hover:bg-primary/10 rounded text-warning cursor-pointer"
                          title="Lower hand"
                        >
                          <Hand className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                      {isHost && participantSocketId !== socketId && (
                        <>
                          <button
                            type="button"
                            onClick={() => hostMuteParticipant(participantSocketId)}
                            className="p-1 hover:bg-primary/10 rounded text-muted hover:text-danger cursor-pointer"
                            title="Mute"
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => hostKickParticipant(participantSocketId)}
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

  const miniViewRef = useRef(null)

  const handlePointerDown = (e) => {
    // If clicking on a control button, do not capture/drag
    if (e.target.closest('button')) return
    dragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, posX: position.x, posY: position.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handlePointerMove = (e) => {
    if (!dragRef.current.isDragging || !miniViewRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    requestAnimationFrame(() => {
      if (miniViewRef.current) {
        miniViewRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      }
    })
  }
  const handlePointerUp = (e) => {
    if (!dragRef.current.isDragging) return
    dragRef.current.isDragging = false
    e.currentTarget.releasePointerCapture(e.pointerId)

    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPosition({ x: dragRef.current.posX + dx, y: dragRef.current.posY + dy })

    if (miniViewRef.current) {
      miniViewRef.current.style.transform = 'none'
    }
  }

  // eslint-disable-next-line react-hooks/refs
  const speakerStream = speakerId === socketId ? localStreamRef.current : remoteStreams[speakerId]?.stream
  const speakerName = speakerId === socketId ? userName : meetingParticipants[speakerId]?.user

  const miniView = (
    <div
      ref={miniViewRef}
      className={`fixed z-[9999] pointer-events-auto shadow-2xl rounded-2xl overflow-hidden bg-card border border-border flex flex-col ${isMinimized ? 'w-64 h-16' : 'w-80 h-64'} transition-all`}
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="h-8 bg-card-sunken border-b border-border flex items-center justify-between px-3 cursor-move touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-bold text-muted uppercase">Meeting</span>
        </div>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button onClick={toggleMinimize} className="p-1 hover:bg-primary/10 rounded cursor-pointer text-muted">
            <span className="block w-2.5 border-b-2 border-current"></span>
          </button>
          <button
            onClick={() => navigate(`/workspace/${roomId}/meetings`)}
            className="p-1 hover:bg-primary/10 rounded cursor-pointer text-muted"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {!isMinimized && (
        <div className="flex-1 relative bg-black/90 flex items-center justify-center overflow-hidden">
          {speakerStream ? (
            <MiniVideo stream={speakerStream} isMe={speakerId === socketId} />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold border border-primary/30">
              {(speakerName || 'U').substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-bold backdrop-blur-sm border border-white/10">
            {speakerName || 'User'} {speakerId === socketId ? '(You)' : ''}
          </div>
        </div>
      )}
      <div className="h-14 bg-card px-4 flex items-center justify-center gap-3 border-t border-border shrink-0 pointer-events-auto">
        <button
          onClick={toggleMic}
          className={`p-2.5 rounded-full border transition-colors cursor-pointer ${micActive ? 'bg-card border-border text-text hover:bg-primary/10' : 'bg-danger text-on-primary border-danger'}`}
        >
          {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>
        <button
          onClick={toggleCam}
          className={`p-2.5 rounded-full border transition-colors cursor-pointer ${camActive ? 'bg-card border-border text-text hover:bg-primary/10' : 'bg-danger text-on-primary border-danger'}`}
        >
          {camActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>
        <button
          onClick={handleLeaveMeeting}
          className="p-2.5 rounded-full bg-danger text-on-primary hover:bg-danger-hover cursor-pointer border border-danger"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className={isMaximized ? 'relative flex h-full min-h-0 w-full flex-col' : 'relative pointer-events-none'}>
      <div className={isMaximized ? 'flex h-full min-h-0 w-full flex-col' : 'hidden'} aria-hidden={!isMaximized}>
        {meetingContent}
      </div>
      {!isMaximized && miniView}
    </div>
  )
}
