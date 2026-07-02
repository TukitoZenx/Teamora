import { Menu, MoreHorizontal, Search, Bell } from 'lucide-react'
import NotificationButton from './NotificationButton'
import WorkspaceLogo from './WorkspaceLogo'

export default function WorkspaceNavbar({
  workspace,
  onOpenSidebar,
  onBackToDashboard,
  onSettings,
  onWorkspaceSettings,
  onLogout
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-[1000] h-[72px] border-b border-[#E5E7EB] bg-white px-6">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#6B7280] transition hover:bg-[#F5F3FF] hover:text-[#7C3AED] lg:hidden"
            aria-label="Open workspace navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <WorkspaceLogo name={workspace?.name} />
          <span className="truncate text-sm font-semibold text-[#111827]">{workspace?.name || 'Workspace'}</span>
        </div>

        <div className="hidden w-[420px] max-w-[42vw] items-center rounded-2xl border border-[#E5E7EB] bg-white px-4 transition duration-[180ms] focus-within:border-[#7C3AED] focus-within:ring-4 focus-within:ring-[#7C3AED]/10 md:flex">
          <Search className="h-4 w-4 text-[#9CA3AF]" />
          <input
            className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]"
            placeholder="Search documents, members, files..."
          />
          <kbd className="rounded-lg border border-[#E5E7EB] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">Ctrl K</kbd>
        </div>

        <div className="flex items-center justify-end gap-3">
          <NotificationButton />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6B7280] transition duration-[180ms] ease-out hover:bg-[#F3F4F6] hover:text-[#7C3AED]"
            aria-label="More workspace actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
