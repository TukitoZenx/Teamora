import { useMemo, useState } from 'react'
import { Check, Copy, DoorOpen, Globe2, Image, Link2, Save, Shield, Trash2, UserPlus, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import WorkspaceLayout from '../features/workspace/components/WorkspaceLayout'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'
import Calendar from './Calendar'
import ConfirmDialog from './ConfirmDialog'
import Switch from './ui/Switch'
import { addWorkspaceNotification } from '../utils/notifications'

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
  onUpdateWorkspace,
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
      addWorkspaceNotification({
        type: action === 'accept' ? 'join_request_accepted' : 'join_request_declined',
        message: action === 'accept' ? 'Join request approved' : 'Join request rejected',
        workspaceId: workspace._id,
        workspaceName: workspace.name
      })
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
        ) : activeItem === 'members' ? (
          <MembersAndRequests
            workspace={workspace}
            isOwner={isOwner}
            pendingRequests={pendingRequests}
            onCopyInviteLink={copyInviteLink}
            onResolveRequest={resolveRequest}
          />
        ) : activeItem === 'settings' ? (
          <WorkspaceSettings
            workspace={workspace}
            isOwner={isOwner}
            onCopyInviteLink={copyInviteLink}
            onUpdateWorkspace={onUpdateWorkspace}
            onLeaveWorkspace={onLeaveWorkspace}
            onDeleteWorkspace={onDeleteWorkspace}
            onRefresh={onRefresh}
          />
        ) : activeItem === 'calendar' ? (
          <Calendar
            calendarList={workspace?.calendar || workspace?.tasks || []}
            workspaceId={workspace?._id}
            userName={getDisplayName(user)}
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

function WorkspaceSettings({
  workspace,
  isOwner,
  onCopyInviteLink,
  onUpdateWorkspace,
  onLeaveWorkspace,
  onDeleteWorkspace,
  onRefresh
}) {
  const [name, setName] = useState(workspace?.name || '')
  const [description, setDescription] = useState(workspace?.description || '')
  const [icon, setIcon] = useState(workspace?.icon || '')
  const [joinApproval, setJoinApproval] = useState(workspace?.joinApproval ?? true)
  const [visibility, setVisibility] = useState(workspace?.visibility || 'invite_only')
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  const ownerId = getOwnerId(workspace)?.toString()

  const saveSettings = async () => {
    if (!isOwner) return
    setSaving(true)
    try {
      await onUpdateWorkspace?.(workspace._id, { name, description, icon, joinApproval, visibility })
      toast.success('Settings saved')
      await onRefresh?.()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const removeMember = async (member) => {
    const memberId = (member._id || member)?.toString()
    setRemovingId(memberId)
    try {
      await api.delete(`/api/v1/workspaces/${workspace._id}/members/${memberId}`)
      toast.success('Member removed')
      await onRefresh?.()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setRemovingId('')
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#7C3AED]">Workspace Settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">Manage {workspace?.name}</h1>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[#7C3AED] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(124,58,237,0.2)] transition hover:bg-[#6D28D9] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SettingsPanel icon={Globe2} title="General">
            <div className="grid gap-4 sm:grid-cols-[96px_1fr]">
              <label className="block">
                <span className="text-sm font-semibold text-[#374151]">Icon</span>
                <div className="mt-2 flex h-20 w-20 items-center justify-center rounded-[20px] border border-[#E5E7EB] bg-[#F8F5FF] text-2xl font-bold text-[#7C3AED]">
                  {icon || workspace?.name?.charAt(0)?.toUpperCase() || <Image className="h-5 w-5" />}
                </div>
                <input
                  value={icon}
                  maxLength={2}
                  disabled={!isOwner}
                  onChange={(event) => setIcon(event.target.value)}
                  className="mt-2 h-10 w-20 rounded-[14px] border border-[#E5E7EB] px-3 text-center text-sm outline-none focus:border-[#7C3AED] disabled:bg-[#F8FAFC]"
                  placeholder="AI"
                />
              </label>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-[#374151]">Workspace Name</span>
                  <input
                    value={name}
                    disabled={!isOwner}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 h-12 w-full rounded-[16px] border border-[#E5E7EB] px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 disabled:bg-[#F8FAFC]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[#374151]">Workspace Description</span>
                  <textarea
                    value={description}
                    disabled={!isOwner}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="mt-2 w-full resize-none rounded-[16px] border border-[#E5E7EB] px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 disabled:bg-[#F8FAFC]"
                    placeholder="Describe the purpose of this workspace"
                  />
                </label>
              </div>
            </div>
          </SettingsPanel>

          <SettingsPanel icon={Users} title="Members">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Review members, roles, and invite access.</p>
              </div>
              <button type="button" onClick={onCopyInviteLink} className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] border border-[#E5E7EB] px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </button>
            </div>

            <div className="space-y-3">
              {(workspace?.members || []).map((member) => {
                const memberId = (member._id || member)?.toString()
                const isWorkspaceOwner = memberId === ownerId

                return (
                  <div key={memberId} className="flex flex-col gap-3 rounded-[18px] border border-[#E5E7EB] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{getDisplayName(member)}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{member.email || 'Workspace member'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#F5F3FF] px-3 py-1 text-xs font-semibold text-[#7C3AED]">{isWorkspaceOwner ? 'Owner' : 'Member'}</span>
                      {isOwner && !isWorkspaceOwner && (
                        <button
                          type="button"
                          disabled={removingId === memberId}
                          onClick={() => removeMember(member)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#FEE2E2] px-3 text-xs font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2] disabled:opacity-60"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </SettingsPanel>
        </div>

        <div className="space-y-6">
          <SettingsPanel icon={Shield} title="Permissions">
            <div className="space-y-4">
              <div>
                <span className="text-sm font-semibold text-[#374151]">Invite Link</span>
                <div className="mt-2 flex gap-2">
                  <input
                    readOnly
                    value={workspace?.inviteLink || `${window.location.origin}/invite/${workspace?.inviteCode}`}
                    className="min-w-0 flex-1 rounded-[14px] border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-xs text-[#6B7280] outline-none"
                  />
                  <button type="button" onClick={onCopyInviteLink} className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#7C3AED] text-white transition hover:bg-[#6D28D9]" aria-label="Copy invite link">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <SettingToggle
                label="Join approval"
                description="New members require owner approval before entering."
                checked={joinApproval}
                disabled={!isOwner}
                onChange={() => setJoinApproval((value) => !value)}
              />

              <div>
                <span className="text-sm font-semibold text-[#374151]">Workspace Visibility</span>
                <div className="mt-2 grid gap-2">
                  {[
                    { value: 'invite_only', label: 'Invite-only', icon: Link2 },
                    { value: 'private', label: 'Private', icon: Shield }
                  ].map((option) => {
                    const OptionIcon = option.icon
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={!isOwner}
                        onClick={() => setVisibility(option.value)}
                        className={`flex h-11 items-center gap-2 rounded-[14px] border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                          visibility === option.value
                            ? 'border-[#7C3AED] bg-[#F5F3FF] text-[#7C3AED]'
                            : 'border-[#E5E7EB] text-[#374151] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <OptionIcon className="h-4 w-4" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </SettingsPanel>

          <SettingsPanel icon={Trash2} title="Danger Zone" danger>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setConfirmAction('leave')}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#FEE2E2] px-4 text-sm font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2]"
              >
                <DoorOpen className="h-4 w-4" />
                Leave Workspace
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setConfirmAction('delete')}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#DC2626] px-4 text-sm font-semibold text-white transition hover:bg-[#B91C1C]"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Workspace
                </button>
              )}
            </div>
          </SettingsPanel>
        </div>
      </div>

      {confirmAction === 'leave' && (
        <ConfirmDialog
          title="Leave Workspace?"
          description="You will lose access to this workspace unless another member invites you again."
          confirmLabel="Leave Workspace"
          danger
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            setConfirmAction(null)
            onLeaveWorkspace?.(workspace?._id)
          }}
        />
      )}

      {confirmAction === 'delete' && (
        <ConfirmDialog
          title="Delete Workspace?"
          description="This permanently deletes the workspace, removes all members, and cannot be undone."
          confirmLabel="Delete Workspace"
          danger
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            setConfirmAction(null)
            onDeleteWorkspace?.(workspace?._id)
          }}
        />
      )}
    </section>
  )
}

function SettingsPanel({ icon: Icon, title, danger = false, children }) {
  return (
    <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <h2 className={`mb-4 flex items-center gap-2 text-base font-semibold ${danger ? 'text-[#DC2626]' : 'text-[#111827]'}`}>
        <Icon className={`h-4 w-4 ${danger ? 'text-[#DC2626]' : 'text-[#7C3AED]'}`} />
        {title}
      </h2>
      {children}
    </section>
  )
}

function SettingToggle({ label, description, checked, disabled, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[16px] border border-[#E5E7EB] p-4">
      <div>
        <p className="text-sm font-semibold text-[#111827]">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[#6B7280]">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onClick={onChange} />
    </div>
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
