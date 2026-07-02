import { useMemo, useState } from 'react'
import { SlidersHorizontal, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import DashboardWorkspaceCard from './DashboardWorkspaceCard'
import DashboardWorkspaceModal from './DashboardWorkspaceModal'
import Button from './ui/Button'
import SearchBar from './ui/SearchBar'
import Tabs from './ui/Tabs'

const tabOptions = ['Recent', 'Pinned', 'Favorites']
const filterOptions = ['All', 'Owned', 'Joined', 'Private', 'Public']
const sortOptions = [
  ['recentlyOpened', 'Recently Opened'],
  ['recentlyUpdated', 'Recently Updated'],
  ['alphabetical', 'Alphabetical'],
  ['newest', 'Newest'],
  ['oldest', 'Oldest']
]

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

const getUserId = (user) => user?._id || user?.id
const getOwnerId = (workspace) => workspace?.owner?._id || workspace?.owner
const isOwnedBy = (workspace, user) => getOwnerId(workspace)?.toString() === getUserId(user)?.toString()

export default function Dashboard({
  user,
  displayName,
  workspaces,
  authNotice,
  onCreateWorkspace,
  onJoinWorkspace,
  onOpenWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('Recent')
  const [filterBy, setFilterBy] = useState('All')
  const [sortBy, setSortBy] = useState('recentlyOpened')
  const [modalMode, setModalMode] = useState(null)
  const [pinnedIds, setPinnedIds] = useState(() => readStoredIds('teamora-pinned-workspaces'))
  const [favoriteIds, setFavoriteIds] = useState(() => readStoredIds('teamora-favorite-workspaces'))
  const [openedMap, setOpenedMap] = useState(readOpenedMap)

  const filteredWorkspaces = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return [...workspaces]
      .filter((workspace) => {
        const matchesSearch =
          !query ||
          workspace.name?.toLowerCase().includes(query) ||
          workspace.description?.toLowerCase().includes(query)
        const matchesTab =
          activeTab === 'Recent' ||
          (activeTab === 'Pinned' && pinnedIds.includes(workspace._id)) ||
          (activeTab === 'Favorites' && favoriteIds.includes(workspace._id))
        const owned = isOwnedBy(workspace, user)
        const matchesFilter =
          filterBy === 'All' ||
          (filterBy === 'Owned' && owned) ||
          (filterBy === 'Joined' && !owned) ||
          (filterBy === 'Private' && workspace.visibility === 'private') ||
          (filterBy === 'Public' && workspace.visibility === 'public')

        return matchesSearch && matchesTab && matchesFilter
      })
      .sort((a, b) => {
        if (sortBy === 'alphabetical') return (a.name || '').localeCompare(b.name || '')
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt)
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt)
        if (sortBy === 'recentlyOpened') {
          return (openedMap[b._id] || new Date(b.updatedAt).getTime()) - (openedMap[a._id] || new Date(a.updatedAt).getTime())
        }
        return new Date(b.updatedAt) - new Date(a.updatedAt)
      })
  }, [activeTab, favoriteIds, filterBy, openedMap, pinnedIds, searchTerm, sortBy, user, workspaces])

  const toggleStoredId = (id, key, setter) => {
    setter((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }

  const handleOpen = (workspace) => {
    const nextMap = { ...openedMap, [workspace._id]: Date.now() }
    setOpenedMap(nextMap)
    localStorage.setItem('teamora-opened-workspaces', JSON.stringify(nextMap))
    onOpenWorkspace(workspace._id)
  }

  const handleRename = async (workspace) => {
    const nextName = window.prompt('Rename workspace', workspace.name)
    if (!nextName || nextName.trim() === workspace.name) return

    try {
      await onUpdateWorkspace(workspace._id, { name: nextName.trim() })
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleCopyId = async (workspaceId) => {
    try {
      await navigator.clipboard.writeText(workspaceId)
      toast.success('Workspace ID copied')
    } catch {
      toast.error('Could not copy workspace ID')
    }
  }

  const handleInvite = async (workspace) => {
    try {
      await navigator.clipboard.writeText(workspace.inviteCode || workspace._id)
      toast.success('Invite code copied')
    } catch {
      toast.error('Could not copy invite code')
    }
  }

  const handleDelete = async (workspace) => {
    if (!window.confirm(`Delete "${workspace.name}"? This cannot be undone.`)) return

    try {
      await onDeleteWorkspace(workspace._id)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const hasNoWorkspaces = workspaces.length === 0

  return (
    <main className="mx-auto max-w-7xl px-5 py-6">
      <section className="mb-6">
        <p className="text-sm font-medium text-[#6B7280]">Welcome Back 👋</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">{displayName}</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Ready to continue your work?</p>
      </section>

      {authNotice && (
        <div className="mb-6 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {authNotice}
        </div>
      )}

      <section className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onClear={() => setSearchTerm('')}
          className="flex-1"
        />

        <Button type="button" variant="secondary" onClick={() => setModalMode('join')}>
          <UserPlus className="h-4 w-4" />
          Join Workspace
        </Button>
        <Button type="button" onClick={() => setModalMode('create')}>
          + New Workspace
        </Button>
      </section>

      <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs options={tabOptions} active={activeTab} onChange={setActiveTab} />

        <div className="flex flex-col gap-2 sm:flex-row">
          <SelectControl label="Filter" value={filterBy} onChange={setFilterBy} options={filterOptions.map((value) => [value, value])} />
          <SelectControl label="Sort" value={sortBy} onChange={setSortBy} options={sortOptions} />
        </div>
      </section>

      {hasNoWorkspaces ? (
        <EmptyState onCreate={() => setModalMode('create')} onJoin={() => setModalMode('join')} />
      ) : filteredWorkspaces.length > 0 ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkspaces.map((workspace) => (
            <DashboardWorkspaceCard
              key={workspace._id}
              workspace={workspace}
              user={user}
              pinned={pinnedIds.includes(workspace._id)}
              favorite={favoriteIds.includes(workspace._id)}
              onOpen={handleOpen}
              onRename={handleRename}
              onTogglePin={(id) => toggleStoredId(id, 'teamora-pinned-workspaces', setPinnedIds)}
              onToggleFavorite={(id) => toggleStoredId(id, 'teamora-favorite-workspaces', setFavoriteIds)}
              onCopyId={handleCopyId}
              onInvite={handleInvite}
              onLeave={() => toast('Leave workspace will be available soon.')}
              onDelete={handleDelete}
            />
          ))}
        </section>
      ) : (
        <div className="rounded-[20px] border border-dashed border-[#E5E7EB] bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-[#111827]">No matching workspaces</h2>
          <p className="mt-2 text-sm text-[#6B7280]">Try a different search, filter, or sort option.</p>
        </div>
      )}

      {modalMode && (
        <DashboardWorkspaceModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onCreateWorkspace={onCreateWorkspace}
          onJoinWorkspace={onJoinWorkspace}
        />
      )}
    </main>
  )
}

function SelectControl({ label, value, onChange, options }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#6B7280] transition duration-[180ms] hover:border-[#7C3AED]">
      <SlidersHorizontal className="h-4 w-4 text-[#9CA3AF]" />
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="bg-transparent text-sm font-medium outline-none">
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function EmptyState({ onCreate, onJoin }) {
  return (
    <section className="mx-auto flex min-h-[360px] max-w-xl flex-col justify-center rounded-[20px] border border-[#E5E7EB] bg-white p-10 text-center shadow-sm">
      <h2 className="text-2xl font-semibold tracking-tight text-[#111827]">No Workspaces Yet</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6B7280]">
        You haven't created or joined a workspace yet.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button type="button" onClick={onCreate}>
          + New Workspace
        </Button>
        <Button type="button" variant="secondary" onClick={onJoin}>
          Join Workspace
        </Button>
      </div>
    </section>
  )
}
