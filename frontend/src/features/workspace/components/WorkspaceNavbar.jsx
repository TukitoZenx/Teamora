import { useState, useRef, useEffect } from 'react'
import { Menu, Search, Users, Calendar, X, UserPlus } from 'lucide-react'
import NotificationButton from './NotificationButton'
import ProfileDropdown from './ProfileDropdown'

export default function WorkspaceNavbar({
  workspace,
  onOpenSidebar,
  onWorkspaceSettings,
  onLeaveWorkspace,
  onSelectSection
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef(null)
  const inputRef = useRef(null)

  const cleanQuery = searchQuery.trim().toLowerCase()

  const matchedMembers = cleanQuery
    ? (workspace?.members || []).filter((m) => {
        const name = (m.fullName || m.username || '').toLowerCase()
        const email = (m.email || '').toLowerCase()
        return name.includes(cleanQuery) || email.includes(cleanQuery)
      })
    : []

  const matchedTasks = cleanQuery
    ? (workspace?.tasks || []).filter((t) => {
        const title = (t.title || '').toLowerCase()
        const desc = (t.description || '').toLowerCase()
        const assignee = (t.assignee || '').toLowerCase()
        return title.includes(cleanQuery) || desc.includes(cleanQuery) || assignee.includes(cleanQuery)
      })
    : []

  const hasResults = matchedMembers.length > 0 || matchedTasks.length > 0

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelectMember = () => {
    setIsOpen(false)
    setSearchQuery('')
    onSelectSection?.('members')
  }

  const handleSelectTask = () => {
    setIsOpen(false)
    setSearchQuery('')
    onSelectSection?.('calendar')
  }

  return (
    <header className="fixed inset-x-0 top-0 z-[1000] h-[72px] border-b border-white/60 bg-white/88 px-4 shadow-[0_1px_0_rgba(17,24,39,0.04)] backdrop-blur-xl sm:px-6">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,520px)_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] text-[#6B7280] transition duration-200 hover:bg-[#F5F3FF] hover:text-[#7C3AED] lg:hidden"
            aria-label="Open workspace navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="hidden text-lg font-bold tracking-tight text-[#7C3AED] sm:inline">Teamora</span>
          <span className="hidden text-[#CBD5E1] sm:inline" aria-hidden="true">
            |
          </span>
          <span className="truncate text-sm font-semibold text-[#111827]" title={workspace?.name || 'Workspace'}>
            {workspace?.name || 'Workspace'}
          </span>
        </div>

        <div className="relative hidden md:block" ref={searchRef}>
          <div className="flex items-center rounded-[18px] border border-[#E5E7EB] bg-white/92 px-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition duration-200 focus-within:border-[#7C3AED] focus-within:ring-4 focus-within:ring-[#7C3AED]/10">
            <Search className="h-4 w-4 text-[#9CA3AF] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]"
              placeholder="Search members or tasks... Ctrl+K"
              aria-label={`Search inside ${workspace?.name || 'current workspace'}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setIsOpen(false)
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Results Dropdown */}
          {isOpen && cleanQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 max-h-80 overflow-y-auto space-y-3">
              {!hasResults ? (
                <p className="text-xs text-slate-400 italic py-3 text-center">No matching members or tasks found.</p>
              ) : (
                <>
                  {matchedMembers.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <Users className="w-3 h-3 text-indigo-500" />
                        <span>Members ({matchedMembers.length})</span>
                      </div>
                      <div className="space-y-1">
                        {matchedMembers.map((m) => (
                          <button
                            key={m._id || m.email}
                            onClick={handleSelectMember}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-indigo-50/60 text-left transition-colors cursor-pointer"
                          >
                            <span className="text-xs font-semibold text-slate-800">
                              {m.fullName || m.username || m.email}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{m.email}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchedTasks.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <Calendar className="w-3 h-3 text-amber-500" />
                        <span>Tasks ({matchedTasks.length})</span>
                      </div>
                      <div className="space-y-1">
                        {matchedTasks.map((t) => (
                          <button
                            key={t._id}
                            onClick={handleSelectTask}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-amber-50/60 text-left transition-colors cursor-pointer"
                          >
                            <div className="truncate flex-1 pr-2">
                              <p className="text-xs font-semibold text-slate-800 truncate">{t.title}</p>
                              {t.description && <p className="text-[10px] text-slate-400 truncate">{t.description}</p>}
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                              {t.priority}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onSelectSection?.('members')}
            className="hidden h-10 items-center gap-2 rounded-[14px] bg-[#7C3AED] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(124,58,237,0.18)] transition hover:bg-[#6D28D9] sm:inline-flex"
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </button>
          <NotificationButton />
          <ProfileDropdown onWorkspaceSettings={onWorkspaceSettings} onLeaveWorkspace={onLeaveWorkspace} />
        </div>
      </div>
    </header>
  )
}
