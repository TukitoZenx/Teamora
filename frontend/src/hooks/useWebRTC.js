import { useEffect, useRef } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function useWebRTC(socket, roomId, onRemoteStream) {
  // Store peer connections for presenter (multiple viewers)
  const peerConnectionsRef = useRef({});
  // Store single peer connection for viewer (presenter connection)
  const viewerConnectionRef = useRef(null);

  // Clean up all presenter peer connections
  const cleanupPresenterConnections = () => {
    Object.keys(peerConnectionsRef.current).forEach((socketId) => {
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
      }
    });
    peerConnectionsRef.current = {};
  };

  // Clean up viewer peer connection
  const cleanupViewerConnection = () => {
    if (viewerConnectionRef.current) {
      viewerConnectionRef.current.close();
      viewerConnectionRef.current = null;
    }
  };

  // Create connection for a viewer (as Presenter)
  const createPresenterPeerConnection = async (viewerSocketId, localStream) => {
    if (peerConnectionsRef.current[viewerSocketId]) {
      peerConnectionsRef.current[viewerSocketId].close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[viewerSocketId] = pc;

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { 
          targetSocketId: viewerSocketId, 
          candidate: event.candidate 
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        pc.close();
        delete peerConnectionsRef.current[viewerSocketId];
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { targetSocketId: viewerSocketId, sdp: offer });
    } catch (err) {
      console.error('Failed to create RTC offer:', err);
    }
  };

  // Handle incoming offer (as Viewer)
  const handleOffer = async (senderSocketId, sdp) => {
    cleanupViewerConnection();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    viewerConnectionRef.current = pc;

    // Handle remote track arrival
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0] && onRemoteStream) {
        onRemoteStream(event.streams[0]);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { 
          targetSocketId: senderSocketId, 
          candidate: event.candidate 
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupViewerConnection();
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { targetSocketId: senderSocketId, sdp: answer });
    } catch (err) {
      console.error('Failed to handle RTC offer/answer:', err);
    }
  };

  // Handle incoming answer (as Presenter)
  const handleAnswer = async (senderSocketId, sdp) => {
    const pc = peerConnectionsRef.current[senderSocketId];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Failed to set remote answer:', err);
      }
    }
  };

  // Handle incoming ICE candidate (both directions)
  const handleNewIceCandidate = async (senderSocketId, candidate) => {
    // Check if we are the presenter (so we have a list of connections)
    const pc = peerConnectionsRef.current[senderSocketId] || viewerConnectionRef.current;
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    }
  };

  // Clean up all connections on unmount
  useEffect(() => {
    return () => {
      cleanupPresenterConnections();
      cleanupViewerConnection();
    };
  }, []);

  return {
    createPresenterPeerConnection,
    handleOffer,
    handleAnswer,
    handleNewIceCandidate,
    cleanupPresenterConnections,
    cleanupViewerConnection
  };
}
