import { useMemo } from 'react'
import { Check, Copy, UserPlus, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import WorkspaceLayout from '../features/workspace/components/WorkspaceLayout'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'

const getUserId = (user) => user?._id || user?.id
const getOwnerId = (workspace) => workspace?.owner?._id || workspace?.owner
const getDisplayName = (user) => user?.fullName || user?.username || user?.email || 'Teamora user'
const formatTime = (value) => (value ? new Date(value).toLocaleString() : 'Just now')

const sectionTitles = {
  documents: 'Documents',
  whiteboard: 'Whiteboard',
  spreadsheet: 'Spreadsheet',
  presentation: 'Presentation',
  calendar: 'Calendar',
  meetings: 'Meetings',
  'shared-files': 'Shared Files'
}

export default function WorkspaceHome({
  workspace,
  loading = false,
  onBack,
  onLeaveWorkspace,
  onDeleteWorkspace,
  onRefresh,
  initialActiveItem = 'home',
  onWorkspacePageChange
}) {
  const { user } = useAuth()
  const activeItem = initialActiveItem
  const isOwner = getOwnerId(workspace)?.toString() === getUserId(user)?.toString()
  const pendingRequests = useMemo(
    () => (workspace?.joinRequests || []).filter((request) => request.status === 'pending'),
    [workspace]
  )

  const selectWorkspacePage = (item) => {
    onWorkspacePageChange?.(item)
  }

  const resolveRequest = async (requestId, action) => {
    try {
      await api.post(`/api/v1/workspaces/${workspace._id}/join-requests/${requestId}/${action}`)
      window.dispatchEvent(new Event('teamora-workspaces-refresh'))
      await onRefresh?.()
      toast.success(action === 'accept' ? 'Request accepted' : 'Request declined')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(workspace?.inviteLink || `${window.location.origin}/invite/${workspace?.inviteCode}`)
      toast.success('Invite link copied')
    } catch {
      toast.error('Could not copy invite link')
    }
  }

  return (
    <WorkspaceLayout
      workspace={workspace}
      activeItem={activeItem}
      onActiveItemChange={selectWorkspacePage}
      onBackToDashboard={onBack}
      onLeaveWorkspace={onLeaveWorkspace}
      onDeleteWorkspace={onDeleteWorkspace}
    >
      <div className="teamora-content-fade">
        {loading ? (
          <WorkspaceContentSkeleton activeItem={activeItem} />
        ) : activeItem === 'members' || activeItem === 'settings' ? (
          <MembersAndRequests
            workspace={workspace}
            isOwner={isOwner}
            pendingRequests={pendingRequests}
            onCopyInviteLink={copyInviteLink}
            onResolveRequest={resolveRequest}
          />
        ) : sectionTitles[activeItem] ? (
          <WorkspaceSection workspace={workspace} title={sectionTitles[activeItem]} />
        ) : (
          <WorkspaceOverview workspace={workspace} onCopyInviteLink={copyInviteLink} />
        )}
      </div>
    </WorkspaceLayout>
  )
}

function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton-shimmer ${className}`} />
}

function WorkspaceContentSkeleton({ activeItem }) {
  if (activeItem === 'whiteboard') {
    return (
      <section className="space-y-4">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-[520px] w-full rounded-[20px]" />
      </section>
    )
  }

  if (activeItem === 'spreadsheet') {
    return (
      <section className="space-y-4">
        <SkeletonBlock className="h-8 w-52" />
        <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-4">
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
        <SkeletonBlock className="h-[460px] w-full rounded-[20px]" />
      </section>
    )
  }

  if (activeItem === 'documents') {
    return (
      <section className="space-y-4">
        <SkeletonBlock className="h-8 w-44" />
        <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6">
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
          <div key={index} className="rounded-[20px] border border-[#E5E7EB] bg-white p-5">
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

function WorkspaceOverview({ workspace, onCopyInviteLink }) {
  return (
    <section className="space-y-6">
      <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[#7C3AED]">Invite-only workspace</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">{workspace?.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">{workspace?.description || 'No description yet.'}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={onCopyInviteLink} className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[#7C3AED] px-4 text-sm font-semibold text-white transition hover:bg-[#6D28D9]">
            <Copy className="h-4 w-4" />
            Copy Invite Link
          </button>
          <span className="inline-flex h-10 items-center rounded-[14px] border border-[#E5E7EB] px-4 text-sm font-semibold text-[#374151]">
            Workspace ID: {workspace?.workspaceId || workspace?._id}
          </span>
        </div>
      </div>
    </section>
  )
}

function WorkspaceSection({ workspace, title }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#7C3AED]">{workspace?.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">{title}</h1>
      </div>

      <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#6B7280]">No items yet.</p>
      </div>
    </section>
  )
}

function MembersAndRequests({ workspace, isOwner, pendingRequests, onCopyInviteLink, onResolveRequest }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#7C3AED]">Workspace Settings</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">Members</h1>
      </div>

      <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">Pending Requests</h2>
            <p className="mt-1 text-sm text-[#6B7280]">Owners can accept or decline invite-link requests.</p>
          </div>
          <button type="button" onClick={onCopyInviteLink} className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[#E5E7EB] px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]">
            <UserPlus className="h-4 w-4" />
            Invite
          </button>
        </div>

        {!isOwner ? (
          <p className="rounded-[14px] border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">Only the workspace owner can review pending requests.</p>
        ) : pendingRequests.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request._id} className="flex flex-col gap-3 rounded-[16px] border border-[#E5E7EB] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{getDisplayName(request.requester)}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">Requested {formatTime(request.requestedAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => onResolveRequest(request._id, 'accept')} className="inline-flex h-10 items-center gap-1.5 rounded-[14px] bg-[#7C3AED] px-4 text-sm font-semibold text-white transition hover:bg-[#6D28D9]">
                    <Check className="h-4 w-4" />
                    Accept
                  </button>
                  <button type="button" onClick={() => onResolveRequest(request._id, 'decline')} className="inline-flex h-10 items-center gap-1.5 rounded-[14px] border border-[#E5E7EB] px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]">
                    <X className="h-4 w-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h2 className="mb-4 inline-flex items-center gap-2 text-base font-semibold text-[#111827]">
          <Users className="h-4 w-4 text-[#7C3AED]" />
          Current Members
        </h2>
        <div className="space-y-3">
          {(workspace?.members || []).map((member) => (
            <div key={member._id || member} className="flex items-center justify-between rounded-[16px] border border-[#E5E7EB] p-4">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{getDisplayName(member)}</p>
                <p className="mt-1 text-xs text-[#6B7280]">{member.email || 'Member'}</p>
              </div>
              {(member._id || member)?.toString() === getOwnerId(workspace)?.toString() && (
                <span className="rounded-full bg-[#F5F3FF] px-3 py-1 text-xs font-semibold text-[#7C3AED]">Owner</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
