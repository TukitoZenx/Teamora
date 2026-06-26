import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import useWebRTC from './useWebRTC';

export default function useScreenShare(socket, roomId, userName, myColor) {
  const [isSharing, setIsSharing] = useState(false);
  const [presenter, setPresenter] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const localStreamRef = useRef(null);
  const isSharingRef = useRef(false);

  // Hook up WebRTC signaling helper
  const {
    createPresenterPeerConnection,
    handleOffer,
    handleAnswer,
    handleNewIceCandidate,
    cleanupPresenterConnections,
    cleanupViewerConnection
  } = useWebRTC(socket, roomId, (stream) => {
    setRemoteStream(stream);
    setIsLoading(false);
    toast.success('Connection restored: Screen stream loaded!', { id: 'screen-stream-toast' });
  });

  const startSharing = async () => {
    if (presenter) {
      toast.error(`Only one presenter allowed. ${presenter.user} is currently sharing.`);
      return;
    }

    setIsLoading(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        toast.error('Screen sharing is not supported in this browser.');
        setIsLoading(false);
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15 }
        },
        audio: false
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsSharing(true);
      isSharingRef.current = true;

      // Handle user ending presentation from native browser bar
      stream.getVideoTracks()[0].onended = () => {
        stopSharing();
      };

      // Notify the room
      socket.emit('start-screen-share', { roomId, user: userName, color: myColor });
      toast.success('You are presenting your screen!');
    } catch (err) {
      console.error('Error getting display media:', err);
      toast.error('Failed to share screen or permission denied.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopSharing = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }
    
    setIsSharing(false);
    isSharingRef.current = false;
    cleanupPresenterConnections();
    
    socket.emit('stop-screen-share', { roomId });
    toast('Stopped screen sharing', { icon: '🛑' });
  };

  const forceStopShare = (presenterSocketId) => {
    socket.emit('host-stop-screen-share', { roomId, presenterSocketId });
  };

  useEffect(() => {
    // Handle loaded state when joining
    const handleLoadRoom = (roomState) => {
      if (roomState && roomState.activePresenter) {
        const pres = roomState.activePresenter;
        setPresenter(pres);
        if (pres.socketId !== socket.id) {
          setIsLoading(true);
          socket.emit('watch-screen', { roomId, presenterSocketId: pres.socketId });
        }
      }
    };
    socket.on('load-room', handleLoadRoom);

    // Presentation start
    socket.on('screen-share-started', ({ presenterSocketId, user, color }) => {
      setPresenter({ socketId: presenterSocketId, user, color });
      if (presenterSocketId !== socket.id) {
        setIsLoading(true);
        toast.success(`${user} started presenting screen!`, { icon: '📺' });
        socket.emit('watch-screen', { roomId, presenterSocketId });
      }
    });

    // Presentation end
    socket.on('screen-share-ended', ({ presenterSocketId, forced }) => {
      setPresenter(null);
      setRemoteStream(null);
      cleanupViewerConnection();
      setIsLoading(false);
      
      if (presenterSocketId === socket.id) {
        // If we were the presenter, make sure local stream stops
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
          setLocalStream(null);
          localStreamRef.current = null;
        }
        setIsSharing(false);
        isSharingRef.current = false;
      }
      
      if (forced) {
        toast.error('Presentation ended by the host.', { id: 'screen-end-toast' });
      } else {
        toast('Presentation ended', { icon: '🛑', id: 'screen-end-toast' });
      }
    });

    // WebRTC signaling
    socket.on('user-joined-presenter', async ({ viewerSocketId, viewerName }) => {
      if (isSharingRef.current && localStreamRef.current) {
        toast(`${viewerName || 'A collaborator'} joined presentation`, { icon: '👀' });
        await createPresenterPeerConnection(viewerSocketId, localStreamRef.current);
      }
    });

    socket.on('offer', async ({ senderSocketId, sdp }) => {
      await handleOffer(senderSocketId, sdp);
    });

    socket.on('answer', async ({ senderSocketId, sdp }) => {
      await handleAnswer(senderSocketId, sdp);
    });

    socket.on('ice-candidate', async ({ senderSocketId, candidate }) => {
      await handleNewIceCandidate(senderSocketId, candidate);
    });

    socket.on('screen-share-error', (errMsg) => {
      toast.error(errMsg);
      setIsLoading(false);
    });

    return () => {
      socket.off('load-room', handleLoadRoom);
      socket.off('screen-share-started');
      socket.off('screen-share-ended');
      socket.off('user-joined-presenter');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('screen-share-error');
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [socket, roomId, userName, myColor]);

  return {
    isSharing,
    presenter,
    localStream,
    remoteStream,
    isLoading,
    startSharing,
    stopSharing,
    forceStopShare
  };
}
