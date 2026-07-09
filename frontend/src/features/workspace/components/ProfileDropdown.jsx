import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../hooks/useAuth'
import Avatar from '../../../components/ui/Avatar'
import { DropdownItem, DropdownMenu } from '../../../components/ui/Dropdown'

const getDisplayName = (user) => {
  if (user?.fullName) return user.fullName
  if (user?.username) return user.username
  return user?.email?.split('@')[0] || 'User'
}

export default function ProfileDropdown({ onWorkspaceSettings, onLeaveWorkspace }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const displayName = getDisplayName(user)

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
      await logout()
    } catch (error) {
      toast.error(error.message)
    } finally {
      sessionStorage.removeItem('teamora-google-auth-started')
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="cursor-pointer rounded-full focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/15"
        title={displayName}
      >
        <Avatar
          label={displayName.charAt(0).toUpperCase()}
          src={user?.avatar}
          className="h-11 w-11 text-sm shadow-[0_10px_24px_rgba(124,58,237,0.16)]"
        />
      </button>

      {open && (
        <DropdownMenu className="w-72 rounded-[20px] p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)] animate-[teamora-content-fade_180ms_ease-out_both]">
          <div className="flex items-center gap-3 px-2 pb-3 pt-1">
            <Avatar label={displayName.charAt(0).toUpperCase()} src={user?.avatar} className="h-14 w-14 text-lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-[#111827]">{displayName}</p>
              <p className="mt-0.5 truncate text-xs font-medium text-[#6B7280]">
                {user?.email || 'teamora.user@example.com'}
              </p>
            </div>
          </div>
          <div className="my-2 h-px bg-[#E5E7EB]" />
          <DropdownItem
            icon={Settings}
            onClick={() => runAction(onWorkspaceSettings)}
            className="rounded-[14px] py-2.5"
          >
            Workspace Settings
          </DropdownItem>
          <DropdownItem
            icon={LogOut}
            danger
            onClick={() => runAction(onLeaveWorkspace)}
            className="rounded-[14px] py-2.5"
          >
            Leave Workspace
          </DropdownItem>
          <DropdownItem icon={LogOut} danger onClick={handleLogout} className="rounded-[14px] py-2.5">
            Logout
          </DropdownItem>
        </DropdownMenu>
      )}
    </div>
  )
}
