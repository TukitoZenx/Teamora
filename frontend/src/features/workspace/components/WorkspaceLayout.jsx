import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
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
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('teamora-sidebar-collapsed') === 'true')
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isOwner = getOwnerId(workspace)?.toString() === getUserId(user)?.toString()

  const selectItem = (item) => {
    setSidebarOpen(false)
    onActiveItemChange?.(item)
  }

  const copyInviteCode = async () => {
    try {
      const inviteLink = workspace?.inviteLink || `${window.location.origin}/invite/${workspace?.inviteCode}`
      await navigator.clipboard.writeText(inviteLink)
      toast.success('Invite link copied')
    } catch {
      toast.error('Could not copy invite link')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/', { replace: true })
    }
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

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC] text-[#111827]">
      <WorkspaceNavbar
        workspace={workspace}
        onOpenSidebar={() => setSidebarOpen(true)}
        onInvite={copyInviteCode}
        onBackToDashboard={onBackToDashboard}
        onSettings={() => navigate('/settings')}
        onWorkspaceSettings={() => selectItem('settings')}
        onLogout={handleLogout}
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
          className="fixed bottom-0 left-0 top-[72px]"
        />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[1100] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/25 backdrop-blur-[10px]"
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

      <main className={`h-full overflow-y-auto pt-[72px] transition-[padding-left] duration-220 ease-in-out ${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'}`}>
        <div className="mx-auto max-w-7xl px-5 py-6">{children}</div>
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
