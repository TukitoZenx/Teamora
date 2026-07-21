import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Clock3,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  Search,
  Star,
  Trash2,
  UserPlus,
  Users,
  X,
  ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import WorkspaceLeaveDialog from './WorkspaceLeaveDialog'
import WorkspaceDeleteDialog from './WorkspaceDeleteDialog'
import WorkspaceModal from './WorkspaceModal'
import ConfirmDialog from './ConfirmDialog'
import Button from './ui/Button'
import { DropdownItem, DropdownMenu } from './ui/Dropdown'

const tabs = ['Recent', 'Pinned', 'Favorites', 'History']
const sortOptions = [
  ['lastOpened', 'Last Opened'],
  ['alphabetical', 'Alphabetical'],
  ['newest', 'Newest']
]
const subtitles = [
  'Welcome back to Teamora.',
  'Ready to collaborate?',
  "Let's build something amazing today.",
  'Continue where you left off.',
  'Your workspace is waiting.'
]

const statusStyles = {
  active: {
    label: 'Active',
    className: 'border-success/30 bg-success/10 text-success'
  },
  pending: {
    label: 'Pending',
    className: 'border-warning/30 bg-warning/10 text-warning'
  },
  previously_joined: {
    label: 'Previously Joined',
    className: 'border-border bg-muted/10 text-muted'
  },
  removed: {
    label: 'Removed',
    className: 'border-danger/30 bg-danger/10 text-danger'
  },
  trashed: {
    label: 'Trash',
    className: 'border-border bg-muted/20 text-muted'
  }
}

const readStoredIds = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

const readOpenedMap = () => {
  try {
    return JSON.parse(localStorage.getItem('teamora-opened-workspaces') || '{}')
  } catch {
    return {}
  }
}

const getEntityId = (entity) => entity?._id || entity
const getUserId = (user) => user?._id || user?.id
const getOwnerId = (workspace) => getEntityId(workspace?.owner)
const getDisplayName = (user) => user?.fullName || user?.username || user?.email || 'Teamora user'
const isOwnedBy = (workspace, user) => getOwnerId(workspace)?.toString() === getUserId(user)?.toString()

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

const formatDate = () => new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

const formatRelativeTime = (value) => {
  if (!value) return 'Recently'

  const then = new Date(value).getTime()
  const diff = Math.max(0, Date.now() - then)
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Dashboard({
  user,
  workspaces,
  recentWorkspaces = [],
  loading = false,
  authNotice,
  onCreateWorkspace,
  onJoinWorkspace,
  onOpenWorkspace,
  onUpdateWorkspace,
  onLeaveWorkspace,
  onRemoveRecentWorkspace,
  onDeleteWorkspace
}) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Recent')
  const [sortBy, setSortBy] = useState('lastOpened')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef(null)
  const [modalMode, setModalMode] = useState(null)
  const [pinnedIds, setPinnedIds] = useState(() => readStoredIds('teamora-pinned-workspaces'))
  const [favoriteIds, setFavoriteIds] = useState(() => readStoredIds('teamora-favorite-workspaces'))
  const [openedMap, setOpenedMap] = useState(readOpenedMap)
  const [leaveWorkspace, setLeaveWorkspace] = useState(null)
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null)
  const [workspaceToRemove, setWorkspaceToRemove] = useState(null)
  const firstName = (user?.fullName || user?.username || user?.email?.split('@')[0] || 'there').split(' ')[0]
  const subtitle = useMemo(() => subtitles[(getUserId(user) || firstName).length % subtitles.length], [firstName, user])

  const workspaceItems = useMemo(() => {
    const byId = new Map()

    recentWorkspaces.forEach((workspace) => {
      const id = workspace.workspaceId || workspace._id
      if (!id) return

      byId.set(id, {
        ...workspace,
        _id: id,
        workspaceId: id,
        ownerName: workspace.ownerName || getDisplayName(workspace.owner),
        memberCount: workspace.memberCount || workspace.members?.length || 0,
        status: workspace.status || 'previously_joined',
        canOpen: Boolean(workspace.canOpen),
        lastOpenedAt:
          openedMap[id] || workspace.lastSeenAt || workspace.updatedAt || workspace.leftAt || workspace.requestedAt
      })
    })

    workspaces.forEach((workspace) => {
      const id = workspace._id
      byId.set(id, {
        ...byId.get(id),
        ...workspace,
        _id: id,
        workspaceId: id,
        ownerName: getDisplayName(workspace.owner),
        memberCount: workspace.members?.length || 0,
        status: 'active',
        canOpen: true,
        inviteLink: workspace.inviteLink,
        inviteCode: workspace.inviteCode,
        lastOpenedAt: openedMap[id] || workspace.updatedAt || workspace.createdAt
      })
    })

    return Array.from(byId.values()).filter((workspace) => workspace.name)
  }, [openedMap, recentWorkspaces, workspaces])

  const visibleWorkspaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const items = workspaceItems
      .filter((workspace) => {
        if (activeTab === 'Pinned' && !pinnedIds.includes(workspace.workspaceId)) return false
        if (activeTab === 'Favorites' && !favoriteIds.includes(workspace.workspaceId)) return false
        if (activeTab === 'History' && workspace.status === 'active') return false
        return true
      })
      .filter((workspace) => {
        if (!normalizedQuery) return true
        return (
          workspace.name?.toLowerCase().includes(normalizedQuery) ||
          workspace.ownerName?.toLowerCase().includes(normalizedQuery)
        )
      })
      .sort((a, b) => {
        if (sortBy === 'alphabetical') return (a.name || '').localeCompare(b.name || '')
        if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        return new Date(b.lastOpenedAt || 0) - new Date(a.lastOpenedAt || 0)
      })

    if (activeTab === 'Recent') {
      return items.slice(0, 6)
    }
    return items
  }, [activeTab, favoriteIds, pinnedIds, query, sortBy, workspaceItems])

  useEffect(() => {
    if (!sortOpen) return
    const handleOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [sortOpen])

  const toggleStoredId = (id, key, setter) => {
    setter((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }

  const openWorkspace = (workspace) => {
    const id = workspace.workspaceId || workspace._id
    if (!id) {
      toast.error('Workspace is unavailable.')
      return
    }

    // Trashed / removed workspaces cannot be opened — prevent 404 spam.
    if (workspace.status === 'trashed' || workspace.status === 'removed') {
      toast.error(
        workspace.status === 'trashed'
          ? 'This workspace is in trash. Remove it from history or restore access first.'
          : 'You no longer have access to this workspace.'
      )
      return
    }

    if (!workspace.canOpen && workspace.status !== 'active') {
      toast.error('You do not have access to open this workspace yet.')
      return
    }

    const nextMap = {
      ...openedMap,
      [id]:
        openedMap[id] ||
        workspace.lastOpenedAt ||
        workspace.updatedAt ||
        workspace.createdAt ||
        new Date().toISOString()
    }
    setOpenedMap(nextMap)
    localStorage.setItem('teamora-opened-workspaces', JSON.stringify(nextMap))
    onOpenWorkspace(id)
  }

  const joinWorkspace = async (workspace) => {
    if (workspace.status === 'trashed') {
      toast.error('This workspace has been deleted and cannot be joined.')
      return
    }

    const invite = workspace.inviteLink || workspace.inviteCode
    if (!invite) {
      toast.error('No invite code is available for this workspace.')
      return
    }

    try {
      const joinedWorkspace = await onJoinWorkspace(invite)
      if (joinedWorkspace?._id) {
        openWorkspace({ ...joinedWorkspace, workspaceId: joinedWorkspace._id, canOpen: true, status: 'active' })
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const renameWorkspace = async (workspace) => {
    const nextName = window.prompt('Rename workspace', workspace.name)
    if (!nextName || nextName.trim() === workspace.name) return

    try {
      await onUpdateWorkspace(workspace.workspaceId, { name: nextName.trim() })
    } catch (error) {
      toast.error(error.message)
    }
  }

  const deleteWorkspace = async (workspace) => {
    // Already-archived (trash) workspaces cannot be deleted again via API —
    // remove them from history instead so the dashboard stays clean.
    if (workspace.status === 'trashed') {
      setWorkspaceToRemove(workspace)
      return
    }

    setWorkspaceToDelete(workspace)
  }

  const handleDelete = async () => {
    if (!workspaceToDelete) return
    try {
      await onDeleteWorkspace(workspaceToDelete.workspaceId)
      setWorkspaceToDelete(null)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleRemove = async () => {
    if (!workspaceToRemove) return
    try {
      await onRemoveRecentWorkspace?.(workspaceToRemove.workspaceId)
      setWorkspaceToRemove(null)
      toast.success('Removed from history.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const leaveWorkspaceRequest = async (workspace) => {
    if (!isOwnedBy(workspace, user)) {
      setLeaveWorkspace(workspace)
      return
    }

    try {
      await onLeaveWorkspace(workspace.workspaceId)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleLeave = async () => {
    try {
      await onLeaveWorkspace(leaveWorkspace.workspaceId)
      setLeaveWorkspace(null)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const clearQuery = () => setQuery('')
  const hasNoWorkspaces = visibleWorkspaces.length === 0
  const showSkeletons = loading && hasNoWorkspaces

  return (
    <main className="mx-auto flex h-[calc(100vh-var(--tw-navbar-height))] max-w-7xl flex-col px-5 py-6 overflow-hidden">
      {authNotice && (
        <div className="mb-5 shrink-0 rounded-card border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
          {authNotice}
        </div>
      )}

      <section className="shrink-0 mb-6 flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-medium text-muted">
          <CalendarDays className="h-4 w-4 text-primary" />
          {formatDate()}
        </div>
      </section>

      <section className="shrink-0 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="group relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition group-focus-within:text-primary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workspaces..."
              className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-24 text-sm text-text outline-none transition duration-normal placeholder:text-muted/65 hover:border-primary focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            {query && (
              <button
                type="button"
                onClick={clearQuery}
                className="absolute right-16 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-muted transition hover:bg-primary/10 hover:text-primary"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg border border-border bg-card-sunken px-2 py-1 text-[11px] font-semibold text-muted">
              Ctrl K
            </kbd>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-12 border-primary text-primary hover:bg-primary hover:text-on-primary px-5"
            onClick={() => setModalMode('join')}
          >
            <UserPlus className="h-4 w-4" />
            Join Workspace
          </Button>
          <Button type="button" className="h-12 px-5" onClick={() => setModalMode('create')}>
            <Plus className="h-4 w-4" />
            Create Workspace
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative rounded-full px-4 py-2 text-sm font-semibold transition duration-normal ${
                  activeTab === tab
                    ? 'bg-primary text-on-primary'
                    : 'bg-card text-muted ring-1 ring-border hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute -bottom-[13px] left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>

          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="flex h-12 w-full items-center justify-between rounded-button border border-border bg-card px-4 text-sm font-semibold text-muted md:w-56 transition-colors hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <span>Sort</span>
              <div className="flex items-center gap-1.5 text-text">
                <span>{sortOptions.find((o) => o[0] === sortBy)?.[1]}</span>
                <ChevronDown className="h-4 w-4 text-muted" />
              </div>
            </button>

            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 w-full md:w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-modal z-20 animate-[teamora-content-fade_180ms_ease-out_both]">
                <div className="flex flex-col py-1">
                  {sortOptions.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSortBy(value)
                        setSortOpen(false)
                      }}
                      className={`flex w-full items-center px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-primary/10 ${
                        sortBy === value ? 'bg-primary/5 text-primary' : 'text-text'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="teamora-content-fade mt-6 flex-1 overflow-y-auto min-h-0 pb-6 pr-1 -mr-1">
        {showSkeletons ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <WorkspaceCardSkeleton key={index} />
            ))}
          </div>
        ) : hasNoWorkspaces ? (
          <DashboardEmptyState onCreate={() => setModalMode('create')} onJoin={() => setModalMode('join')} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleWorkspaces.map((workspace) => (
              <WorkspaceLauncherCard
                key={workspace.workspaceId}
                workspace={workspace}
                pinned={pinnedIds.includes(workspace.workspaceId)}
                favorite={favoriteIds.includes(workspace.workspaceId)}
                isOwner={isOwnedBy(workspace, user)}
                onOpen={() => openWorkspace(workspace)}
                onJoin={() => joinWorkspace(workspace)}
                onPin={() => toggleStoredId(workspace.workspaceId, 'teamora-pinned-workspaces', setPinnedIds)}
                onFavorite={() => toggleStoredId(workspace.workspaceId, 'teamora-favorite-workspaces', setFavoriteIds)}
                onRename={() => renameWorkspace(workspace)}
                onLeave={() => leaveWorkspaceRequest(workspace)}
                onDelete={() => deleteWorkspace(workspace)}
                onRemove={() => setWorkspaceToRemove(workspace)}
              />
            ))}
          </div>
        )}
      </section>

      {modalMode && (
        <WorkspaceModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onCreateWorkspace={onCreateWorkspace}
          onJoinWorkspace={onJoinWorkspace}
        />
      )}

      {leaveWorkspace && <WorkspaceLeaveDialog onCancel={() => setLeaveWorkspace(null)} onLeave={handleLeave} />}
      {workspaceToDelete && <WorkspaceDeleteDialog workspace={workspaceToDelete} onCancel={() => setWorkspaceToDelete(null)} onDelete={handleDelete} />}
      {workspaceToRemove && (
        <ConfirmDialog
          title="Remove from History?"
          description={`Are you sure you want to remove "${workspaceToRemove?.name}" from your recent workspaces?`}
          confirmLabel="Remove"
          danger
          onCancel={() => setWorkspaceToRemove(null)}
          onConfirm={handleRemove}
        />
      )}
    </main>
  )
}

function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton-shimmer ${className}`} />
}

function WorkspaceCardSkeleton() {
  return (
    <article className="rounded-card border border-border bg-card p-5 shadow-card">
      <div className="mb-5 flex items-start gap-3">
        <SkeletonBlock className="h-12 w-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-5 w-3/4" />
          <SkeletonBlock className="mt-3 h-4 w-1/2" />
        </div>
      </div>
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="mt-3 h-4 w-44" />
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <SkeletonBlock className="h-7 w-24 rounded-full" />
        <SkeletonBlock className="h-10 w-24" />
      </div>
    </article>
  )
}

function WorkspaceLauncherCard({
  workspace,
  pinned,
  favorite,
  isOwner,
  onOpen,
  onJoin,
  onPin,
  onFavorite,
  onRename,
  onLeave,
  onDelete,
  onRemove
}) {
  const status = statusStyles[workspace.status] || statusStyles.previously_joined
  const isActive = workspace.status === 'active'
  const isPending = workspace.status === 'pending'
  const isTrashed = workspace.status === 'trashed'
  const canRemoveFromHistory = !isActive
  const handleCardActivate = () => {
    if (isPending || isTrashed) return
    if (isActive) onOpen()
    else onJoin()
  }

  const handleDeleteAction = (event) => {
    event.stopPropagation()
    if (isOwner && isActive) {
      onDelete()
    } else if (isActive) {
      onLeave()
    } else if (canRemoveFromHistory) {
      onRemove()
    }
  }

  return (
    <article
      role={isPending || isTrashed ? 'article' : 'button'}
      tabIndex={isPending || isTrashed ? undefined : 0}
      onClick={handleCardActivate}
      onKeyDown={
        isPending || isTrashed
          ? undefined
          : (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleCardActivate()
              }
            }
      }
      className={`group relative rounded-card border border-border bg-card p-5 shadow-card transition duration-normal ease-standard hover:border-primary outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${isPending || isTrashed ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-text">{workspace.name}</h3>
            <p className="mt-1 truncate text-sm text-muted">by {workspace.ownerName || 'Teamora user'}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconAction
            active={favorite}
            label={favorite ? 'Remove favorite' : 'Favorite workspace'}
            onClick={onFavorite}
          >
            <Star className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} />
          </IconAction>
          <IconAction active={pinned} label={pinned ? 'Unpin workspace' : 'Pin workspace'} onClick={onPin}>
            {pinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" fill={pinned ? 'currentColor' : 'none'} />
            )}
          </IconAction>
          <button
            type="button"
            onClick={handleDeleteAction}
            className="rounded-xl p-2 text-muted transition duration-normal hover:bg-danger/10 hover:text-danger"
            aria-label="Delete Workspace"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 text-sm text-muted">
        <p className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted/65" />
          {workspace.memberCount || 0} Members
        </p>
        <p className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-muted/65" />
          Last opened {formatRelativeTime(workspace.lastOpenedAt)}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
        >
          {status.label}
        </span>

        {isActive ? (
          <Button
            type="button"
            className="h-10 px-4"
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
          >
            Open
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : isPending ? (
          <Button type="button" variant="secondary" className="h-10 px-4" disabled>
            Pending Approval
          </Button>
        ) : !isTrashed ? (
          <Button
            type="button"
            variant="secondary"
            className="h-10 px-4 border-primary text-primary hover:bg-primary hover:text-on-primary"
            onClick={(e) => {
              e.stopPropagation()
              onJoin()
            }}
          >
            Join
            <UserPlus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

    </article>
  )
}

function IconAction({ active, label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={`rounded-xl p-2 transition duration-normal hover:bg-primary/10 ${active ? 'text-primary' : 'text-muted'}`}
      aria-label={label}
    >
      {children}
    </button>
  )
}

function DashboardEmptyState({ onCreate, onJoin }) {
  return (
    <section className="mx-auto flex min-h-[380px] max-w-xl flex-col items-center justify-center rounded-card border border-dashed border-border bg-card p-10 text-center shadow-card">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-card bg-primary/10 text-primary">
        <Building2 className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-text">No Workspaces Found</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
        Create a new workspace or join one using an invitation.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button type="button" onClick={onCreate}>
          Create Workspace
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="border-primary text-primary hover:bg-primary hover:text-on-primary"
          onClick={onJoin}
        >
          Join Workspace
        </Button>
      </div>
    </section>
  )
}
