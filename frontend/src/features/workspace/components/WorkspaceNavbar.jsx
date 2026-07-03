import { Menu, Search } from 'lucide-react'
import NotificationButton from './NotificationButton'
import ProfileDropdown from './ProfileDropdown'
import WorkspaceLogo from './WorkspaceLogo'

export default function WorkspaceNavbar({
  workspace,
  onOpenSidebar,
  onWorkspaceSettings,
  onLeaveWorkspace
}) {
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
          <WorkspaceLogo name={workspace?.name} />
          <span className="truncate text-sm font-semibold text-[#111827]" title={workspace?.name || 'Workspace'}>
            {workspace?.name || 'Workspace'}
          </span>
        </div>

        <div className="hidden items-center rounded-[18px] border border-[#E5E7EB] bg-white/92 px-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition duration-200 focus-within:border-[#7C3AED] focus-within:ring-4 focus-within:ring-[#7C3AED]/10 md:flex">
          <Search className="h-4 w-4 text-[#9CA3AF]" />
          <input
            className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]"
            placeholder="Search workspace..."
            aria-label={`Search inside ${workspace?.name || 'current workspace'}`}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <NotificationButton />
          <ProfileDropdown
            onWorkspaceSettings={onWorkspaceSettings}
            onLeaveWorkspace={onLeaveWorkspace}
          />
        </div>
      </div>
    </header>
  )
}
