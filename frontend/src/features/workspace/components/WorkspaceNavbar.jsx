import { useState, useRef, useEffect } from 'react'
import { Menu, Search, Users, Calendar, X, UserPlus, Sun, Moon, ChevronLeft } from 'lucide-react'
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const searchRef = useRef(null)
  const inputRef = useRef(null)

  const [theme, setTheme] = useState(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem('teamora-appearance') || 'null')
      return preferences?.theme || 'Light'
    } catch {
      return 'Light'
    }
  })

  useEffect(() => {
    const handleChanged = () => {
      try {
        const preferences = JSON.parse(localStorage.getItem('teamora-appearance') || 'null')
        setTheme(preferences?.theme || 'Light')
      } catch {
        // Ignore JSON parsing errors.
      }
    }
    window.addEventListener('teamora-appearance-changed', handleChanged)
    return () => window.removeEventListener('teamora-appearance-changed', handleChanged)
  }, [])

  const toggleTheme = () => {
    try {
      const preferences = JSON.parse(localStorage.getItem('teamora-appearance') || 'null') || { theme: 'Light' }
      const currentTheme = preferences.theme || 'Light'
      let nextTheme = 'Light'
      if (currentTheme === 'Light') {
        nextTheme = 'Dark'
      } else if (currentTheme === 'Dark') {
        nextTheme = 'Light'
      } else {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        nextTheme = systemDark ? 'Light' : 'Dark'
      }
      const nextPreferences = { ...preferences, theme: nextTheme }
      localStorage.setItem('teamora-appearance', JSON.stringify(nextPreferences))
      window.dispatchEvent(new CustomEvent('teamora-appearance-changed', { detail: nextPreferences }))
    } catch {
      // Ignore setting write errors.
    }
  }

  const isDarkMode =
    theme === 'Dark' || (theme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches)

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
    setMobileSearchOpen(false)
    onSelectSection?.('members')
  }

  const handleSelectTask = () => {
    setIsOpen(false)
    setSearchQuery('')
    setMobileSearchOpen(false)
    onSelectSection?.('calendar')
  }

  const searchDropdown = isOpen && cleanQuery && (
    <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-border bg-card-elevated p-3 shadow-modal z-50 max-h-80 overflow-y-auto space-y-3">
      {!hasResults ? (
        <p className="text-xs text-muted italic py-3 text-center">No matching members or tasks found.</p>
      ) : (
        <>
          {matchedMembers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                <Users className="w-3 h-3 text-primary" />
                <span>Members ({matchedMembers.length})</span>
              </div>
              <div className="space-y-1">
                {matchedMembers.map((m) => (
                  <button
                    key={m._id || m.email}
                    onClick={handleSelectMember}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-primary/10 text-left transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-text">
                      {m.fullName || m.username || m.email}
                    </span>
                    <span className="text-[10px] text-muted truncate max-w-[140px]">{m.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                <Calendar className="w-3 h-3 text-warning" />
                <span>Tasks ({matchedTasks.length})</span>
              </div>
              <div className="space-y-1">
                {matchedTasks.map((t) => (
                  <button
                    key={t._id}
                    onClick={handleSelectTask}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-primary/10 text-left transition-colors cursor-pointer"
                  >
                    <div className="truncate flex-1 pr-2">
                      <p className="text-xs font-semibold text-text truncate">{t.title}</p>
                      {t.description && <p className="text-[10px] text-muted truncate">{t.description}</p>}
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
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
  )

  if (mobileSearchOpen) {
    return (
      <header className="fixed inset-x-0 top-0 z-[1000] h-[72px] border-b border-border bg-card/88 px-4 shadow-sm backdrop-blur-xl sm:px-6">
        <div className="flex h-full w-full items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen(false)
              setSearchQuery('')
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-primary/10 hover:text-primary"
            aria-label="Close search"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="relative flex-1" ref={searchRef}>
            <div className="flex items-center rounded-[18px] border border-border bg-card px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <Search className="h-4 w-4 text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsOpen(true)
                }}
                onFocus={() => setIsOpen(true)}
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-text outline-none placeholder:text-muted/50"
                placeholder="Search members or tasks..."
                aria-label={`Search inside ${workspace?.name || 'current workspace'}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setIsOpen(false)
                  }}
                  className="text-muted hover:text-text p-1 rounded-full"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {searchDropdown}
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="fixed inset-x-0 top-0 z-[1000] h-[72px] border-b border-border bg-card/88 px-4 shadow-sm backdrop-blur-xl sm:px-6">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,520px)_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] text-muted transition duration-200 hover:bg-primary/10 hover:text-primary lg:hidden"
            aria-label="Open workspace navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="hidden text-lg font-bold tracking-tight text-primary sm:inline">Teamora</span>
          <span className="hidden text-border sm:inline" aria-hidden="true">
            |
          </span>
          <span className="truncate text-sm font-semibold text-text" title={workspace?.name || 'Workspace'}>
            {workspace?.name || 'Workspace'}
          </span>
        </div>

        <div className="relative hidden md:block" ref={searchRef}>
          <div className="flex items-center rounded-[18px] border border-border bg-card px-4 transition duration-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
            <Search className="h-4 w-4 text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-text outline-none placeholder:text-muted/50"
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
                className="text-muted hover:text-text p-1 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Results Dropdown */}
          {searchDropdown}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setMobileSearchOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition duration-200 hover:bg-primary/10 hover:text-primary md:hidden"
            aria-label="Open search"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectSection?.('members')}
            className="hidden h-10 items-center gap-2 rounded-[14px] bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover sm:inline-flex"
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition duration-[180ms] hover:bg-primary/10 hover:text-primary"
            aria-label="Toggle theme mode"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <NotificationButton />
          <ProfileDropdown onWorkspaceSettings={onWorkspaceSettings} onLeaveWorkspace={onLeaveWorkspace} />
        </div>
      </div>
    </header>
  )
}
