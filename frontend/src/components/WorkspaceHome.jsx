import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Copy,
  DoorOpen,
  FileText,
  Globe2,
  Image,
  Link2,
  MessageSquare,
  Paintbrush,
  Presentation,
  Save,
  Shield,
  TableProperties,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Video,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import WorkspaceLayout from '../features/workspace/components/WorkspaceLayout'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'
import Calendar from './Calendar'
import ConfirmDialog from './ConfirmDialog'
import Switch from './ui/Switch'
import { addWorkspaceNotification } from './utils/notifications'

// Lazily loaded: each of these pulls in a heavy editor (Quill, xlsx, canvas
// drawing, WebRTC) that only needs to load once a user actually opens that
// workspace section, keeping the initial bundle smaller.
const DocumentsSection = lazy(() => import('./workspace-sections/DocumentsSection'))
const WhiteboardSection = lazy(() => import('./workspace-sections/WhiteboardSection'))
const SpreadsheetSection = lazy(() => import('./workspace-sections/SpreadsheetSection'))
const PresentationSection = lazy(() => import('./workspace-sections/PresentationSection'))
const SharedFilesSection = lazy(() => import('./workspace-sections/SharedFilesSection'))
const MeetingsSection = lazy(() => import('./workspace-sections/MeetingsSection'))

const getUserId = (user) => user?._id || user?.id
const getOwnerId = (workspace) => workspace?.owner?._id || workspace?.owner
const getDisplayName = (user) => user?.fullName || user?.username || user?.email || 'Teamora user'
const formatTime = (value) => (value ? new Date(value).toLocaleString() : 'Just now')

const sectionTitles = {
  calendar: 'Calendar',
  tasks: 'All Tasks'
}

const FILE_TYPES = {
  document: { section: 'documents', label: 'Document', extension: 'doc', icon: FileText },
  spreadsheet: { section: 'spreadsheet', label: 'Spreadsheet', extension: 'xlsx', icon: TableProperties },
  presentation: { section: 'presentation', label: 'Presentation', extension: 'pptx', icon: Presentation },
  whiteboard: { section: 'whiteboard', label: 'Whiteboard', extension: 'board', icon: Paintbrush }
}

const fileStoreKey = (workspaceId) => `teamora-workspace-files:${workspaceId}`
const tabsStoreKey = (workspaceId) => `teamora-workspace-tabs:${workspaceId}`
const activeTabStoreKey = (workspaceId) => `teamora-workspace-active-tab:${workspaceId}`

const readStoredJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || fallback
  } catch {
    return fallback
  }
}

const writeStoredJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Workspace file state is local and best-effort.
  }
}

const buildWorkspaceFileSeed = (workspaceId) => [
  {
    id: `folder-${workspaceId}-design`,
    type: 'folder',
    name: 'Design',
    parentId: null,
    updatedAt: new Date().toISOString()
  }
]

const getFilePath = (files, file) => {
  if (!file) return []
  const byId = new Map(files.map((item) => [item.id, item]))
  const path = [file]
  let cursor = file.parentId ? byId.get(file.parentId) : null
  while (cursor) {
    path.unshift(cursor)
    cursor = cursor.parentId ? byId.get(cursor.parentId) : null
  }
  return path
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
  const workspaceId = workspace?._id || workspace?.workspaceId
  const [workspaceFiles, setWorkspaceFiles] = useState(() => {
    if (!workspaceId) return []
    const stored = readStoredJson(fileStoreKey(workspaceId), null)
    return stored || buildWorkspaceFileSeed(workspaceId)
  })
  const [workspaceStateId, setWorkspaceStateId] = useState(workspaceId)
  const [openTabs, setOpenTabs] = useState(() => (workspaceId ? readStoredJson(tabsStoreKey(workspaceId), []) : []))
  const [activeTabId, setActiveTabId] = useState(() =>
    workspaceId ? localStorage.getItem(activeTabStoreKey(workspaceId)) || '' : ''
  )
  const [chatMessages, setChatMessages] = useState(() =>
    workspaceId ? readStoredJson(`teamora-workspace-chat:${workspaceId}`, []) : []
  )
  const pendingRequests = useMemo(
    () => (workspace?.joinRequests || []).filter((request) => request.status === 'pending'),
    [workspace]
  )
  const activeFile = useMemo(
    () => workspaceFiles.find((file) => file.id === activeTabId && file.type !== 'folder') || null,
    [activeTabId, workspaceFiles]
  )
  const activeFilePath = useMemo(() => getFilePath(workspaceFiles, activeFile), [activeFile, workspaceFiles])
  const recentFiles = useMemo(
    () =>
      workspaceFiles
        .filter((file) => file.type !== 'folder')
        .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0))
        .slice(0, 5),
    [workspaceFiles]
  )
  const pendingTaskCount = (workspace?.tasks || []).filter(
    (task) => !task.completed && task.status !== 'completed'
  ).length
  const completedTaskCount = (workspace?.tasks || []).filter(
    (task) => task.completed || task.status === 'completed'
  ).length

  if (workspaceId !== workspaceStateId) {
    const stored = readStoredJson(fileStoreKey(workspaceId), null)
    setWorkspaceStateId(workspaceId)
    setWorkspaceFiles(stored || buildWorkspaceFileSeed(workspaceId))
    setOpenTabs(readStoredJson(tabsStoreKey(workspaceId), []))
    setActiveTabId(localStorage.getItem(activeTabStoreKey(workspaceId)) || '')
    setChatMessages(readStoredJson(`teamora-workspace-chat:${workspaceId}`, []))
  }

  useEffect(() => {
    if (!workspaceId) return
    writeStoredJson(fileStoreKey(workspaceId), workspaceFiles)
  }, [workspaceFiles, workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    writeStoredJson(tabsStoreKey(workspaceId), openTabs)
  }, [openTabs, workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    if (activeTabId) localStorage.setItem(activeTabStoreKey(workspaceId), activeTabId)
    else localStorage.removeItem(activeTabStoreKey(workspaceId))
  }, [activeTabId, workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    writeStoredJson(`teamora-workspace-chat:${workspaceId}`, chatMessages)
  }, [chatMessages, workspaceId])

  useEffect(() => {
    if (!activeFile) return
    const section = FILE_TYPES[activeFile.kind]?.section
    if (section && activeItem !== section) {
      onWorkspacePageChange?.(section)
    }
  }, [activeFile, activeItem, onWorkspacePageChange])

  const selectWorkspacePage = (item) => {
    onWorkspacePageChange?.(item)
  }

  const openWorkspaceFile = (file) => {
    if (!file || file.type === 'folder') return
    setOpenTabs((current) => {
      if (current.includes(file.id)) return current
      return [...current, file.id]
    })
    setActiveTabId(file.id)
    const section = FILE_TYPES[file.kind]?.section
    if (section) selectWorkspacePage(section)
  }

  const createWorkspaceFile = (kind, parentId = null) => {
    const typeInfo = FILE_TYPES[kind]
    if (!typeInfo) return null
    const timestamp = new Date().toISOString()
    const sameKindCount = workspaceFiles.filter((file) => file.kind === kind).length + 1
    const file = {
      id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'file',
      kind,
      name: `Untitled ${typeInfo.label} ${sameKindCount}.${typeInfo.extension}`,
      parentId,
      createdBy: getDisplayName(user),
      createdAt: timestamp,
      updatedAt: timestamp,
      unsaved: false
    }
    setWorkspaceFiles((current) => [...current, file])
    setOpenTabs((current) => [...current, file.id])
    setActiveTabId(file.id)
    selectWorkspacePage(typeInfo.section)
    toast.success(`${typeInfo.label} created`)
    return file
  }

  const markActiveFileUnsaved = (unsaved = true) => {
    if (!activeTabId) return
    setWorkspaceFiles((current) =>
      current.map((file) =>
        file.id === activeTabId ? { ...file, unsaved, updatedAt: new Date().toISOString() } : file
      )
    )
  }

  const renameWorkspaceFile = (fileId, nextName) => {
    setWorkspaceFiles((current) =>
      current.map((file) =>
        file.id === fileId ? { ...file, name: nextName, updatedAt: new Date().toISOString(), unsaved: false } : file
      )
    )
  }

  const closeWorkspaceTab = (fileId) => {
    const file = workspaceFiles.find((item) => item.id === fileId)
    if (file?.unsaved && !window.confirm(`Close "${file.name}" with unsaved changes?`)) return

    setOpenTabs((current) => {
      const next = current.filter((id) => id !== fileId)
      if (activeTabId === fileId) {
        setActiveTabId(next[next.length - 1] || '')
      }
      return next
    })
  }

  const reorderWorkspaceTab = (draggedId, targetId) => {
    if (!draggedId || draggedId === targetId) return
    setOpenTabs((current) => {
      const next = current.filter((id) => id !== draggedId)
      const targetIndex = next.indexOf(targetId)
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, draggedId)
      return next
    })
  }

  const resolveRequest = async (requestId, action) => {
    try {
      await api.post(`/api/v1/workspaces/${workspace._id}/join-requests/${requestId}/${action}`, {})
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
      await navigator.clipboard.writeText(
        workspace?.inviteLink || `${window.location.origin}/invite/${workspace?.inviteCode}`
      )
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
        <WorkspaceFileTabs
          files={workspaceFiles}
          tabs={openTabs}
          activeTabId={activeTabId}
          activeFilePath={activeFilePath}
          onOpenFile={openWorkspaceFile}
          onSelectTab={(fileId) => {
            const file = workspaceFiles.find((item) => item.id === fileId)
            if (file) openWorkspaceFile(file)
          }}
          onCloseTab={closeWorkspaceTab}
          onReorderTab={reorderWorkspaceTab}
        />
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
        ) : activeItem === 'chat' ? (
          <WorkspaceChat
            messages={chatMessages}
            userName={getDisplayName(user)}
            onSend={(text) =>
              setChatMessages((current) => [
                ...current,
                {
                  id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  user: getDisplayName(user),
                  text,
                  createdAt: new Date().toISOString()
                }
              ])
            }
          />
        ) : activeItem === 'calendar' ? (
          <Calendar
            calendarList={workspace?.calendar || workspace?.tasks || []}
            workspaceId={workspace?._id}
            userName={getDisplayName(user)}
            onOpenTasksPage={() => selectWorkspacePage('tasks')}
          />
        ) : activeItem === 'tasks' ? (
          <Calendar
            calendarList={workspace?.calendar || workspace?.tasks || []}
            workspaceId={workspace?._id}
            userName={getDisplayName(user)}
            taskViewerPage
          />
        ) : ['documents', 'whiteboard', 'spreadsheet', 'presentation', 'meetings', 'shared-files'].includes(
            activeItem
          ) ? (
          <Suspense fallback={<WorkspaceContentSkeleton activeItem={activeItem} />}>
            {activeItem === 'documents' && (
              <DocumentsSection
                key={activeFile?.kind === 'document' ? activeFile.id : 'documents-empty'}
                workspaceId={workspace?._id}
                userName={getDisplayName(user)}
                activeFile={activeFile?.kind === 'document' ? activeFile : null}
                onCreateFile={() => createWorkspaceFile('document')}
                onRenameFile={renameWorkspaceFile}
                onDirtyChange={markActiveFileUnsaved}
              />
            )}
            {activeItem === 'whiteboard' && (
              <WhiteboardSection
                key={activeFile?.kind === 'whiteboard' ? activeFile.id : 'whiteboard-empty'}
                workspaceId={workspace?._id}
                userName={getDisplayName(user)}
                activeFile={activeFile?.kind === 'whiteboard' ? activeFile : null}
                onDirtyChange={markActiveFileUnsaved}
              />
            )}
            {activeItem === 'spreadsheet' && (
              <SpreadsheetSection
                key={activeFile?.kind === 'spreadsheet' ? activeFile.id : 'spreadsheet-empty'}
                workspaceId={workspace?._id}
                activeFile={activeFile?.kind === 'spreadsheet' ? activeFile : null}
                onDirtyChange={markActiveFileUnsaved}
              />
            )}
            {activeItem === 'presentation' && (
              <PresentationSection
                key={activeFile?.kind === 'presentation' ? activeFile.id : 'presentation-empty'}
                workspaceId={workspace?._id}
                activeFile={activeFile?.kind === 'presentation' ? activeFile : null}
                onDirtyChange={markActiveFileUnsaved}
              />
            )}
            {activeItem === 'meetings' && (
              <MeetingsSection workspaceId={workspace?._id} userName={getDisplayName(user)} />
            )}
            {activeItem === 'shared-files' && (
              <SharedFilesSection workspaceId={workspace?._id} userName={getDisplayName(user)} />
            )}
          </Suspense>
        ) : sectionTitles[activeItem] ? (
          <WorkspaceSection workspace={workspace} title={sectionTitles[activeItem]} />
        ) : (
          <WorkspaceOverview
            workspace={workspace}
            recentFiles={recentFiles}
            pendingTaskCount={pendingTaskCount}
            completedTaskCount={completedTaskCount}
            onCopyInviteLink={copyInviteLink}
            onCreateFile={createWorkspaceFile}
            onOpenFile={openWorkspaceFile}
            onSelectSection={selectWorkspacePage}
          />
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

function WorkspaceFileTabs({ files, tabs, activeTabId, activeFilePath, onSelectTab, onCloseTab, onReorderTab }) {
  const tabFiles = tabs.map((tabId) => files.find((file) => file.id === tabId)).filter(Boolean)
  const folders = files.filter((file) => file.type === 'folder')
  const childFiles = (folderId) => files.filter((file) => file.parentId === folderId && file.type !== 'folder')

  return (
    <div className="mb-5 rounded-[18px] border border-[#E5E7EB] bg-white shadow-sm">
      <div className="flex min-h-11 items-center gap-1 overflow-x-auto border-b border-[#E5E7EB] px-2 py-1.5">
        {tabFiles.length === 0 ? (
          <span className="px-3 text-xs font-medium text-[#9CA3AF]">Open files appear here</span>
        ) : (
          tabFiles.map((file) => {
            const Icon = FILE_TYPES[file.kind]?.icon || FileText
            const active = file.id === activeTabId
            return (
              <button
                key={file.id}
                type="button"
                draggable
                onDragStart={(event) => event.dataTransfer.setData('text/plain', file.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  onReorderTab(event.dataTransfer.getData('text/plain'), file.id)
                }}
                onClick={() => onSelectTab(file.id)}
                className={`group flex h-8 max-w-[220px] shrink-0 items-center gap-2 rounded-[10px] border px-2.5 text-xs font-semibold transition ${
                  active
                    ? 'border-[#C4B5FD] bg-[#F5F3FF] text-[#6D28D9]'
                    : 'border-transparent bg-[#F8FAFC] text-[#374151] hover:border-[#E5E7EB]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{file.name}</span>
                {file.unsaved && <span className="text-[#DC2626]">●</span>}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation()
                    onCloseTab(file.id)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      onCloseTab(file.id)
                    }
                  }}
                  className="ml-1 rounded-full p-0.5 text-[#9CA3AF] opacity-70 transition hover:bg-white hover:text-[#111827] group-hover:opacity-100"
                  aria-label={`Close ${file.name}`}
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            )
          })
        )}
      </div>

      <div className="grid gap-2 px-3 py-2 text-xs text-[#6B7280] lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
        <div className="min-w-0 truncate">
          <span className="font-semibold text-[#374151]">Workspace</span>
          {activeFilePath.map((item) => (
            <span key={item.id}>
              <span className="px-1.5 text-[#CBD5E1]">&gt;</span>
              <span className={item.type === 'folder' ? 'text-[#6B7280]' : 'font-semibold text-[#111827]'}>
                {item.name}
              </span>
            </span>
          ))}
        </div>

        <div className="hidden min-w-0 gap-2 overflow-x-auto lg:flex">
          <span className="shrink-0 font-semibold text-[#374151]">Folders</span>
          {folders.length === 0 ? (
            <span>No folders yet</span>
          ) : (
            folders.map((folder) => (
              <span key={folder.id} className="shrink-0 rounded-full bg-[#F8FAFC] px-2.5 py-1">
                {folder.name} ({childFiles(folder.id).length})
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function WorkspaceOverview({
  workspace,
  recentFiles,
  pendingTaskCount,
  completedTaskCount,
  onCopyInviteLink,
  onCreateFile,
  onOpenFile,
  onSelectSection
}) {
  const quickActions = [
    { label: 'New Document', icon: FileText, action: () => onCreateFile('document') },
    { label: 'New Spreadsheet', icon: TableProperties, action: () => onCreateFile('spreadsheet') },
    { label: 'New Presentation', icon: Presentation, action: () => onCreateFile('presentation') },
    { label: 'New Whiteboard', icon: Paintbrush, action: () => onCreateFile('whiteboard') },
    { label: 'Upload Files', icon: Upload, action: () => onSelectSection('shared-files') },
    { label: 'Start Meeting', icon: Video, action: () => onSelectSection('meetings') }
  ]

  return (
    <section className="space-y-5">
      <div className="rounded-[18px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#F5F3FF] text-xl font-bold text-[#7C3AED]">
              {workspace?.icon || 'T'}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-[#111827]">{workspace?.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
                {workspace?.description || 'No description yet.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-[#047857]">
                  {(workspace?.members || []).length} online
                </span>
                <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-[#374151]">
                  {workspace?.visibility === 'private' ? 'Private' : 'Invite-only'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCopyInviteLink}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[14px] bg-[#7C3AED] px-4 text-sm font-semibold text-white transition hover:bg-[#6D28D9]"
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[18px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#111827]">Recent Files</h2>
          <div className="mt-4 space-y-2">
            {recentFiles.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">
                Files created by teammates will appear here.
              </p>
            ) : (
              recentFiles.map((file) => {
                const Icon = FILE_TYPES[file.kind]?.icon || FileText
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => onOpenFile(file)}
                    className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-[#E5E7EB] px-3 py-2 text-left transition hover:bg-[#F8FAFC]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-[#7C3AED]" />
                      <span className="truncate text-sm font-semibold text-[#111827]">{file.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[#9CA3AF]">{formatTime(file.updatedAt)}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[18px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#111827]">Task Summary</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[14px] bg-[#FFF7ED] p-4">
                <p className="text-xs font-semibold text-[#C2410C]">Pending</p>
                <p className="mt-2 text-2xl font-bold text-[#111827]">{pendingTaskCount}</p>
              </div>
              <div className="rounded-[14px] bg-[#ECFDF5] p-4">
                <p className="text-xs font-semibold text-[#047857]">Completed</p>
                <p className="mt-2 text-2xl font-bold text-[#111827]">{completedTaskCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#111827]">Quick Actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.action}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[#E5E7EB] px-3 text-xs font-semibold text-[#374151] transition hover:border-[#C4B5FD] hover:bg-[#F5F3FF] hover:text-[#6D28D9]"
                  >
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </button>
                )
              })}
            </div>
          </div>
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

function WorkspaceChat({ messages, userName, onSend }) {
  const [draft, setDraft] = useState('')

  const send = () => {
    if (!draft.trim()) return
    onSend(draft.trim())
    setDraft('')
  }

  return (
    <section className="flex h-[calc(100vh-190px)] min-h-[560px] flex-col rounded-[18px] border border-[#E5E7EB] bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#E5E7EB] px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#F5F3FF] text-[#7C3AED]">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111827]">Workspace Chat</h1>
          <p className="text-sm text-[#6B7280]">Messages stay available when you switch workspace pages.</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#F8FAFC] p-5">
        {messages.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#E5E7EB] bg-white p-8 text-center text-sm text-[#6B7280]">
            Start a workspace conversation.
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.user === userName
            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[72%] rounded-[16px] px-4 py-3 shadow-sm ${
                    mine ? 'bg-[#7C3AED] text-white' : 'border border-[#E5E7EB] bg-white text-[#111827]'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-80">
                    <span>{message.user}</span>
                    <span>{formatTime(message.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="flex gap-3 border-t border-[#E5E7EB] p-4">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              send()
            }
          }}
          placeholder="Message the workspace..."
          className="h-11 min-w-0 flex-1 rounded-[14px] border border-[#E5E7EB] px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED]"
        />
        <button
          type="button"
          onClick={send}
          className="h-11 rounded-[14px] bg-[#7C3AED] px-5 text-sm font-semibold text-white transition hover:bg-[#6D28D9]"
        >
          Send
        </button>
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
      await onUpdateWorkspace?.(workspace._id, {
        name,
        description,
        icon,
        joinApproval,
        visibility
      })
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
              <button
                type="button"
                onClick={onCopyInviteLink}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] border border-[#E5E7EB] px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]"
              >
                <UserPlus className="h-4 w-4" />
                Invite Member
              </button>
            </div>

            <div className="space-y-3">
              {(workspace?.members || []).map((member) => {
                const memberId = (member._id || member)?.toString()
                const isWorkspaceOwner = memberId === ownerId

                return (
                  <div
                    key={memberId}
                    className="flex flex-col gap-3 rounded-[18px] border border-[#E5E7EB] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{getDisplayName(member)}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{member.email || 'Workspace member'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#F5F3FF] px-3 py-1 text-xs font-semibold text-[#7C3AED]">
                        {isWorkspaceOwner ? 'Owner' : 'Member'}
                      </span>
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
                  <button
                    type="button"
                    onClick={onCopyInviteLink}
                    className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#7C3AED] text-white transition hover:bg-[#6D28D9]"
                    aria-label="Copy invite link"
                  >
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
      <h2
        className={`mb-4 flex items-center gap-2 text-base font-semibold ${danger ? 'text-[#DC2626]' : 'text-[#111827]'}`}
      >
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
          <button
            type="button"
            onClick={onCopyInviteLink}
            className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-[#E5E7EB] px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]"
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </button>
        </div>

        {!isOwner ? (
          <p className="rounded-[14px] border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">
            Only the workspace owner can review pending requests.
          </p>
        ) : pendingRequests.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-[#E5E7EB] p-4 text-sm text-[#6B7280]">
            No pending requests.
          </p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request._id}
                className="flex flex-col gap-3 rounded-[16px] border border-[#E5E7EB] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{getDisplayName(request.requester)}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">Requested {formatTime(request.requestedAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onResolveRequest(request._id, 'accept')}
                    className="inline-flex h-10 items-center gap-1.5 rounded-[14px] bg-[#7C3AED] px-4 text-sm font-semibold text-white transition hover:bg-[#6D28D9]"
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveRequest(request._id, 'decline')}
                    className="inline-flex h-10 items-center gap-1.5 rounded-[14px] border border-[#E5E7EB] px-4 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]"
                  >
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
            <div
              key={member._id || member}
              className="flex items-center justify-between rounded-[16px] border border-[#E5E7EB] p-4"
            >
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
