import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  X,
  Plus
} from 'lucide-react'
import toast from 'react-hot-toast'
import WorkspaceLayout from '../features/workspace/components/WorkspaceLayout'
import api from '../services/api'
import useLocalCollabChannel from '../hooks/useLocalCollabChannel'
import { useAuth } from '../hooks/useAuth'
import Calendar from './Calendar'
import ConfirmDialog from './ConfirmDialog'
import Switch from './ui/Switch'
import Button from './ui/Button'
import Input from './ui/Input'
import Textarea from './ui/Textarea'
import { addWorkspaceNotification } from './utils/notifications'
import { getWorkspaceContent, putWorkspaceContent } from '../services/workspaceContent'

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
const fileRemovedStoreKey = (workspaceId) => `teamora-workspace-files-removed:${workspaceId}`
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

/** Client-side merge aligned with backend mergeFilesPayload (files-v1). */
const mergeFileTreesLocal = (localFiles = [], remoteFiles = [], localRemoved = {}, remoteRemoved = {}) => {
  const removed = { ...localRemoved }
  Object.entries(remoteRemoved || {}).forEach(([id, ts]) => {
    const prev = removed[id]
    if (!prev || new Date(ts).getTime() >= new Date(prev).getTime()) removed[id] = ts
  })

  const byId = new Map()
  ;[...(localFiles || []), ...(remoteFiles || [])].forEach((file) => {
    if (!file?.id) return
    const prev = byId.get(file.id)
    if (!prev) {
      byId.set(file.id, file)
      return
    }
    const prevT = new Date(prev.updatedAt || 0).getTime()
    const nextT = new Date(file.updatedAt || 0).getTime()
    if (nextT >= prevT) byId.set(file.id, { ...prev, ...file })
  })

  const files = Array.from(byId.values()).filter((file) => {
    const tomb = removed[file.id]
    if (!tomb) return true
    return new Date(file.updatedAt || 0).getTime() > new Date(tomb).getTime()
  })

  return { files, removed }
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
  const [removedFiles, setRemovedFiles] = useState(() =>
    workspaceId ? readStoredJson(fileRemovedStoreKey(workspaceId), {}) : {}
  )
  const [openTabs, setOpenTabs] = useState(() => (workspaceId ? readStoredJson(tabsStoreKey(workspaceId), []) : []))
  const [activeTabId, setActiveTabId] = useState(() =>
    workspaceId ? localStorage.getItem(activeTabStoreKey(workspaceId)) || '' : ''
  )
  const [chatMessages, setChatMessages] = useState(() =>
    workspaceId ? readStoredJson(`teamora-workspace-chat:${workspaceId}`, []) : []
  )
  const [activeFolderId, setActiveFolderId] = useState(null)
  const filesChannel = useLocalCollabChannel(workspaceId, 'files')
  const chatChannel = useLocalCollabChannel(workspaceId, 'chat')
  const removedFilesRef = useRef(removedFiles)
  const workspaceFilesRef = useRef(workspaceFiles)
  const chatMessagesRef = useRef(chatMessages)

  useEffect(() => {
    removedFilesRef.current = removedFiles
  }, [removedFiles])
  useEffect(() => {
    workspaceFilesRef.current = workspaceFiles
  }, [workspaceFiles])
  useEffect(() => {
    chatMessagesRef.current = chatMessages
  }, [chatMessages])

  useEffect(() => {
    if (!workspaceId) return
    const handleReceiveFiles = (files) => {
      if (Array.isArray(files)) {
        setWorkspaceFiles((current) => {
          const merged = mergeFileTreesLocal(current, files, removedFilesRef.current, {})
          return merged.files
        })
      }
    }
    filesChannel.on('receive-files', handleReceiveFiles)
    return () => filesChannel.off('receive-files', handleReceiveFiles)
  }, [filesChannel, workspaceId])

  // Multi-device file tree: poll + merge-by-id (never blind-replace).
  useEffect(() => {
    if (!workspaceId) return undefined
    let cancelled = false

    const pullFiles = () => {
      getWorkspaceContent(workspaceId, 'files')
        .then((content) => {
          if (cancelled) return
          const data = content?.data
          const remoteFiles = Array.isArray(data?.files) ? data.files : []
          const remoteRemoved = data?.removed && typeof data.removed === 'object' ? data.removed : {}
          if (remoteFiles.length === 0 && Object.keys(remoteRemoved).length === 0) return

          const merged = mergeFileTreesLocal(
            workspaceFilesRef.current,
            remoteFiles,
            removedFilesRef.current,
            remoteRemoved
          )
          setRemovedFiles(merged.removed)
          writeStoredJson(fileRemovedStoreKey(workspaceId), merged.removed)
          setWorkspaceFiles(merged.files)
          filesChannel.emit('update-files', { roomId: workspaceId, files: merged.files })
        })
        .catch(() => {
          // Offline — localStorage/channel remains authoritative.
        })
    }

    pullFiles()
    const timer = window.setInterval(pullFiles, 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [workspaceId, filesChannel])

  const mergeChatMessages = (a = [], b = []) => {
    const byId = new Map()
    ;[...a, ...b].forEach((msg) => {
      if (!msg?.id) return
      byId.set(msg.id, msg)
    })
    return Array.from(byId.values()).sort(
      (x, y) => new Date(x.createdAt || 0).getTime() - new Date(y.createdAt || 0).getTime()
    )
  }

  useEffect(() => {
    if (!workspaceId) return
    const handleReceiveChat = (messages) => {
      if (Array.isArray(messages)) {
        setChatMessages((local) => mergeChatMessages(local, messages))
      }
    }
    chatChannel.on('chat-messages', handleReceiveChat)
    return () => chatChannel.off('chat-messages', handleReceiveChat)
  }, [chatChannel, workspaceId])

  // Multi-device chat sync via content API
  useEffect(() => {
    if (!workspaceId) return undefined
    let cancelled = false
    const pullChat = () => {
      getWorkspaceContent(workspaceId, 'chat')
        .then((content) => {
          if (cancelled) return
          const remote = content?.data?.messages
          if (Array.isArray(remote)) {
            setChatMessages((local) => mergeChatMessages(local, remote))
          }
        })
        .catch(() => {})
    }
    pullChat()
    const timer = window.setInterval(pullChat, 3500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [workspaceId])
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

  useEffect(() => {
    if (!workspaceId) return
    writeStoredJson(fileStoreKey(workspaceId), workspaceFiles)
  }, [workspaceFiles, workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    writeStoredJson(fileRemovedStoreKey(workspaceId), removedFiles)
  }, [removedFiles, workspaceId])

  // Debounced multi-device file tree sync (files-v1 with tombstones)
  useEffect(() => {
    if (!workspaceId) return undefined
    const timer = window.setTimeout(() => {
      putWorkspaceContent(workspaceId, 'files', {
        format: 'files-v1',
        files: workspaceFiles,
        removed: removedFiles
      }).catch(() => {})
    }, 900)
    return () => window.clearTimeout(timer)
  }, [workspaceFiles, removedFiles, workspaceId])

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

  // Intentionally do NOT force the active section from the active file.
  // Users must be free to switch Documents → Presentation (etc.) while open
  // file tabs stay in the tab bar; clicking a tab re-opens that file's section.

  const selectWorkspacePage = useCallback(
    (item) => {
      // When leaving a section that doesn't own the active file, clear the
      // active tab selection so the heavy editor unmounts and the sidebar
      // navigation is never blocked by an overlay/stuck editor state.
      // Open tabs remain so the user can return with one click.
      const active = workspaceFiles.find((file) => file.id === activeTabId)
      if (active && FILE_TYPES[active.kind]?.section !== item) {
        setActiveTabId('')
      }
      onWorkspacePageChange?.(item)
    },
    [activeTabId, onWorkspacePageChange, workspaceFiles]
  )

  const markActiveFileUnsaved = useCallback(
    (unsaved = true) => {
      if (!activeTabId) return
      setWorkspaceFiles((current) => {
        const next = current.map((file) =>
          file.id === activeTabId ? { ...file, unsaved, updatedAt: new Date().toISOString() } : file
        )
        filesChannel.emit('update-files', { roomId: workspaceId, files: next })
        return next
      })
    },
    [activeTabId, filesChannel, workspaceId]
  )

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

  const createWorkspaceFile = (kind, parentId = null, options = {}) => {
    const typeInfo = FILE_TYPES[kind]
    if (!typeInfo) return null
    const timestamp = new Date().toISOString()
    const sameKindCount = workspaceFiles.filter((file) => file.kind === kind).length + 1
    // Prefer explicit parent, else active folder selection, else root.
    const resolvedParent =
      parentId !== null && parentId !== undefined
        ? parentId
        : options.parentId !== undefined
          ? options.parentId
          : activeFolderId
    const file = {
      id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'file',
      kind,
      name: options.name || `Untitled ${typeInfo.label} ${sameKindCount}.${typeInfo.extension}`,
      parentId: resolvedParent || null,
      createdBy: getDisplayName(user),
      createdAt: timestamp,
      updatedAt: timestamp,
      unsaved: false
    }
    const next = [...workspaceFiles, file]
    setWorkspaceFiles(next)
    filesChannel.emit('update-files', { roomId: workspaceId, files: next })

    // Seed document content for duplicates before the editor mounts.
    if (kind === 'document' && typeof options.initialHtml === 'string') {
      try {
        const storageKey = `teamora:collab:${workspaceId}:documents:${file.id}::receive-doc-content-sync`
        localStorage.setItem(storageKey, JSON.stringify(options.initialHtml))
      } catch {
        // Best-effort seed.
      }
    }

    setOpenTabs((current) => [...current, file.id])
    setActiveTabId(file.id)
    selectWorkspacePage(typeInfo.section)
    if (!options.silent) {
      toast.success(options.successMessage || `${typeInfo.label} created`)
    }
    return file
  }

  const renameWorkspaceFile = (fileId, nextName) => {
    const next = workspaceFiles.map((file) =>
      file.id === fileId ? { ...file, name: nextName, updatedAt: new Date().toISOString(), unsaved: false } : file
    )
    setWorkspaceFiles(next)
    filesChannel.emit('update-files', { roomId: workspaceId, files: next })
  }

  const collectDescendantIds = (rootId) => {
    const ids = new Set([rootId])
    let grew = true
    while (grew) {
      grew = false
      workspaceFiles.forEach((f) => {
        if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
          ids.add(f.id)
          grew = true
        }
      })
    }
    return ids
  }

  const deleteWorkspaceFile = (fileId) => {
    const file = workspaceFiles.find((f) => f.id === fileId)
    if (!file) return

    const isFolder = file.type === 'folder'
    const toDelete = isFolder ? collectDescendantIds(fileId) : new Set([fileId])
    const count = toDelete.size
    const label = isFolder
      ? `Delete folder "${file.name}" and ${count - 1} item(s) inside? This cannot be undone.`
      : `Delete "${file.name}"?`
    if (!window.confirm(label)) return

    const deletedAt = new Date().toISOString()
    const next = workspaceFiles.filter((f) => !toDelete.has(f.id))
    setWorkspaceFiles(next)
    setRemovedFiles((current) => {
      const nextRemoved = { ...current }
      toDelete.forEach((id) => {
        nextRemoved[id] = deletedAt
      })
      writeStoredJson(fileRemovedStoreKey(workspaceId), nextRemoved)
      return nextRemoved
    })
    filesChannel.emit('update-files', { roomId: workspaceId, files: next })
    setOpenTabs((current) => current.filter((id) => !toDelete.has(id)))
    if (toDelete.has(activeTabId)) {
      setActiveTabId('')
    }
    if (isFolder && toDelete.has(activeFolderId)) {
      setActiveFolderId(null)
    }
    toast.success(isFolder ? `Folder and ${count - 1} item(s) deleted` : `"${file.name}" deleted.`)
  }

  const folderLabel = (folderId, files = workspaceFiles) => {
    if (!folderId) return 'Root'
    return files.find((f) => f.id === folderId)?.name || 'folder'
  }

  /** Move existing file into Active Folder (Save when folder changed). */
  const moveFileToActiveFolder = (fileId, { silent = false } = {}) => {
    if (!fileId) return false
    const targetParent = activeFolderId || null
    const file = workspaceFiles.find((f) => f.id === fileId)
    if (!file) return false
    if (file.parentId === targetParent) return false
    const next = workspaceFiles.map((f) =>
      f.id === fileId ? { ...f, parentId: targetParent, updatedAt: new Date().toISOString() } : f
    )
    setWorkspaceFiles(next)
    filesChannel.emit('update-files', { roomId: workspaceId, files: next })
    if (!silent) toast.success(`Saved to ${folderLabel(targetParent, next)}`)
    return true
  }

  /** Save As → new file in Active Folder with optional seed content. */
  const saveAsInActiveFolder = (kind, options = {}) => {
    return createWorkspaceFile(kind, activeFolderId, {
      ...options,
      successMessage:
        options.successMessage || `Saved as new file in ${folderLabel(activeFolderId)}`
    })
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
          activeFolderId={activeFolderId}
          onSelectFolder={(folderId) =>
            setActiveFolderId((current) => (current === folderId ? null : folderId))
          }
          onOpenFile={openWorkspaceFile}
          onSelectTab={(fileId) => {
            const file = workspaceFiles.find((item) => item.id === fileId)
            if (file) openWorkspaceFile(file)
          }}
          onCloseTab={closeWorkspaceTab}
          onReorderTab={reorderWorkspaceTab}
          onCreateFolder={() => {
            const name = window.prompt('Folder name', 'New folder')
            if (!name?.trim()) return
            const timestamp = new Date().toISOString()
            const folder = {
              id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: 'folder',
              name: name.trim(),
              parentId: activeFolderId || null,
              updatedAt: timestamp
            }
            const next = [...workspaceFiles, folder]
            setWorkspaceFiles(next)
            filesChannel.emit('update-files', { roomId: workspaceId, files: next })
            setActiveFolderId(folder.id)
            toast.success(`Folder "${folder.name}" selected for new files`)
          }}
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
            key={[
              workspace?._id,
              workspace?.name,
              workspace?.description,
              workspace?.icon,
              workspace?.joinApproval,
              workspace?.visibility
            ].join('|')}
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
            onSend={(payload) => {
              const message = {
                id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                user: getDisplayName(user),
                text: typeof payload === 'string' ? payload : payload?.text || '',
                attachments: typeof payload === 'object' ? payload?.attachments || [] : [],
                createdAt: new Date().toISOString()
              }
              setChatMessages((current) => {
                const next = mergeChatMessages(current, [message])
                chatChannel.emit('chat-messages', next)
                if (workspaceId) {
                  putWorkspaceContent(workspaceId, 'chat', {
                    format: 'messages-v1',
                    messages: [message]
                  }).catch(() => {})
                }
                return next
              })
            }}
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
            {activeItem === 'documents' &&
              (activeFile?.kind === 'document' ? (
                <DocumentsSection
                  key={activeFile.id}
                  workspaceId={workspace?._id}
                  userName={getDisplayName(user)}
                  activeFile={activeFile}
                  onCreateFile={(options) =>
                    createWorkspaceFile('document', activeFolderId, options || {})
                  }
                  onRenameFile={renameWorkspaceFile}
                  onDirtyChange={markActiveFileUnsaved}
                  onSaveToActiveFolder={() => moveFileToActiveFolder(activeFile.id, { silent: true })}
                  onSaveAs={(options) => saveAsInActiveFolder('document', options || {})}
                />
              ) : (
                <WorkspaceSectionFileList
                  files={workspaceFiles.filter((f) => f.kind === 'document')}
                  icon={FileText}
                  kindLabel="Document"
                  onCreate={() => createWorkspaceFile('document', activeFolderId)}
                  onOpen={openWorkspaceFile}
                  onDelete={deleteWorkspaceFile}
                />
              ))}
            {activeItem === 'whiteboard' &&
              (activeFile?.kind === 'whiteboard' ? (
                <WhiteboardSection
                  key={activeFile.id}
                  workspaceId={workspace?._id}
                  userName={getDisplayName(user)}
                  activeFile={activeFile}
                  onDirtyChange={(dirty) => {
                    markActiveFileUnsaved(dirty)
                    if (!dirty) moveFileToActiveFolder(activeFile.id, { silent: true })
                  }}
                />
              ) : (
                <WorkspaceSectionFileList
                  files={workspaceFiles.filter((f) => f.kind === 'whiteboard')}
                  icon={Paintbrush}
                  kindLabel="Whiteboard"
                  onCreate={() => createWorkspaceFile('whiteboard', activeFolderId)}
                  onOpen={openWorkspaceFile}
                  onDelete={deleteWorkspaceFile}
                />
              ))}
            {activeItem === 'spreadsheet' &&
              (activeFile?.kind === 'spreadsheet' ? (
                <SpreadsheetSection
                  key={activeFile.id}
                  workspaceId={workspace?._id}
                  activeFile={activeFile}
                  onDirtyChange={(dirty) => {
                    markActiveFileUnsaved(dirty)
                    if (!dirty) moveFileToActiveFolder(activeFile.id, { silent: true })
                  }}
                />
              ) : (
                <WorkspaceSectionFileList
                  files={workspaceFiles.filter((f) => f.kind === 'spreadsheet')}
                  icon={TableProperties}
                  kindLabel="Spreadsheet"
                  onCreate={() => createWorkspaceFile('spreadsheet', activeFolderId)}
                  onOpen={openWorkspaceFile}
                  onDelete={deleteWorkspaceFile}
                />
              ))}
            {activeItem === 'presentation' &&
              (activeFile?.kind === 'presentation' ? (
                <PresentationSection
                  key={activeFile.id}
                  workspaceId={workspace?._id}
                  activeFile={activeFile}
                  onDirtyChange={(dirty) => {
                    markActiveFileUnsaved(dirty)
                    if (!dirty) moveFileToActiveFolder(activeFile.id, { silent: true })
                  }}
                />
              ) : (
                <WorkspaceSectionFileList
                  files={workspaceFiles.filter((f) => f.kind === 'presentation')}
                  icon={Presentation}
                  kindLabel="Presentation"
                  onCreate={() => createWorkspaceFile('presentation', activeFolderId)}
                  onOpen={openWorkspaceFile}
                  onDelete={deleteWorkspaceFile}
                />
              ))}
            {activeItem === 'meetings' && (
              <MeetingsSection workspaceId={workspace?._id} userName={getDisplayName(user)} />
            )}
            {activeItem === 'shared-files' && (
              <SharedFilesSection
                workspaceId={workspace?._id}
                userName={getDisplayName(user)}
                workspaceFiles={workspaceFiles}
                activeFolderId={activeFolderId}
                onCreateWorkspaceFile={createWorkspaceFile}
                onOpenWorkspaceFile={openWorkspaceFile}
                onSelectFolder={setActiveFolderId}
                onDeleteFile={deleteWorkspaceFile}
                onCreateFolder={(name) => {
                  const timestamp = new Date().toISOString()
                  const folder = {
                    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    type: 'folder',
                    name: name || 'New folder',
                    parentId: activeFolderId || null,
                    updatedAt: timestamp
                  }
                  const next = [...workspaceFiles, folder]
                  setWorkspaceFiles(next)
                  filesChannel.emit('update-files', { roomId: workspaceId, files: next })
                  setActiveFolderId(folder.id)
                  toast.success(`Folder "${folder.name}" ready for uploads`)
                  return folder
                }}
                onFilesChange={(nextFiles) => {
                  setWorkspaceFiles(nextFiles)
                  filesChannel.emit('update-files', { roomId: workspaceId, files: nextFiles })
                }}
              />
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

function WorkspaceFileTabs({
  files,
  tabs,
  activeTabId,
  activeFilePath,
  activeFolderId,
  onSelectFolder,
  onSelectTab,
  onCloseTab,
  onReorderTab,
  onCreateFolder
}) {
  const tabFiles = tabs.map((tabId) => files.find((file) => file.id === tabId)).filter(Boolean)
  const folders = files.filter((file) => file.type === 'folder')
  const childFiles = (folderId) => files.filter((file) => file.parentId === folderId && file.type !== 'folder')
  const activeFolder = folders.find((f) => f.id === activeFolderId)

  return (
    <div className="mb-5 rounded-card border border-border bg-card shadow-card">
      <div className="flex min-h-11 items-center gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
        {tabFiles.length === 0 ? (
          <span className="px-3 text-xs font-medium text-muted/65">Open files appear here</span>
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
                className={`group flex h-8 max-w-[220px] shrink-0 items-center gap-2 rounded-sm border px-2.5 text-xs font-semibold transition ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent bg-card-sunken text-text hover:border-border'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{file.name}</span>
                {file.unsaved && <span className="text-danger">●</span>}
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
                  className="ml-1 rounded-full p-0.5 text-muted/65 opacity-70 transition hover:bg-card-elevated hover:text-text group-hover:opacity-100"
                  aria-label={`Close ${file.name}`}
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            )
          })
        )}
      </div>

      <div className="grid gap-2 px-3 py-2 text-xs text-muted lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
        <div className="min-w-0 truncate">
          <span className="font-semibold text-text">Workspace</span>
          {activeFilePath.map((item) => (
            <span key={item.id}>
              <span className="px-1.5 text-border">&gt;</span>
              <span className={item.type === 'folder' ? 'text-muted' : 'font-semibold text-text'}>{item.name}</span>
            </span>
          ))}
          {activeFolder && (
            <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              New files → {activeFolder.name}
            </span>
          )}
        </div>

        <div className="flex min-w-0 max-h-28 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="shrink-0 font-semibold text-text">Folders</span>
            <button
              type="button"
              onClick={onCreateFolder}
              className="shrink-0 rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] font-semibold text-muted hover:border-primary hover:text-primary"
            >
              + Folder
            </button>
          </div>
          <div className="flex min-h-0 max-h-20 flex-wrap content-start gap-1.5 overflow-y-auto overflow-x-hidden pr-1">
            <button
              type="button"
              onClick={() => onSelectFolder?.(null)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                !activeFolderId
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card-sunken text-muted hover:border-primary/40'
              }`}
              title="Save new files at workspace root"
            >
              Root
            </button>
            {folders.map((folder) => {
              const selected = folder.id === activeFolderId
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => onSelectFolder?.(folder.id)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    selected
                      ? 'border-primary bg-primary text-on-primary shadow-sm'
                      : 'border-border bg-card-sunken text-text hover:border-primary/40 hover:bg-primary/10'
                  }`}
                  title={selected ? 'Click to deselect folder' : 'Select as destination for new files'}
                >
                  {folder.name} ({childFiles(folder.id).length})
                </button>
              )
            })}
          </div>
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
      <div className="rounded-card border border-border bg-card p-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-input bg-primary/10 text-xl font-bold text-primary">
              {workspace?.icon || 'T'}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-text">{workspace?.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                {workspace?.description || 'No description yet.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-success/10 px-3 py-1 text-success">
                  {(workspace?.members || []).length} online
                </span>
                <span className="rounded-full bg-card-sunken px-3 py-1 text-text">
                  {workspace?.visibility === 'private' ? 'Private' : 'Invite-only'}
                </span>
              </div>
            </div>
          </div>
          <Button type="button" onClick={onCopyInviteLink} className="h-10 shrink-0">
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-card border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-semibold text-text">Recent Files</h2>
          <div className="mt-4 space-y-2">
            {recentFiles.length === 0 ? (
              <p className="rounded-button border border-dashed border-border p-4 text-sm text-muted">
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
                    className="flex w-full items-center justify-between gap-3 rounded-button border border-border px-3 py-2 text-left transition hover:bg-primary/10"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate text-sm font-semibold text-text">{file.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted/65">{formatTime(file.updatedAt)}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <h2 className="text-sm font-semibold text-text">Task Summary</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-button bg-warning/10 p-4 border border-warning/20">
                <p className="text-xs font-semibold text-warning">Pending</p>
                <p className="mt-2 text-2xl font-bold text-text">{pendingTaskCount}</p>
              </div>
              <div className="rounded-button bg-success/10 p-4 border border-success/20">
                <p className="text-xs font-semibold text-success">Completed</p>
                <p className="mt-2 text-2xl font-bold text-text">{completedTaskCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <h2 className="text-sm font-semibold text-text">Quick Actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.action}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-text transition hover:border-primary hover:bg-primary/10 hover:text-primary"
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
        <p className="text-sm font-semibold text-primary">{workspace?.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">{title}</h1>
      </div>

      <div className="rounded-card border border-border bg-card p-6 shadow-card">
        <p className="text-sm font-medium text-muted">No items yet.</p>
      </div>
    </section>
  )
}

function WorkspaceChat({ messages, userName, onSend }) {
  const [draft, setDraft] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState([])
  const fileInputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const addFiles = (fileList) => {
    const files = Array.from(fileList || [])
    files.forEach((file) => {
      if (file.size > 2_000_000) {
        toast.error(`"${file.name}" is too large (max 2MB for chat)`)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setPendingAttachments((current) => [
          ...current,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: reader.result
          }
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  const send = () => {
    if (!draft.trim() && pendingAttachments.length === 0) return
    onSend({ text: draft.trim(), attachments: pendingAttachments })
    setDraft('')
    setPendingAttachments([])
  }

  return (
    <section className="flex h-[calc(100vh-190px)] min-h-[560px] flex-col rounded-card border border-border bg-card shadow-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-button bg-primary/10 text-primary">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text">Workspace Chat</h1>
          <p className="text-sm text-muted">Synced across devices · attach images or files (up to 2MB).</p>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-card-sunken p-5">
        {messages.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-muted">
            Start a workspace conversation.
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.user === userName
            const attachments = Array.isArray(message.attachments) ? message.attachments : []
            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-card px-4 py-3 shadow-card ${
                    mine ? 'bg-primary text-on-primary' : 'border border-border bg-card text-text'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-80">
                    <span>{message.user}</span>
                    <span>{formatTime(message.createdAt)}</span>
                  </div>
                  {message.text ? <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p> : null}
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {attachments.map((att) => {
                        const isImage = String(att.type || '').startsWith('image/')
                        return (
                          <div key={att.id || att.name} className="rounded-lg border border-white/20 bg-black/10 p-2">
                            {isImage && att.dataUrl ? (
                              <a href={att.dataUrl} target="_blank" rel="noreferrer">
                                <img
                                  src={att.dataUrl}
                                  alt={att.name}
                                  className="max-h-48 max-w-full rounded-md object-contain"
                                />
                              </a>
                            ) : (
                              <a
                                href={att.dataUrl}
                                download={att.name}
                                className="flex items-center gap-2 text-xs font-semibold underline"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {att.name || 'Attachment'}
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border bg-card-sunken px-4 py-2">
          {pendingAttachments.map((att) => (
            <span
              key={att.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[11px] font-semibold text-text"
            >
              {att.name}
              <button
                type="button"
                className="text-muted hover:text-danger"
                onClick={() => setPendingAttachments((c) => c.filter((a) => a.id !== att.id))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border p-4 sm:flex-nowrap">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,.pdf,.txt,.doc,.docx,.xlsx,.csv,.json"
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-12 shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Attach
        </Button>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              send()
            }
          }}
          onPaste={(event) => {
            const items = event.clipboardData?.files
            if (items?.length) {
              event.preventDefault()
              addFiles(items)
            }
          }}
          placeholder="Message the workspace..."
          className="min-w-0 flex-1"
        />
        <Button type="button" onClick={send} className="h-12 shrink-0">
          Send
        </Button>
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
          <p className="text-sm font-semibold text-primary">Workspace Settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">Manage {workspace?.name}</h1>
        </div>
        {isOwner && (
          <Button type="button" onClick={saveSettings} disabled={saving} className="h-11 shadow-sm">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SettingsPanel icon={Globe2} title="General">
            <div className="grid gap-4 sm:grid-cols-[96px_1fr]">
              <label className="block">
                <span className="text-sm font-semibold text-text">Icon</span>
                <div className="mt-2 flex h-20 w-20 items-center justify-center rounded-card border border-border bg-primary/10 text-2xl font-bold text-primary">
                  {icon || workspace?.name?.charAt(0)?.toUpperCase() || <Image className="h-5 w-5" />}
                </div>
                <Input
                  value={icon}
                  maxLength={2}
                  disabled={!isOwner}
                  onChange={(event) => setIcon(event.target.value)}
                  className="mt-2 h-10 w-20 text-center"
                  placeholder="AI"
                />
              </label>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-text">Workspace Name</span>
                  <Input
                    value={name}
                    disabled={!isOwner}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-text">Workspace Description</span>
                  <Textarea
                    value={description}
                    disabled={!isOwner}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="mt-2"
                    placeholder="Describe the purpose of this workspace"
                  />
                </label>
              </div>
            </div>
          </SettingsPanel>

          <SettingsPanel icon={Users} title="Members">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted">Review members, roles, and invite access.</p>
              </div>
              <Button type="button" variant="secondary" onClick={onCopyInviteLink} className="h-10">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </div>

            <div className="space-y-3">
              {(workspace?.members || []).map((member) => {
                const memberId = (member._id || member)?.toString()
                const isWorkspaceOwner = memberId === ownerId

                return (
                  <div
                    key={memberId}
                    className="flex flex-col gap-3 rounded-card border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text">{getDisplayName(member)}</p>
                      <p className="mt-1 text-xs text-muted">{member.email || 'Workspace member'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {isWorkspaceOwner ? 'Owner' : 'Member'}
                      </span>
                      {isOwner && !isWorkspaceOwner && (
                        <button
                          type="button"
                          disabled={removingId === memberId}
                          onClick={() => removeMember(member)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-control border border-danger/30 px-3 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-60"
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
                <span className="text-sm font-semibold text-text">Invite Link</span>
                <div className="mt-2 flex gap-2">
                  <Input
                    readOnly
                    value={workspace?.inviteLink || `${window.location.origin}/invite/${workspace?.inviteCode}`}
                    className="h-10 text-xs bg-card-sunken text-muted"
                  />
                  <Button
                    type="button"
                    onClick={onCopyInviteLink}
                    className="h-10 w-10 p-0"
                    aria-label="Copy invite link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <SettingToggle
                label="Join approval"
                description="When visibility is invite-only, new members need your approval before entering."
                checked={joinApproval}
                disabled={!isOwner || visibility === 'private'}
                onChange={() => setJoinApproval((value) => !value)}
              />

              <div>
                <span className="text-sm font-semibold text-text-secondary">Workspace Visibility</span>
                <p className="mt-1 text-xs text-muted">
                  Invite-only: people with the link can request or join. Private: invite links cannot add members.
                </p>
                <div className="mt-2 grid gap-2">
                  {[
                    {
                      value: 'invite_only',
                      label: 'Invite-only',
                      description: 'Join via invite link',
                      icon: Link2
                    },
                    {
                      value: 'private',
                      label: 'Private',
                      description: 'Members only — invites blocked',
                      icon: Shield
                    }
                  ].map((option) => {
                    const OptionIcon = option.icon
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={!isOwner}
                        onClick={() => setVisibility(option.value)}
                        className={`flex h-auto min-h-11 flex-col items-start gap-0.5 rounded-button border px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                          visibility === option.value
                            ? 'border-primary bg-primary-subtle text-primary'
                            : 'border-border text-text-secondary hover:bg-background'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <OptionIcon className="h-4 w-4" />
                          {option.label}
                        </span>
                        <span className="text-xs font-normal opacity-80">{option.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {visibility === 'private' && (
                <p className="rounded-button border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  Private mode is on. Sharing the invite link will not let new people join until you switch back to
                  invite-only.
                </p>
              )}
            </div>
          </SettingsPanel>

          <SettingsPanel icon={Trash2} title="Danger Zone" danger>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setConfirmAction('leave')}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-button border border-danger/30 px-4 text-sm font-semibold text-danger transition hover:bg-danger-subtle"
              >
                <DoorOpen className="h-4 w-4" />
                Leave Workspace
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setConfirmAction('delete')}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-button bg-danger px-4 text-sm font-semibold text-on-primary transition hover:bg-danger-hover"
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
    <section className="rounded-card border border-border bg-card p-5 shadow-card">
      <h2 className={`mb-4 flex items-center gap-2 text-base font-semibold ${danger ? 'text-danger' : 'text-text'}`}>
        <Icon className={`h-4 w-4 ${danger ? 'text-danger' : 'text-primary'}`} />
        {title}
      </h2>
      {children}
    </section>
  )
}

function SettingToggle({ label, description, checked, disabled, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-card border border-border p-4">
      <div>
        <p className="text-sm font-semibold text-text">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onClick={onChange} />
    </div>
  )
}

function MembersAndRequests({ workspace, isOwner, pendingRequests, onCopyInviteLink, onResolveRequest }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Workspace Settings</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">Members</h1>
      </div>

      <div className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">Pending Requests</h2>
            <p className="mt-1 text-sm text-muted">Owners can accept or decline invite-link requests.</p>
          </div>
          <Button type="button" variant="secondary" onClick={onCopyInviteLink} className="h-10">
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        </div>

        {!isOwner ? (
          <p className="text-sm text-muted">Only the workspace owner can manage join requests.</p>
        ) : pendingRequests.length === 0 ? (
          <p className="text-sm text-muted">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request._id}
                className="flex flex-col gap-3 rounded-card border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-text">{getDisplayName(request.requester)}</p>
                  <p className="mt-1 text-xs text-muted">{request.requester?.email || 'Request user'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" onClick={() => onResolveRequest(request._id, 'accept')} className="h-10">
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onResolveRequest(request._id, 'decline')}
                    className="h-10"
                  >
                    <X className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-card border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 inline-flex items-center gap-2 text-base font-semibold text-text">
          <Users className="h-4 w-4 text-primary" />
          Current Members
        </h2>
        <div className="space-y-3">
          {(workspace?.members || []).map((member) => (
            <div
              key={member._id || member}
              className="flex items-center justify-between rounded-card border border-border p-4"
            >
              <div>
                <p className="text-sm font-semibold text-text">{getDisplayName(member)}</p>
                <p className="mt-1 text-xs text-muted">{member.email || 'Member'}</p>
              </div>
              {(member._id || member)?.toString() === getOwnerId(workspace)?.toString() && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Owner</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WorkspaceSectionEmptyState({ icon: Icon, message, btnText, onClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-card bg-card/40 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold text-text mb-2">{message}</h3>
      <p className="text-sm text-muted mb-6 max-w-sm">
        Start by creating a new file to collaborate in real-time with your team.
      </p>
      <Button onClick={onClick} className="h-11 px-6">
        <Plus className="h-4 w-4 mr-2" />
        {btnText}
      </Button>
    </div>
  )
}

function WorkspaceSectionFileList({ files, icon: Icon, kindLabel, onCreate, onOpen, onDelete }) {
  if (files.length === 0) {
    return (
      <WorkspaceSectionEmptyState
        icon={Icon}
        message={`Create your first ${kindLabel.toLowerCase()}`}
        btnText={`Create ${kindLabel}`}
        onClick={onCreate}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-text">{kindLabel}s</h2>
          <p className="text-sm text-muted">Manage and collaborate on your {kindLabel.toLowerCase()}s.</p>
        </div>
        <Button onClick={onCreate} className="h-10 px-4">
          <Plus className="h-4 w-4 mr-2" />
          Create {kindLabel}
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => (
          <article
            key={file.id}
            onClick={() => onOpen(file)}
            className="group relative cursor-pointer rounded-card border border-border bg-card p-5 shadow-card transition duration-normal hover:border-primary"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-text group-hover:text-primary transition">
                  {file.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted">Created by {file.createdBy || 'Unknown'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted border-t border-border pt-3">
              <span>{new Date(file.createdAt).toLocaleDateString()}</span>
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(file.id)
                  }}
                  className="rounded-lg p-1 text-muted hover:bg-danger/10 hover:text-danger transition"
                  title="Delete file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
