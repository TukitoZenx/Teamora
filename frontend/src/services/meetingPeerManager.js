/**
 * Production-oriented WebRTC mesh peer manager for Teamora meetings.
 * - Deterministic offerer (lexicographic peer id) to avoid glare
 * - Perfect negotiation (polite peer rollback)
 * - ICE candidate queue until remote description is set
 * - Track add/replace, reconnect with backoff
 * - Verbose diagnostics for debugging
 */
import { getMeetingRtcConfiguration } from './webrtcIce'

const log = (...args) => {
  if (import.meta.env.DEV) console.info('[meeting-rtc]', ...args)
}

const toSessionDesc = (raw) => {
  if (!raw) return null
  if (typeof raw === 'string') return { type: 'offer', sdp: raw }
  if (raw.type && raw.sdp) return { type: raw.type, sdp: raw.sdp }
  return raw
}

const toIceInit = (raw) => {
  if (!raw) return null
  if (typeof raw.toJSON === 'function') return raw.toJSON()
  return {
    candidate: raw.candidate,
    sdpMid: raw.sdpMid ?? null,
    sdpMLineIndex: raw.sdpMLineIndex ?? null,
    usernameFragment: raw.usernameFragment
  }
}

export class MeetingPeerManager {
  /**
   * @param {{
   *   selfId: string,
   *   emitSignal: (targetId: string, signal: object) => void,
   *   onRemoteStream: (peerId: string, stream: MediaStream) => void,
   *   onPeerState?: (peerId: string, state: string) => void,
   *   onPeerRemoved?: (peerId: string) => void,
   *   onDiag?: (line: string) => void,
   *   isPeerActive?: (peerId: string) => boolean,
   * }} opts
   */
  constructor(opts) {
    this.selfId = opts.selfId
    this.emitSignal = opts.emitSignal
    this.onRemoteStream = opts.onRemoteStream
    this.onPeerState = opts.onPeerState || (() => {})
    this.onPeerRemoved = opts.onPeerRemoved || (() => {})
    this.onDiag = opts.onDiag || (() => {})
    this.isPeerActive = opts.isPeerActive || (() => true)
    /** @type {Map<string, RTCPeerConnection>} */
    this.pcs = new Map()
    /** @type {Map<string, RTCIceCandidateInit[]>} */
    this.iceQueue = new Map()
    /** @type {Map<string, boolean>} */
    this.makingOffer = new Map()
    /** @type {Map<string, number>} */
    this.reconnectAttempts = new Map()
    /** @type {Map<string, ReturnType<typeof setTimeout>>} */
    this.reconnectTimers = new Map()
    /** @type {Map<string, MediaStream>} */
    this.remoteStreams = new Map()
    this.localStream = null
    this.screenStream = null
    this.destroyed = false

    // Audio Mixing
    this.audioCtx = null
    this.audioDestination = null
    this.micSource = null
    this.screenAudioSource = null
    this.mixedAudioTrack = null
  }

  diag(msg, extra) {
    const line = extra !== undefined ? `${msg} ${JSON.stringify(extra)}` : msg
    log(line)
    this.onDiag(line)
  }

  shouldOffer(remoteId) {
    return String(this.selfId) > String(remoteId)
  }

  _setupAudioMixer() {
    if (!this.localStream) {
      this._cleanupAudioMixer()
      this.mixedAudioTrack = null
      return
    }

    const micTrack = this.localStream.getAudioTracks()[0]
    const screenAudioTrack = this.screenStream?.getAudioTracks()[0]

    // If there is no screen audio track, bypass the AudioContext mixer entirely.
    // This avoids any autoplay/gesture limitations of AudioContext for mic-only calls.
    if (!screenAudioTrack) {
      this._cleanupAudioMixer()
      this.mixedAudioTrack = micTrack
      return
    }

    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        this.audioCtx = new AudioContextClass()
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch((err) => {
          console.warn('[RTC-AUDIO-MIXER] Failed to resume AudioContext:', err)
        })
      }

      this._cleanupAudioMixerSources()

      if (!this.audioDestination) {
        this.audioDestination = this.audioCtx.createMediaStreamDestination()
      }

      if (micTrack) {
        const micStream = new MediaStream([micTrack])
        this.micSource = this.audioCtx.createMediaStreamSource(micStream)
        this.micSource.connect(this.audioDestination)
      }

      const screenAudioStream = new MediaStream([screenAudioTrack])
      this.screenAudioSource = this.audioCtx.createMediaStreamSource(screenAudioStream)
      this.screenAudioSource.connect(this.audioDestination)

      this.mixedAudioTrack = this.audioDestination.stream.getAudioTracks()[0]
      log(`[RTC-AUDIO-MIXER] Mixed track created: id=${this.mixedAudioTrack?.id}`)
    } catch (err) {
      console.error('[RTC-AUDIO-MIXER] Failed to initialize AudioContext mixer, falling back to mic track:', err)
      this.mixedAudioTrack = micTrack
    }
  }

  _cleanupAudioMixerSources() {
    if (this.micSource) {
      try {
        this.micSource.disconnect()
      } catch {
        /* ignore */
      }
      this.micSource = null
    }
    if (this.screenAudioSource) {
      try {
        this.screenAudioSource.disconnect()
      } catch {
        /* ignore */
      }
      this.screenAudioSource = null
    }
  }

  _cleanupAudioMixer() {
    this._cleanupAudioMixerSources()
    if (this.audioDestination) {
      this.audioDestination = null
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {})
      this.audioCtx = null
    }
  }

  setLocalStream(stream) {
    this.localStream = stream
    this._setupAudioMixer()
    this.pcs.forEach((pc) => {
      this._syncLocalTracks(pc)
    })
  }

  setScreenStream(stream) {
    this.screenStream = stream || null
    this._setupAudioMixer()
    this.pcs.forEach((pc) => {
      this._syncLocalTracks(pc)
    })
  }

  connect(peerId) {
    if (this.destroyed || !peerId || peerId === this.selfId) return
    const existing = this.pcs.get(peerId)
    if (
      existing &&
      (existing.connectionState === 'failed' ||
        existing.connectionState === 'closed' ||
        existing.connectionState === 'disconnected' ||
        existing.signalingState === 'closed')
    ) {
      this.removePeer(peerId)
    }
    this._ensurePc(peerId)
    if (this.shouldOffer(peerId)) {
      this._createOffer(peerId)
    } else {
      this.diag(`awaiting offer from ${peerId}`)
    }
  }

  async handleSignal(fromId, signal) {
    if (this.destroyed || !fromId || fromId === this.selfId || !signal?.type) return

    log(`[RTC-AUDIO-AUDIT] [Signal IN] from=${fromId} type=${signal.type}`)

    // Only negotiate media signals here
    if (signal.type !== 'offer' && signal.type !== 'answer' && signal.type !== 'candidate') {
      return
    }

    const pc = this._ensurePc(fromId)

    try {
      if (signal.type === 'offer') {
        const offerCollision =
          this.makingOffer.get(fromId) || (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer')
        const polite = !this.shouldOffer(fromId)

        log(
          `[RTC-AUDIO-AUDIT] [Offer collision check] peer=${fromId} collision=${offerCollision} polite=${polite} state=${pc.signalingState}`
        )

        if (offerCollision && !polite) {
          this.diag(`glare ignore offer from ${fromId}`)
          console.warn(`[RTC-AUDIO-AUDIT] Glare: ignoring offer from non-polite peer=${fromId}`)
          return
        }
        if (offerCollision && polite) {
          try {
            log(`[RTC-AUDIO-AUDIT] Glare: rolling back local offer for polite peer=${fromId}`)
            await pc.setLocalDescription({ type: 'rollback' })
          } catch (e) {
            console.error(`[RTC-AUDIO-AUDIT] Rollback failed:`, e)
          }
        }
        const desc = toSessionDesc(signal.sdp)
        if (!desc?.sdp) {
          this.diag(`empty offer SDP from ${fromId}`)
          console.error(`[RTC-AUDIO-AUDIT] Received empty offer SDP from=${fromId}`)
          return
        }

        // Audit the incoming SDP
        const hasAudio = desc.sdp.includes('m=audio')
        const audioDirMatch = desc.sdp.match(/a=(sendrecv|sendonly|recvonly|inactive)/g)
        log(`[RTC-AUDIO-AUDIT] Incoming Offer SDP: hasAudio=${hasAudio} directions=${JSON.stringify(audioDirMatch)}`)

        log(`[RTC-AUDIO-AUDIT] Applying remote offer description for peer=${fromId}`)
        await pc.setRemoteDescription(desc)

        log(`[RTC-AUDIO-AUDIT] Flushing ICE candidates queue for peer=${fromId}`)
        await this._flushIce(fromId, pc)

        log(`[RTC-AUDIO-AUDIT] Creating answer for peer=${fromId}`)
        const answer = await pc.createAnswer()

        // Audit answer SDP
        const answerHasAudio = answer.sdp.includes('m=audio')
        log(`[RTC-AUDIO-AUDIT] Created Answer SDP: hasAudio=${answerHasAudio}`)

        await pc.setLocalDescription(answer)
        this.diag(`answer → ${fromId}`)
        this.emitSignal(fromId, {
          type: 'answer',
          sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }
        })
        return
      }

      if (signal.type === 'answer') {
        if (pc.signalingState !== 'have-local-offer') {
          this.diag(`ignore answer in state ${pc.signalingState} from ${fromId}`)
          console.warn(`[RTC-AUDIO-AUDIT] Ignoring answer from peer=${fromId} in state=${pc.signalingState}`)
          return
        }
        const desc = toSessionDesc(signal.sdp)
        if (!desc?.sdp) {
          this.diag(`empty answer SDP from ${fromId}`)
          console.error(`[RTC-AUDIO-AUDIT] Received empty answer SDP from=${fromId}`)
          return
        }

        // Audit incoming answer SDP
        const hasAudio = desc.sdp.includes('m=audio')
        log(`[RTC-AUDIO-AUDIT] Incoming Answer SDP: hasAudio=${hasAudio}`)

        log(`[RTC-AUDIO-AUDIT] Applying remote answer description for peer=${fromId}`)
        await pc.setRemoteDescription(desc)
        await this._flushIce(fromId, pc)
        this.diag(`answer applied ${fromId}`)
        return
      }

      if (signal.type === 'candidate' && signal.candidate) {
        const init = toIceInit(signal.candidate)
        if (!init?.candidate && init?.candidate !== '') {
          if (init.candidate == null) return
        }
        if (!pc.remoteDescription) {
          const q = this.iceQueue.get(fromId) || []
          q.push(init)
          this.iceQueue.set(fromId, q)
          this.diag(`ICE queued ${fromId} (${q.length})`)
          log(`[RTC-AUDIO-AUDIT] ICE candidate queued: peer=${fromId} queueLength=${q.length}`)
          return
        }
        log(
          `[RTC-AUDIO-AUDIT] Adding ICE candidate directly: peer=${fromId} candidate=${init.candidate.substring(0, 40)}...`
        )
        await pc.addIceCandidate(init)
        return
      }
    } catch (err) {
      this.diag(`handleSignal error ${signal.type} from ${fromId}`, err?.message || String(err))
      console.error(`[RTC-AUDIO-AUDIT] handleSignal failed from=${fromId} type=${signal.type}:`, err)
    }
  }

  removePeer(peerId) {
    const timer = this.reconnectTimers.get(peerId)
    if (timer) {
      window.clearTimeout(timer)
      this.reconnectTimers.delete(peerId)
    }
    const pc = this.pcs.get(peerId)
    if (pc) {
      try {
        pc.onicecandidate = null
        pc.ontrack = null
        pc.onconnectionstatechange = null
        pc.oniceconnectionstatechange = null
        pc.close()
      } catch {
        // ignore
      }
      this.pcs.delete(peerId)
    }
    this.iceQueue.delete(peerId)
    this.makingOffer.delete(peerId)
    this.reconnectAttempts.delete(peerId)
    this.remoteStreams.delete(peerId)
    this.onPeerRemoved(peerId)
    this.diag(`removed peer ${peerId}`)
  }

  destroy() {
    this.destroyed = true
    ;[...this.pcs.keys()].forEach((id) => this.removePeer(id))
    this.localStream = null
    this.screenStream = null
    this._cleanupAudioMixer()
  }

  getDiagnostics() {
    const peers = []
    this.pcs.forEach((pc, id) => {
      peers.push({
        id,
        connection: pc.connectionState,
        ice: pc.iceConnectionState,
        signaling: pc.signalingState,
        hasRemote: Boolean(this.remoteStreams.get(id)),
        senders: pc
          .getSenders()
          .map((s) => s.track?.kind || 'null')
          .join(',')
      })
    })
    return {
      selfId: this.selfId,
      peerCount: this.pcs.size,
      peers,
      hasLocal: Boolean(this.localStream),
      screenSharing: Boolean(this.screenStream),
      iceServers: getMeetingRtcConfiguration().iceServers?.length || 0
    }
  }

  _ensurePc(peerId) {
    let pc = this.pcs.get(peerId)
    if (pc && (pc.connectionState === 'closed' || pc.signalingState === 'closed')) {
      log(`[RTC-AUDIO-AUDIT] Found closed PC for peer=${peerId}, removing and recreating.`)
      this.removePeer(peerId)
      pc = null
    }
    if (pc) return pc

    // Audit active PeerConnections
    log(`[RTC-AUDIO-AUDIT] Active PeerConnections count: ${this.pcs.size + 1} (creating new PC for peer=${peerId})`)
    log(`[RTC-AUDIO-AUDIT] Current peer IDs: ${Array.from(this.pcs.keys()).join(', ') || 'none'}`)

    this.diag(`create PC ${this.selfId} ↔ ${peerId}`)
    pc = new RTCPeerConnection(getMeetingRtcConfiguration())
    this.iceQueue.set(peerId, [])
    this.pcs.set(peerId, pc)

    pc.onicecandidate = (e) => {
      if (!e.candidate) {
        log(`[RTC-AUDIO-AUDIT] End of ICE candidates for peer=${peerId}`)
        return
      }
      log(
        `[RTC-AUDIO-AUDIT] Local ICE candidate gathered for peer=${peerId}: candidate=${e.candidate.candidate.substring(0, 40)}...`
      )
      this.emitSignal(peerId, { type: 'candidate', candidate: toIceInit(e.candidate) })
    }

    pc.oniceconnectionstatechange = () => {
      this.diag(`ICE ${peerId}: ${pc.iceConnectionState}`)
      log(`[RTC-AUDIO-AUDIT] ICE connection state change for peer=${peerId}: state=${pc.iceConnectionState}`)
      this.onPeerState(peerId, pc.iceConnectionState)
    }

    pc.onconnectionstatechange = () => {
      this.diag(`PC ${peerId}: ${pc.connectionState}`)
      log(`[RTC-AUDIO-AUDIT] Connection state change for peer=${peerId}: state=${pc.connectionState}`)
      this.onPeerState(peerId, pc.connectionState)
      if (pc.connectionState === 'connected') {
        this.reconnectAttempts.set(peerId, 0)
      }
      if (
        (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') &&
        !this.destroyed &&
        this.isPeerActive(peerId)
      ) {
        this._scheduleReconnect(peerId)
      }
    }

    pc.onsignalingstatechange = () => {
      log(`[RTC-AUDIO-AUDIT] Signaling state change for peer=${peerId}: state=${pc.signalingState}`)
    }

    pc.onnegotiationneeded = async () => {
      log(`[RTC-AUDIO-AUDIT] Negotiation needed event fired for peer=${peerId}`)
      if (pc.signalingState !== 'stable') {
        log(`[RTC-AUDIO-AUDIT] Negotiation ignored: signalingState is ${pc.signalingState}`)
        return
      }

      // If we are the polite peer AND the connection state is new/connecting,
      // we do not initiate the offer; we let the impolite peer initiate.
      // Once established, either peer can negotiate (e.g. for screen share).
      const isInitialConnection = pc.connectionState === 'new' || pc.connectionState === 'connecting'
      if (!this.shouldOffer(peerId) && isInitialConnection) {
        log(`[RTC-AUDIO-AUDIT] Polite peer ignoring initial negotiation; waiting for remote offer.`)
        return
      }

      try {
        this.makingOffer.set(peerId, true)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        this.emitSignal(peerId, {
          type: 'offer',
          sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }
        })
      } catch (err) {
        this.diag(`negotiation needed error ${peerId}`, err?.message)
      } finally {
        this.makingOffer.set(peerId, false)
      }
    }

    pc.ontrack = (e) => {
      this.diag(`ontrack ${peerId} ${e.track?.kind}`)

      log(
        `[RTC-AUDIO-AUDIT] [Track Received] peer=${peerId} kind=${e.track?.kind} id=${e.track?.id} label=${e.track?.label} enabled=${e.track?.enabled} muted=${e.track?.muted} readyState=${e.track?.readyState}`
      )

      let stream = e.streams?.[0]
      log(
        `[RTC-AUDIO-AUDIT] Track streams list length: ${e.streams?.length || 0}. Initial stream ID: ${stream?.id || 'none'}`
      )

      if (!stream) {
        console.warn(
          `[RTC-AUDIO-AUDIT] No remote stream provided by browser, synthesizing stream wrapper for peer=${peerId}`
        )
        stream = this.remoteStreams.get(peerId) || new MediaStream()
      }

      // Always add the track if it's not present in the stream
      if (!stream.getTracks().some((t) => t.id === e.track.id)) {
        stream.addTrack(e.track)
      }

      // Force a new MediaStream instance so React updates dependencies referentially.
      // This is crucial because when tracks are added sequentially (e.g. video first, then audio),
      // the browser uses the same stream reference. React will not re-bind srcObject unless
      // a new MediaStream reference is provided.
      const newStream = new MediaStream(stream.getTracks())
      log(
        `[RTC-AUDIO-AUDIT] Stream wrapper created: newStreamId=${newStream.id} tracks=${newStream
          .getTracks()
          .map((t) => t.kind + ':' + t.id)
          .join(', ')}`
      )

      e.track.onended = () => {
        this.diag(`remote track ended ${peerId} ${e.track.kind}`)
        console.warn(`[RTC-AUDIO-AUDIT] Remote track ended: peer=${peerId} kind=${e.track.kind} id=${e.track.id}`)
      }

      this.remoteStreams.set(peerId, newStream)
      this.onRemoteStream(peerId, newStream)
    }

    this._syncLocalTracks(pc)
    return pc
  }

  _syncLocalTracks(pc) {
    if (!this.localStream) {
      console.warn(`[RTC-AUDIO-AUDIT] Local stream is empty, cannot sync tracks!`)
      return
    }
    const senders = pc.getSenders()

    // Process Video
    const videoTrack = this.localStream.getVideoTracks()[0]
    const screenVideoTrack = this.screenStream?.getVideoTracks()[0]
    const effectiveVideo = screenVideoTrack || videoTrack

    log(
      `[RTC-AUDIO-AUDIT] Syncing local video track:`,
      effectiveVideo
        ? `id=${effectiveVideo.id} enabled=${effectiveVideo.enabled} active=${effectiveVideo.active}`
        : 'none'
    )

    if (effectiveVideo) {
      const existingVideoSender = senders.find((s) => s.track?.kind === 'video')
      if (existingVideoSender) {
        if (existingVideoSender.track?.id !== effectiveVideo.id) {
          log(`[RTC-AUDIO-AUDIT] Replacing video track with: id=${effectiveVideo.id}`)
          existingVideoSender.replaceTrack(effectiveVideo).catch((e) => {
            console.error(`[RTC-AUDIO-AUDIT] Video replaceTrack failed:`, e)
          })
        }
      } else {
        try {
          log(`[RTC-AUDIO-AUDIT] Adding local video track to PC`)
          pc.addTrack(effectiveVideo, this.localStream)
        } catch (e) {
          console.error(`[RTC-AUDIO-AUDIT] Video addTrack failed:`, e)
        }
      }
    } else {
      const existingVideoSender = senders.find((s) => s.track?.kind === 'video')
      if (existingVideoSender) {
        log(`[RTC-AUDIO-AUDIT] Removing local video track from PC`)
        try {
          pc.removeTrack(existingVideoSender)
        } catch (e) {
          console.error(`[RTC-AUDIO-AUDIT] Video removeTrack failed:`, e)
        }
      }
    }

    // Process Audio (Mixed or direct)
    log(
      `[RTC-AUDIO-AUDIT] Syncing local audio track: mixedAudioTrack=${this.mixedAudioTrack ? `id=${this.mixedAudioTrack.id} enabled=${this.mixedAudioTrack.enabled} active=${this.mixedAudioTrack.active}` : 'none'}`
    )

    if (this.mixedAudioTrack) {
      const existingAudioSender = senders.find((s) => s.track?.kind === 'audio')
      if (existingAudioSender) {
        if (existingAudioSender.track?.id !== this.mixedAudioTrack.id) {
          log(`[RTC-AUDIO-AUDIT] Replacing audio track with: id=${this.mixedAudioTrack.id}`)
          existingAudioSender.replaceTrack(this.mixedAudioTrack).catch((e) => {
            console.error(`[RTC-AUDIO-AUDIT] Audio replaceTrack failed:`, e)
          })
        }
      } else {
        try {
          log(`[RTC-AUDIO-AUDIT] Adding local audio track to PC`)
          pc.addTrack(this.mixedAudioTrack, this.localStream)
        } catch (e) {
          console.error(`[RTC-AUDIO-AUDIT] Audio addTrack failed:`, e)
        }
      }
    }

    // Log transceivers overview
    log(`[RTC-AUDIO-AUDIT] PC Transceivers count: ${pc.getTransceivers().length}`)
    pc.getTransceivers().forEach((t, index) => {
      log(
        `[RTC-AUDIO-AUDIT] Transceiver #${index}: mid=${t.mid} direction=${t.direction} currentDirection=${t.currentDirection} senderTrackKind=${t.sender.track?.kind || 'none'} receiverTrackKind=${t.receiver.track?.kind || 'none'}`
      )
    })
  }

  async _createOffer(peerId, options = {}) {
    const pc = this._ensurePc(peerId)
    if (this.makingOffer.get(peerId)) return
    if (pc.signalingState !== 'stable') {
      this.diag(`skip offer ${peerId} state=${pc.signalingState}`)
      return
    }
    try {
      this.makingOffer.set(peerId, true)
      const offer = await pc.createOffer(options)
      // Re-check state after async gap (glare)
      if (pc.signalingState !== 'stable') {
        this.diag(`abort offer ${peerId} state changed to ${pc.signalingState}`)
        return
      }
      await pc.setLocalDescription(offer)
      this.diag(`offer → ${peerId}`)
      this.emitSignal(peerId, {
        type: 'offer',
        sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }
      })
    } catch (err) {
      this.diag(`createOffer failed ${peerId}`, err?.message)
    } finally {
      this.makingOffer.set(peerId, false)
    }
  }

  async _flushIce(peerId, pc) {
    const q = this.iceQueue.get(peerId) || []
    this.iceQueue.set(peerId, [])
    for (const c of q) {
      try {
        await pc.addIceCandidate(c)
      } catch (err) {
        this.diag(`flush ICE ${peerId}`, err?.message)
      }
    }
  }

  _scheduleReconnect(peerId) {
    if (this.reconnectTimers.has(peerId)) return
    const n = this.reconnectAttempts.get(peerId) || 0
    if (n >= 4) {
      this.diag(`give up reconnect ${peerId}`)
      return
    }
    this.reconnectAttempts.set(peerId, n + 1)
    const delay = Math.min(800 * 2 ** n, 8000)
    this.diag(`reconnect ${peerId} in ${delay}ms (#${n + 1})`)
    const timer = window.setTimeout(() => {
      this.reconnectTimers.delete(peerId)
      if (this.destroyed || !this.isPeerActive(peerId)) return

      const pc = this.pcs.get(peerId)
      if (pc) {
        if (typeof pc.restartIce === 'function') {
          pc.restartIce()
        }
        if (this.shouldOffer(peerId)) {
          this._createOffer(peerId, { iceRestart: true })
        }
      } else {
        this.connect(peerId)
      }
    }, delay)
    this.reconnectTimers.set(peerId, timer)
  }
}
