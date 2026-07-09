import { useState } from 'react'
import {
  Building2,
  Copy,
  Edit3,
  LogOut,
  MoreHorizontal,
  Pin,
  PinOff,
  Star,
  Trash2,
  UserPlus,
  Users
} from 'lucide-react'
import { DropdownItem, DropdownMenu } from './ui/Dropdown'

const formatDate = (value) => {
  if (!value) return 'Recently'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const getUserId = (user) => user?._id || user?.id
const getOwnerId = (workspace) => workspace?.owner?._id || workspace?.owner

export default function DashboardWorkspaceCard({
  workspace,
  user,
  pinned,
  favorite,
  onOpen,
  onRename,
  onTogglePin,
  onToggleFavorite,
  onCopyId,
  onInvite,
  onLeave,
  onDelete
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isOwner = getOwnerId(workspace)?.toString() === getUserId(user)?.toString()

  const handleMenuAction = (event, action) => {
    event.stopPropagation()
    setMenuOpen(false)
    action()
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(workspace)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen(workspace)
      }}
      className="group relative rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-sm transition duration-[180ms] ease-out hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-md"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#F5F3FF] text-[#7C3AED]">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-[#111827]">{workspace.name}</h3>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-[#6B7280]">
              Invite-only
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(event) => handleMenuAction(event, () => onToggleFavorite(workspace._id))}
            className={`rounded-xl p-2 transition duration-[180ms] hover:bg-[#F5F3FF] ${
              favorite ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'
            }`}
            aria-label={favorite ? 'Remove favorite' : 'Favorite workspace'}
          >
            <Star className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={(event) => handleMenuAction(event, () => onTogglePin(workspace._id))}
            className={`rounded-xl p-2 transition duration-[180ms] hover:bg-[#F5F3FF] ${
              pinned ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'
            }`}
            aria-label={pinned ? 'Unpin workspace' : 'Pin workspace'}
          >
            <Pin className="h-4 w-4" fill={pinned ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen((current) => !current)
            }}
            className="rounded-xl p-2 text-[#9CA3AF] transition duration-[180ms] hover:bg-[#F5F3FF] hover:text-[#7C3AED]"
            aria-label="Workspace actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mb-5 line-clamp-2 min-h-10 text-sm leading-6 text-[#6B7280]">
        {workspace.description || 'No description yet.'}
      </p>

      <div className="flex items-center justify-between gap-4 border-t border-[#F3F4F6] pt-4 text-xs font-medium text-[#6B7280]">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {(workspace.members || []).length} members
        </span>
        <span>Updated {formatDate(workspace.updatedAt)}</span>
      </div>

      {menuOpen && (
        <DropdownMenu className="top-14 z-20 w-56">
          <MenuButton label="Open" onClick={(event) => handleMenuAction(event, () => onOpen(workspace))} />
          {isOwner && (
            <MenuButton
              icon={Edit3}
              label="Rename"
              onClick={(event) => handleMenuAction(event, () => onRename(workspace))}
            />
          )}
          <MenuButton
            icon={pinned ? PinOff : Pin}
            label={pinned ? 'Unpin' : 'Pin'}
            onClick={(event) => handleMenuAction(event, () => onTogglePin(workspace._id))}
          />
          <MenuButton
            icon={Star}
            label={favorite ? 'Remove Favorite' : 'Favorite'}
            onClick={(event) => handleMenuAction(event, () => onToggleFavorite(workspace._id))}
          />
          <MenuButton
            icon={Copy}
            label="Copy Workspace ID"
            onClick={(event) => handleMenuAction(event, () => onCopyId(workspace._id))}
          />
          <MenuButton
            icon={UserPlus}
            label="Copy Invite Link"
            onClick={(event) => handleMenuAction(event, () => onInvite(workspace))}
          />
          <MenuButton
            icon={LogOut}
            label="Leave Workspace"
            onClick={(event) => handleMenuAction(event, () => onLeave(workspace))}
          />
          {isOwner && (
            <MenuButton
              icon={Trash2}
              label="Delete Workspace"
              danger
              onClick={(event) => handleMenuAction(event, () => onDelete(workspace))}
            />
          )}
        </DropdownMenu>
      )}
    </article>
  )
}

function MenuButton({ icon: Icon = Building2, label, danger = false, onClick }) {
  return (
    <DropdownItem icon={Icon} danger={danger} onClick={onClick}>
      {label}
    </DropdownItem>
  )
}
