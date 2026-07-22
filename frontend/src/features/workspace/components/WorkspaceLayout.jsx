import { useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog'
import WorkspaceLeaveDialog from '../../../components/WorkspaceLeaveDialog'
import WorkspaceNavbar from './WorkspaceNavbar'
import WorkspaceSidebar from './WorkspaceSidebar'
import { useAuth } from '../../../hooks/useAuth'

const getUserId = (user) => user?._id || user?.id
const getOwnerId = (workspace) => workspace?.owner?._id || workspace?.owner

export default function WorkspaceLayout({
  workspace,
  activeItem = 'home',
  onActiveItemChange,
  onBackToDashboard,
  onLeaveWorkspace,
  onDeleteWorkspace,
  children
}) {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('teamora-sidebar-collapsed') === 'true'
  )
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isOwner = getOwnerId(workspace)?.toString() === getUserId(user)?.toString()

  const selectItem = (item) => {
    setSidebarOpen(false)
    onActiveItemChange?.(item)
  }

  const handleLeaveWorkspace = async (payload) => {
    try {
      setShowLeaveConfirm(false)
      await onLeaveWorkspace?.(workspace?._id, payload)
    } catch {
      setShowLeaveConfirm(true)
    }
  }

  const handleDeleteWorkspace = async () => {
    try {
      setShowDeleteConfirm(false)
      await onDeleteWorkspace?.(workspace?._id)
    } catch {
      setShowDeleteConfirm(true)
    }
  }

  const requestLeaveWorkspace = () => {
    setSidebarOpen(false)
    if (isOwner) {
      handleLeaveWorkspace()
      return
    }
    setShowLeaveConfirm(true)
  }

  const requestDeleteWorkspace = () => {
    setSidebarOpen(false)
    setShowDeleteConfirm(true)
  }

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((value) => {
      const nextValue = !value
      localStorage.setItem('teamora-sidebar-collapsed', String(nextValue))
      return nextValue
    })
  }

  // Editor surfaces fill viewport; only internal panes scroll (not the whole page).
  const fillHeightSections = new Set([
    'home',
    'calendar',
    'tasks',
    'members',
    'settings',
    'documents',
    'spreadsheet',
    'presentation',
    'whiteboard',
    'meetings',
    'shared-files',
    'chat'
  ])
  const isFillHeight = fillHeightSections.has(activeItem)

  return (
    <div className="h-screen overflow-hidden bg-background text-text">
      <WorkspaceNavbar
        workspace={workspace}
        onOpenSidebar={() => setSidebarOpen(true)}
        onBackToDashboard={onBackToDashboard}
        onWorkspaceSettings={() => selectItem('settings')}
        onLeaveWorkspace={requestLeaveWorkspace}
        onSelectSection={selectItem}
      />

      <div className="hidden lg:block">
        <WorkspaceSidebar
          activeItem={activeItem}
          onSelect={selectItem}
          onBackToDashboard={onBackToDashboard}
          onLeaveWorkspace={requestLeaveWorkspace}
          onDeleteWorkspace={requestDeleteWorkspace}
          isOwner={isOwner}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
          className="fixed bottom-0 left-0 top-navbar"
        />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-sidebar lg:hidden" data-workspace-sidebar="true">
          <button
            type="button"
            className="absolute inset-0 teamora-scrim"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close workspace navigation"
          />
          <WorkspaceSidebar
            activeItem={activeItem}
            onSelect={selectItem}
            onBackToDashboard={onBackToDashboard}
            onLeaveWorkspace={requestLeaveWorkspace}
            onDeleteWorkspace={requestDeleteWorkspace}
            isOwner={isOwner}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapsed}
            className="absolute bottom-0 left-0 top-0 shadow-md"
          />
        </div>
      )}

      <main
        className={`h-full pt-navbar transition-[padding-left] duration-slow ease-in-out ${
          isFillHeight ? 'overflow-hidden' : 'overflow-y-auto'
        } ${sidebarCollapsed ? 'lg:pl-sidebar-collapsed' : 'lg:pl-sidebar'}`}
      >
        <div
          className={
            isFillHeight
              ? 'flex h-full min-h-0 max-w-none flex-col px-3 py-3 md:px-4'
              : `mx-auto px-5 py-6 ${activeItem === 'calendar' ? 'max-w-none' : 'max-w-7xl'}`
          }
        >
          {children}
        </div>
      </main>

      {showLeaveConfirm && (
        <WorkspaceLeaveDialog
          workspace={workspace}
          user={user}
          onCancel={() => setShowLeaveConfirm(false)}
          onLeave={handleLeaveWorkspace}
          onDelete={handleDeleteWorkspace}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Workspace?"
          description="This permanently deletes the workspace, removes all members and pending requests, and removes it from every dashboard."
          confirmLabel="Delete Workspace"
          danger
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteWorkspace}
        />
      )}
    </div>
  )
}
