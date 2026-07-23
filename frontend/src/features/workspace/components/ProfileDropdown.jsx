import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../hooks/useAuth'
import { useMeeting } from '../../../contexts/MeetingContext'
import Avatar from '../../../components/ui/Avatar'
import { DropdownItem, DropdownMenu } from '../../../components/ui/Dropdown'

const getDisplayName = (user) => {
  if (user?.fullName) return user.fullName
  if (user?.username) return user.username
  return user?.email?.split('@')[0] || 'User'
}

export default function ProfileDropdown({ onWorkspaceSettings, onLeaveWorkspace }) {
  const { user, logout } = useAuth()
  const { leaveMeeting } = useMeeting()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const displayName = getDisplayName(user)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const runAction = async (action) => {
    setOpen(false)
    try {
      await action?.()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleLogout = async () => {
    setOpen(false)
    try {
      leaveMeeting()
      await logout()
    } catch (error) {
      toast.error(error.message)
    } finally {
      sessionStorage.removeItem('teamora-google-auth-started')
      sessionStorage.removeItem('teamora-global-active-meeting')
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="cursor-pointer rounded-avatar focus:outline-none focus:ring-4 focus:ring-primary/20"
        title={displayName}
      >
        <Avatar
          label={displayName.charAt(0).toUpperCase()}
          src={user?.avatar}
          className="h-11 w-11 text-sm shadow-card"
        />
      </button>

      {open && (
        <DropdownMenu className="w-72 rounded-card p-3 shadow-dropdown bg-card-elevated border border-border animate-[teamora-content-fade_180ms_ease-out_both]">
          <div className="flex items-center gap-3 px-2 pb-3 pt-1">
            <Avatar label={displayName.charAt(0).toUpperCase()} src={user?.avatar} className="h-14 w-14 text-lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-text">{displayName}</p>
              <p className="mt-0.5 truncate text-xs font-medium text-muted">
                {user?.email || 'teamora.user@example.com'}
              </p>
            </div>
          </div>
          <div className="my-2 h-px bg-border" />

          <DropdownItem
            icon={Settings}
            onClick={() => runAction(() => navigate('/settings'))}
            className="rounded-button py-2.5"
          >
            Dashboard Settings
          </DropdownItem>

          {onWorkspaceSettings && (
            <DropdownItem
              icon={Settings}
              onClick={() => runAction(onWorkspaceSettings)}
              className="rounded-button py-2.5"
            >
              Workspace Settings
            </DropdownItem>
          )}
          {onLeaveWorkspace ? (
            <DropdownItem
              icon={LogOut}
              danger
              onClick={() => runAction(onLeaveWorkspace)}
              className="rounded-button py-2.5"
            >
              Leave Workspace
            </DropdownItem>
          ) : (
            <DropdownItem icon={LogOut} danger onClick={handleLogout} className="rounded-button py-2.5">
              Logout
            </DropdownItem>
          )}
        </DropdownMenu>
      )}
    </div>
  )
}
