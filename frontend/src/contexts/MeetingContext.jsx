/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { clearStableMeetingClientId } from '../services/meetingSocket'

const MeetingContext = createContext(null)

export function useMeeting() {
  return useContext(MeetingContext)
}

const clearMeetingSession = (workspaceId) => {
  try {
    sessionStorage.removeItem('teamora-global-active-meeting')
    sessionStorage.removeItem('teamora-in-call')
    if (workspaceId) {
      sessionStorage.removeItem(`teamora-auto-join-meeting`)
      if (sessionStorage.getItem('teamora-auto-join-meeting') === workspaceId) {
        sessionStorage.removeItem('teamora-auto-join-meeting')
      }
      clearStableMeetingClientId(workspaceId)
    }
  } catch {
    // ignore
  }
}

export function MeetingProvider({ children }) {
  // --- STATE VARIABLES (THE COMPONENT'S MEMORY) ---
  // If we didn't store these in state, the video meeting would crash or disappear when you click to another page.
  const [inMeeting, setInMeeting] = useState(false)
  const [activeMeetingWorkspace, setActiveMeetingWorkspace] = useState(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [portalTarget, setPortalTarget] = useState(null)
  const [meetingEpoch, setMeetingEpoch] = useState(0)

  // --- RESTORING THE MEETING AFTER A PAGE REFRESH ---
  // Try to restore from sessionStorage on mount.
  // Why? If a user accidentally hits F5 (refresh) during a call, React deletes all State.
  // By saving it to sessionStorage, we can instantly rebuild the meeting without dropping the call.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('teamora-global-active-meeting')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && parsed._id) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setInMeeting(true)
          setActiveMeetingWorkspace(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // --- JOINING A MEETING ---
  // Called when you click the "Join Call" button. It turns the meeting ON and saves it to sessionStorage
  // so the browser remembers you are in a call even if you refresh.
  const joinMeeting = (workspace) => {
    setInMeeting(true)
    setActiveMeetingWorkspace(workspace)
    setIsMinimized(false)
    try {
      sessionStorage.setItem('teamora-global-active-meeting', JSON.stringify(workspace))
    } catch {
      // Ignore quota errors
    }
  }

  // --- LEAVING A MEETING ---
  // Cleans up all the state and removes the meeting from browser memory.
  // Meetings.jsx watches meetingEpoch / inMeeting and tears down media + signaling.
  const leaveMeeting = () => {
    const workspaceId = activeMeetingWorkspace?._id || activeMeetingWorkspace?.workspaceId
    setInMeeting(false)
    setActiveMeetingWorkspace(null)
    setIsMinimized(false)
    setMeetingEpoch((n) => n + 1)
    clearMeetingSession(workspaceId)
    try {
      window.dispatchEvent(new CustomEvent('teamora-leave-meeting', { detail: { workspaceId } }))
    } catch {
      // ignore
    }
  }

  const toggleMinimize = () => setIsMinimized((prev) => !prev)

  return (
    <MeetingContext.Provider
      value={{
        inMeeting,
        activeMeetingWorkspace,
        isMinimized,
        portalTarget,
        meetingEpoch,
        setPortalTarget,
        joinMeeting,
        leaveMeeting,
        toggleMinimize,
        setIsMinimized
      }}
    >
      {children}
    </MeetingContext.Provider>
  )
}
