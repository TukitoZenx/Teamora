/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

const MeetingContext = createContext(null)

export function useMeeting() {
  return useContext(MeetingContext)
}

export function MeetingProvider({ children }) {
  const [inMeeting, setInMeeting] = useState(false)
  const [activeMeetingWorkspace, setActiveMeetingWorkspace] = useState(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [portalTarget, setPortalTarget] = useState(null)

  // Try to restore from sessionStorage on mount
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

  const leaveMeeting = () => {
    setInMeeting(false)
    setActiveMeetingWorkspace(null)
    setIsMinimized(false)
    sessionStorage.removeItem('teamora-global-active-meeting')
  }

  const toggleMinimize = () => setIsMinimized((prev) => !prev)

  return (
    <MeetingContext.Provider
      value={{
        inMeeting,
        activeMeetingWorkspace,
        isMinimized,
        portalTarget,
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
