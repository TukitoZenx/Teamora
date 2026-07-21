import { useEffect, useRef } from 'react'
import { useMeeting } from '../../contexts/MeetingContext'

export default function MeetingsSection() {
  const { setPortalTarget } = useMeeting()
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      setPortalTarget(ref.current)
    }
    return () => setPortalTarget(null)
  }, [setPortalTarget])

  return <div ref={ref} id="global-meeting-portal-target" className="w-full h-full min-h-[500px]" />
}
