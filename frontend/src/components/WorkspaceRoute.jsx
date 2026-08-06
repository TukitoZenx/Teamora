import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import WorkspaceLayout from '../features/workspace/components/WorkspaceLayout'
import {
  WORKSPACE_SECTIONS,
  clearLastWorkspaceId,
  getLastWorkspaceId,
  removeWorkspaceCache
} from '../utils/workspaceStorage'

function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton-shimmer ${className}`} />
}

function WorkspaceContentSkeleton({ activeItem }) {
  if (activeItem === 'whiteboard') {
    return (
      <section className="space-y-4">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-[520px] w-full rounded-card" />
      </section>
    )
  }

  if (activeItem === 'spreadsheet') {
    return (
      <section className="space-y-4">
        <SkeletonBlock className="h-8 w-52" />
        <div className="rounded-card border border-border bg-card p-4">
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 36 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (activeItem === 'presentation') {
    return (
      <section className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-28 w-full" />
          ))}
        </div>
        <SkeletonBlock className="h-[460px] w-full rounded-card" />
      </section>
    )
  }

  if (activeItem === 'documents') {
    return (
      <section className="space-y-4">
        <SkeletonBlock className="h-8 w-44" />
        <div className="rounded-card border border-border bg-card p-6">
          <SkeletonBlock className="h-7 w-2/3" />
          <SkeletonBlock className="mt-5 h-4 w-full" />
          <SkeletonBlock className="mt-3 h-4 w-11/12" />
          <SkeletonBlock className="mt-3 h-4 w-10/12" />
          <SkeletonBlock className="mt-8 h-64 w-full" />
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div>
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="mt-3 h-8 w-64" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-card border border-border bg-card p-5">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="mt-4 h-4 w-full" />
            <SkeletonBlock className="mt-3 h-4 w-3/4" />
            <SkeletonBlock className="mt-6 h-10 w-32" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function WorkspaceLoadingShell({ activeItem = 'home', onBack }) {
  return (
    <WorkspaceLayout
      workspace={{ name: 'Workspace', members: [], owner: null }}
      activeItem={activeItem}
      onActiveItemChange={() => {}}
      onBackToDashboard={onBack}
      onLeaveWorkspace={() => {}}
      onDeleteWorkspace={() => {}}
    >
      <div className="teamora-content-fade">
        <WorkspaceContentSkeleton activeItem={activeItem} />
      </div>
    </WorkspaceLayout>
  )
}

/**
 * Resolves /workspace/:id/:section? — loads workspace data and renders the app frame.
 */
export default function WorkspaceRoute({
  authenticated,
  activeWorkspace,
  fetchWorkspace,
  goToDashboard,
  renderAppFrame
}) {
  const { id, section } = useParams()
  const navigate = useNavigate()
  const workspacePage = WORKSPACE_SECTIONS.has(section) ? section : 'home'

  useEffect(() => {
    if (!authenticated) return

    if (id && section && !WORKSPACE_SECTIONS.has(section)) {
      navigate(`/workspace/${id}`, { replace: true })
      return
    }

    if (id) {
      if (activeWorkspace?._id === id) return

      fetchWorkspace(id).catch((error) => {
        // Drop stale last-workspace pointer and history cache so the user is
        // not bounced back into a 404 loop on next dashboard open.
        if (error.status === 404 || error.status === 403) {
          clearLastWorkspaceId(id)
          removeWorkspaceCache(id)
          window.dispatchEvent(new Event('teamora-workspaces-refresh'))
        }
        const notMember = error.status === 404 || error.status === 403
        toast.error(notMember ? 'You are not a member of this workspace.' : error.message)
        goToDashboard()
      })
      return
    }

    const lastWorkspaceId = getLastWorkspaceId()

    if (lastWorkspaceId) {
      navigate(`/workspace/${lastWorkspaceId}`, { replace: true })
    } else {
      goToDashboard()
    }
  }, [id, section, authenticated, activeWorkspace?._id, fetchWorkspace, goToDashboard, navigate])

  const isCurrentWorkspaceLoaded = activeWorkspace?._id === id
  return renderAppFrame({ forceWorkspace: Boolean(id && !isCurrentWorkspaceLoaded), workspacePage })
}
