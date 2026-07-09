import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import Avatar from './ui/Avatar'
import { DropdownItem, DropdownMenu } from './ui/Dropdown'

const getDisplayName = (user) => {
  if (user?.fullName) return user.fullName
  if (user?.username) return user.username
  return user?.email?.split('@')[0] || 'User'
}

export default function ProfileDropdown() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const displayName = getDisplayName(user)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      toast.error(error.message)
    } finally {
      sessionStorage.removeItem('teamora-google-auth-started')
      navigate('/', { replace: true })
    }
  }

  const openSettings = () => {
    setOpen(false)
    navigate('/settings')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="cursor-pointer rounded-full"
        title={displayName}
      >
        <Avatar label={displayName.charAt(0).toUpperCase()} src={user?.avatar} />
      </button>

      {open && (
        <DropdownMenu>
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-[#111827]">{displayName}</p>
            <p className="truncate text-xs text-[#6B7280]">{user?.email || 'Signed in'}</p>
          </div>
          <DropdownItem icon={Settings} onClick={openSettings}>
            Settings
          </DropdownItem>
          <div className="my-1 h-px bg-[#E5E7EB]" />
          <DropdownItem danger onClick={handleLogout}>
            Logout
          </DropdownItem>
        </DropdownMenu>
      )}
    </div>
  )
}
