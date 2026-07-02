import { useState } from 'react'
import { LayoutDashboard, LogOut, Settings, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../hooks/useAuth'
import Avatar from '../../../components/ui/Avatar'
import { DropdownItem, DropdownMenu } from '../../../components/ui/Dropdown'

const getDisplayName = (user) => {
  if (user?.fullName) return user.fullName
  if (user?.username) return user.username
  return user?.email?.split('@')[0] || 'User'
}

export default function ProfileDropdown({ onBackToDashboard, onSettings, onWorkspaceSettings, onLogout }) {
  const { user } = useAuth()
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="cursor-pointer rounded-full"
        title={displayName}
      >
        <Avatar label={displayName.charAt(0).toUpperCase()} />
      </button>

      {open && (
        <DropdownMenu className="w-60">
          <DropdownItem icon={Settings} onClick={() => runAction(onSettings)}>
            Settings
          </DropdownItem>
          <DropdownItem icon={SlidersHorizontal} onClick={() => runAction(onWorkspaceSettings)}>
            Workspace Settings
          </DropdownItem>
          <div className="my-1 h-px bg-[#E5E7EB]" />
          <DropdownItem icon={LayoutDashboard} onClick={() => runAction(onBackToDashboard)}>
            Back to Dashboard
          </DropdownItem>
          <div className="my-1 h-px bg-[#E5E7EB]" />
          <DropdownItem icon={LogOut} danger onClick={() => runAction(onLogout)}>
            Logout
          </DropdownItem>
        </DropdownMenu>
      )}
    </div>
  )
}
