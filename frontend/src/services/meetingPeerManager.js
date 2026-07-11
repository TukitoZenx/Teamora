/**
 * Production-oriented WebRTC mesh peer manager for Teamora meetings.
 * - Deterministic offerer (lexicographic peer id) to avoid glare
 * - Perfect negotiation (polite peer rollback)
 * - ICE candidate queue until remote description is set
 * - Track add/replace, reconnect with backoff
 * - Verbose diagnostics for debugging
 */
import { getMeetingRtcConfiguration } from './webrtcIce'

const log = (...args) => console.info('[meeting-rtc]', ...args)

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
    this.screenTrack = null
    this.destroyed = false
  }

  diag(msg, extra) {
    const line = extra !== undefined ? `${msg} ${JSON.stringify(extra)}` : msg
    log(line)
    this.onDiag(line)
  }

  shouldOffer(remoteId) {
    return String(this.selfId) > String(remoteId)
  }

  setLocalStream(stream) {
    this.localStream = stream
    this.pcs.forEach((pc, peerId) => {
      this._syncLocalTracks(pc, peerId)
    })
  }

  setScreenTrack(track) {
    this.screenTrack = track || null
    this.pcs.forEach((pc) => {
      this._applyVideoTrack(pc, track || this.localStream?.getVideoTracks()?.[0] || null)
    })
  }

  connect(peerId) {
    if (this.destroyed || !peerId || peerId === this.selfId) return
    this._ensurePc(peerId)
    if (this.shouldOffer(peerId)) {
      this._createOffer(peerId)
    } else {
      this.diag(`awaiting offer from ${peerId}`)
    }
  }

  async handleSignal(fromId, signal) {
    if (this.destroyed || !fromId || fromId === this.selfId || !signal?.type) return

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
        if (offerCollision && !polite) {
          this.diag(`glare ignore offer from ${fromId}`)
          return
        }
        if (offerCollision && polite) {
          try {
            await pc.setLocalDescription({ type: 'rollback' })
          } catch {
            // ignore — some browsers don't support rollback
          }
        }
        const desc = toSessionDesc(signal.sdp)
        if (!desc?.sdp) {
          this.diag(`empty offer SDP from ${fromId}`)
          return
        }
        await pc.setRemoteDescription(desc)
        await this._flushIce(fromId, pc)
        const answer = await pc.createAnswer()
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
          return
        }
        const desc = toSessionDesc(signal.sdp)
        if (!desc?.sdp) {
          this.diag(`empty answer SDP from ${fromId}`)
          return
        }
        await pc.setRemoteDescription(desc)
        await this._flushIce(fromId, pc)
        this.diag(`answer applied ${fromId}`)
        return
      }

      if (signal.type === 'candidate' && signal.candidate) {
        const init = toIceInit(signal.candidate)
        if (!init?.candidate && init?.candidate !== '') {
          // end-of-candidates may have empty string; skip nulls only
          if (init.candidate == null) return
        }
        if (!pc.remoteDescription) {
          const q = this.iceQueue.get(fromId) || []
          q.push(init)
          this.iceQueue.set(fromId, q)
          this.diag(`ICE queued ${fromId} (${q.length})`)
          return
        }
        await pc.addIceCandidate(init)
        return
      }
    } catch (err) {
      this.diag(`handleSignal error ${signal.type} from ${fromId}`, err?.message || String(err))
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
    this.screenTrack = null
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
      screenSharing: Boolean(this.screenTrack),
      iceServers: getMeetingRtcConfiguration().iceServers?.length || 0
    }
  }

  _ensurePc(peerId) {
    let pc = this.pcs.get(peerId)
    if (pc && (pc.connectionState === 'closed' || pc.signalingState === 'closed')) {
      this.removePeer(peerId)
      pc = null
    }
    if (pc) return pc

    this.diag(`create PC ${this.selfId} ↔ ${peerId}`)
    pc = new RTCPeerConnection(getMeetingRtcConfiguration())
    this.iceQueue.set(peerId, [])
    this.pcs.set(peerId, pc)

    pc.onicecandidate = (e) => {
      if (!e.candidate) return
      this.emitSignal(peerId, { type: 'candidate', candidate: toIceInit(e.candidate) })
    }

    pc.oniceconnectionstatechange = () => {
      this.diag(`ICE ${peerId}: ${pc.iceConnectionState}`)
      this.onPeerState(peerId, pc.iceConnectionState)
    }

    pc.onconnectionstatechange = () => {
      this.diag(`PC ${peerId}: ${pc.connectionState}`)
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

    pc.ontrack = (e) => {
      this.diag(`ontrack ${peerId} ${e.track?.kind}`)
      let stream = e.streams?.[0]
      if (!stream) {
        stream = this.remoteStreams.get(peerId) || new MediaStream()
        if (!stream.getTracks().some((t) => t.id === e.track.id)) {
          stream.addTrack(e.track)
        }
      } else {
        const existing = this.remoteStreams.get(peerId)
        if (existing && existing !== stream) {
          stream.getTracks().forEach((t) => {
            if (!existing.getTracks().some((x) => x.id === t.id)) existing.addTrack(t)
          })
          stream = existing
        }
      }
      e.track.onended = () => {
        this.diag(`remote track ended ${peerId} ${e.track.kind}`)
      }
      this.remoteStreams.set(peerId, stream)
      this.onRemoteStream(peerId, stream)
    }

    this._syncLocalTracks(pc, peerId)
    return pc
  }

  _applyVideoTrack(pc, track) {
    if (!track) return
    const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video')
    if (videoSender) {
      videoSender.replaceTrack(track).catch((e) => this.diag('replaceTrack video failed', e?.message))
      return
    }
    // No video sender yet — add if we have a stream container
    if (this.localStream) {
      try {
        pc.addTrack(track, this.localStream)
      } catch (err) {
        this.diag('addTrack video failed', err?.message)
      }
    }
  }

  _syncLocalTracks(pc, peerId) {
    if (!this.localStream) return
    const senders = pc.getSenders()
    this.localStream.getTracks().forEach((track) => {
      // Prefer screen track for video when sharing
      const effective = track.kind === 'video' && this.screenTrack ? this.screenTrack : track
      const existing = senders.find((s) => s.track?.kind === track.kind)
      if (existing) {
        if (existing.track?.id !== effective.id) {
          existing.replaceTrack(effective).catch(() => {})
        }
      } else {
        try {
          pc.addTrack(effective, this.localStream)
        } catch (err) {
          this.diag(`addTrack ${track.kind} → ${peerId} failed`, err?.message)
        }
      }
    })
  }

  async _createOffer(peerId) {
    const pc = this._ensurePc(peerId)
    if (this.makingOffer.get(peerId)) return
    if (pc.signalingState !== 'stable') {
      this.diag(`skip offer ${peerId} state=${pc.signalingState}`)
      return
    }
    try {
      this.makingOffer.set(peerId, true)
      const offer = await pc.createOffer()
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
      try {
        const old = this.pcs.get(peerId)
        if (old) {
          old.onicecandidate = null
          old.ontrack = null
          old.onconnectionstatechange = null
          old.oniceconnectionstatechange = null
          old.close()
        }
      } catch {
        // ignore
      }
      this.pcs.delete(peerId)
      this.iceQueue.delete(peerId)
      this.makingOffer.delete(peerId)
      this.connect(peerId)
    }, delay)
    this.reconnectTimers.set(peerId, timer)
  }
}
