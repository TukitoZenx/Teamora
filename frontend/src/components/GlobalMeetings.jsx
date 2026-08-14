import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMeeting } from '../contexts/MeetingContext'
import { useAuth } from '../hooks/useAuth'
import useMeetingSignaling from '../hooks/useMeetingSignaling'
import Meetings from './Meetings'

export default function GlobalMeetings() {
  const { inMeeting, activeMeetingWorkspace, portalTarget, leaveMeeting } = useMeeting()
  const { user, authenticated } = useAuth()
  const location = useLocation()

  const match = location.pathname.match(/\/workspace\/([^/]+)\/meetings/)
  const currentWorkspaceId = match ? match[1] : null
  const workspaceId = activeMeetingWorkspace?._id || activeMeetingWorkspace?.workspaceId || currentWorkspaceId
  const userName = user?.fullName || user?.username || user?.email || 'User'
  const userId = user?._id || user?.id || ''

  const isMaximized = Boolean(workspaceId) && location.pathname === `/workspace/${workspaceId}/meetings`
  // Never keep meeting media/signaling up when logged out.
  const shouldConnect = authenticated && (inMeeting || isMaximized) && workspaceId
  const socket = useMeetingSignaling(shouldConnect ? workspaceId : null, userName, userId)

  useEffect(() => {
    if (!authenticated && inMeeting) {
      leaveMeeting()
    }
  }, [authenticated, inMeeting, leaveMeeting])

  const [delayedRender, setDelayedRender] = useState(false)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (shouldConnect) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDelayedRender(true)
    } else {
      const timer = setTimeout(() => setDelayedRender(false), 500)
      return () => clearTimeout(timer)
    }
  }, [shouldConnect])

  // Track the target bounds dynamically when maximized
  useEffect(() => {
    if (!isMaximized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRect(null)
      return undefined
    }

    const updateRect = () => {
      const el = document.getElementById('global-meeting-portal-target')
      if (el) {
        setRect(el.getBoundingClientRect())
      }
    }

    updateRect()

    // Set up MutationObserver / ResizeObserver to track layout changes
    const observer = new ResizeObserver(updateRect)
    const el = document.getElementById('global-meeting-portal-target')
    if (el) {
      observer.observe(el)
    }

    window.addEventListener('resize', updateRect)
    // Use capture phase for scroll listener to track all scroll events
    window.addEventListener('scroll', updateRect, true)

    // Re-check periodically just in case layout shifts without triggering events
    const interval = setInterval(updateRect, 500)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
      clearInterval(interval)
    }
  }, [isMaximized, portalTarget])

  if (!delayedRender || !workspaceId) {
    return null
  }

  // Transition state: maximized page is loaded but DOM target hasn't been measured yet
  const isTransitioning = isMaximized && !rect

  const style = isMaximized
    ? {
        position: 'fixed',
        left: rect?.left || 0,
        top: rect?.top || 0,
        width: rect?.width || 0,
        height: rect?.height || 0,
        zIndex: 20,
        display: isTransitioning ? 'none' : 'block'
      }
    : {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none'
      }

  return (
    <div style={style}>
      <Meetings socket={socket} roomId={workspaceId} userName={userName} isMaximized={isMaximized} />
    </div>
  )
}
