import { useCallback, useEffect, useRef, useState } from 'react'
import Quill from 'quill'
import QuillCursors from 'quill-cursors'
import 'quill/dist/quill.snow.css'
import 'quill-cursors/css'
import * as Y from 'yjs'
import { QuillBinding } from 'y-quill'
import toast from 'react-hot-toast'
import Documents from '../Documents'
import { getWorkspaceContent, putWorkspaceContent } from '../../services/workspaceContent'
import { connectRestYjsProvider } from '../../services/restYjsProvider'
import { pickPresenceColor } from '../../services/collabSocket'

const FONT_WHITELIST = ['Sans-Serif', 'Serif', 'Monospace', 'Georgia', 'Courier New', 'Trebuchet MS']
const SIZE_WHITELIST = ['12px', '14px', '16px', '18px', '24px', '32px']

let formatsRegistered = false
const registerQuillFormats = () => {
  if (formatsRegistered) return
  try {
    const Font = Quill.import('formats/font')
    Font.whitelist = FONT_WHITELIST
    Quill.register(Font, true)

    const Size = Quill.import('attributors/style/size')
    Size.whitelist = SIZE_WHITELIST
    Quill.register(Size, true)

    Quill.register('modules/cursors', QuillCursors)

    formatsRegistered = true
  } catch (error) {
    console.warn('Quill format registration failed', error)
  }
}

const mergeCommentLists = (local, remote) => {
  const byId = new Map()
  ;[...(Array.isArray(local) ? local : []), ...(Array.isArray(remote) ? remote : [])].forEach((c) => {
    if (!c?.id) return
    const prev = byId.get(c.id)
    if (!prev) {
      byId.set(c.id, c)
      return
    }
    const pt = new Date(prev.updatedAt || prev.createdAt || 0).getTime()
    const ct = new Date(c.updatedAt || c.createdAt || 0).getTime()
    if (ct >= pt) byId.set(c.id, { ...prev, ...c })
  })
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  )
}

const mergeVersionLists = (local, remote) => {
  const byId = new Map()
  ;[...(Array.isArray(local) ? local : []), ...(Array.isArray(remote) ? remote : [])].forEach((v) => {
    const id = v?.versionId || v?.id
    if (!id) return
    if (!byId.has(id)) byId.set(id, { ...v, versionId: id })
  })
  return Array.from(byId.values())
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime()
    )
    .slice(0, 50)
}

/**
 * Collaborative Documents via Yjs + REST + optional WS fanout/cursors.
 * Comments/versions use merge-by-id list formats on the content API.
 */
export default function DocumentsSection({
  workspaceId,
  userName,
  activeFile,
  onCreateFile,
  onRenameFile,
  onDirtyChange,
  onSaveToActiveFolder,
  onSaveAs
}) {
  const mountElRef = useRef(null)
  const quillRef = useRef(null)
  const ydocRef = useRef(null)
  const bindingRef = useRef(null)
  const providerRef = useRef(null)
  const cursorsRef = useRef(null)
  const removedCommentsRef = useRef({})
  const onDirtyChangeRef = useRef(onDirtyChange)

  const [comments, setComments] = useState([])
  const [versions, setVersions] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  const [activeUsersCount, setActiveUsersCount] = useState(1)

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange
  }, [onDirtyChange])

  // Body editor + Yjs + cursors
  useEffect(() => {
    const mountEl = mountElRef.current
    if (!mountEl || !workspaceId || !activeFile?.id) return undefined

    registerQuillFormats()
    window.Quill = Quill
    mountEl.innerHTML = ''
    setEditorReady(false)
    setActiveUsersCount(1)

    const contentKey = `documents:${activeFile.id}`
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    const ytext = ydoc.getText('quill')
    const presenceColor = pickPresenceColor(userName || 'user')

    const provider = connectRestYjsProvider(ydoc, {
      workspaceId,
      key: contentKey,
      pollMs: 1200,
      user: { name: userName || 'User', color: presenceColor },
      onWsStatus: (status) => {
        if (status === 'joined') setActiveUsersCount(2)
        if (status === 'closed' || status === 'error') setActiveUsersCount(1)
      },
      onAwareness: (msg) => {
        const cursors = cursorsRef.current
        if (!cursors || !msg?.clientId) return
        const name = msg.user?.name || 'Collaborator'
        const color = msg.user?.color || '#6366f1'
        try {
          cursors.createCursor(msg.clientId, name, color)
          setActiveUsersCount((n) => Math.max(n, 2))
          if (msg.cursor && typeof msg.cursor.index === 'number') {
            cursors.moveCursor(msg.clientId, {
              index: msg.cursor.index,
              length: msg.cursor.length || 0
            })
          } else {
            cursors.removeCursor(msg.clientId)
          }
        } catch {
          // ignore cursor module errors
        }
      },
      onPeerLeave: (clientId) => {
        try {
          cursorsRef.current?.removeCursor?.(clientId)
        } catch {
          // ignore
        }
        setActiveUsersCount(1)
      }
    })
    providerRef.current = provider



    const quill = new Quill(mountEl, {
      theme: 'snow',
      modules: {
        toolbar: false,
        cursors: {
          transformOnTextChange: true
        },
        history: {
          userOnly: true
        }
      },
      placeholder: 'Start writing…'
    })
    quillRef.current = quill
    cursorsRef.current = quill.getModule('cursors')

    const binding = new QuillBinding(ytext, quill)
    bindingRef.current = binding

    setEditorReady(true)

    let dirtyTimer = null
    const markDirty = () => {
      onDirtyChangeRef.current?.(true)
      setIsSaving(true)
      if (dirtyTimer) window.clearTimeout(dirtyTimer)
      dirtyTimer = window.setTimeout(() => {
        setIsSaving(false)
        onDirtyChangeRef.current?.(false)
      }, 600)
    }
    ydoc.on('update', (_u, origin) => {
      if (origin !== 'remote') markDirty()
    })

    // Broadcast local selection for remote cursors (throttled).
    let awarenessTimer = null
    const publishSelection = () => {
      const range = quill.getSelection()
      if (!range) {
        provider.sendAwareness?.(null)
        return
      }
      provider.sendAwareness?.({ index: range.index, length: range.length || 0 })
    }
    const onSelectionChange = (_range, _old, source) => {
      if (source !== 'user' && source !== 'api' && source !== 'silent') return
      if (awarenessTimer) return
      awarenessTimer = window.setTimeout(() => {
        awarenessTimer = null
        publishSelection()
      }, 80)
    }
    quill.on('selection-change', onSelectionChange)

    let cancelled = false
    const migrateLegacy = async () => {
      try {
        await provider.pull()
        if (cancelled) return
        if (ytext.length > 1) return

        const content = await getWorkspaceContent(workspaceId, contentKey)
        const html = content?.data?.html
        if (typeof html === 'string' && html.trim() && ytext.length <= 1) {
          quill.clipboard.dangerouslyPasteHTML(html, 'user')
          await provider.flush()
        }
      } catch {
        // Offline — start empty / local only.
      }
    }
    migrateLegacy()

    queueMicrotask(() => {
      try {
        quill.focus()
      } catch {
        // ignore
      }
    })

    return () => {
      cancelled = true
      if (dirtyTimer) window.clearTimeout(dirtyTimer)
      if (awarenessTimer) window.clearTimeout(awarenessTimer)
      quill.off('selection-change', onSelectionChange)
      try {
        provider.flush?.()
      } catch {
        // ignore
      }
      binding.destroy?.()
      bindingRef.current = null
      provider.destroy?.()
      providerRef.current = null
      cursorsRef.current = null
      ydoc.destroy()
      ydocRef.current = null
      quillRef.current = null
      setEditorReady(false)
    }
  }, [workspaceId, activeFile?.id, userName])

  // Comments + versions poll / hydrate
  useEffect(() => {
    if (!workspaceId || !activeFile?.id) return undefined
    const commentsKey = `documents-comments:${activeFile.id}`
    const versionsKey = `documents-versions:${activeFile.id}`
    let cancelled = false

    const pullLists = async () => {
      try {
        const [cRes, vRes] = await Promise.all([
          getWorkspaceContent(workspaceId, commentsKey),
          getWorkspaceContent(workspaceId, versionsKey)
        ])
        if (cancelled) return

        const remoteComments = cRes?.data?.comments
        const remoteRemoved = cRes?.data?.removed
        if (remoteRemoved && typeof remoteRemoved === 'object') {
          removedCommentsRef.current = { ...removedCommentsRef.current, ...remoteRemoved }
        }
        if (Array.isArray(remoteComments)) {
          setComments((local) => {
            const merged = mergeCommentLists(local, remoteComments)
            return merged.filter((c) => {
              const tomb = removedCommentsRef.current[c.id]
              if (!tomb) return true
              return new Date(c.updatedAt || c.createdAt || 0).getTime() > new Date(tomb).getTime()
            })
          })
        }

        const remoteVersions = vRes?.data?.versions
        if (Array.isArray(remoteVersions)) {
          setVersions((local) => mergeVersionLists(local, remoteVersions))
        }
      } catch {
        // offline
      }
    }

    pullLists()
    const timer = window.setInterval(pullLists, 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [workspaceId, activeFile?.id])

  const forceSave = useCallback(async () => {
    try {
      await providerRef.current?.flush?.()
      // If Active Folder differs from file location, move on Save.
      const moved = onSaveToActiveFolder?.()
      setIsSaving(false)
      onDirtyChangeRef.current?.(false)
      toast.success(moved ? 'Document saved to Active Folder' : 'Document saved')
    } catch {
      toast.error('Could not save document')
    }
  }, [onSaveToActiveFolder])

  const handleSaveAs = useCallback(async () => {
    try {
      await providerRef.current?.flush?.()
      const quill = quillRef.current
      const html = quill?.root?.innerHTML || ''
      const name = window.prompt(
        'Save As — file name',
        `${activeFile?.name?.replace(/\.[^.]+$/, '') || 'Document'} (Copy).doc`
      )
      if (!name?.trim()) return
      onSaveAs?.({
        name: name.trim(),
        initialHtml: html,
        successMessage: `Saved as "${name.trim()}"`
      })
    } catch {
      toast.error('Save As failed')
    }
  }, [activeFile, onSaveAs])

  const handleDuplicate = useCallback(
    async ({ title, html }) => {
      onCreateFile?.({
        name: title || `${activeFile?.name || 'Document'} (Copy)`,
        initialHtml: html,
        successMessage: 'Document duplicated'
      })
    },
    [activeFile?.name, onCreateFile]
  )

  const handleRevertVersion = useCallback((version) => {
    const quill = quillRef.current
    if (!quill || !version?.data) return
    quill.clipboard.dangerouslyPasteHTML(version.data, 'user')
    providerRef.current?.flush?.()
    toast.success('Reverted to the selected version')
  }, [])

  const handleSaveDraft = useCallback(() => {
    const quill = quillRef.current
    if (!quill || !workspaceId || !activeFile?.id) return
    const now = new Date().toISOString()
    const draftVersion = {
      versionId: `ver-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: `${new Date().toLocaleTimeString()} ${new Date().toLocaleDateString()}`,
      createdAt: now,
      user: userName,
      data: quill.root.innerHTML
    }
    setVersions((current) => {
      const next = mergeVersionLists([draftVersion], current)
      putWorkspaceContent(workspaceId, `documents-versions:${activeFile.id}`, {
        format: 'versions-v1',
        versions: [draftVersion]
      }).catch(() => {})
      return next
    })
    toast.success('Draft saved to Version History!')
  }, [activeFile, userName, workspaceId])

  const handleAddComment = useCallback(
    (text) => {
      if (!text?.trim() || !workspaceId || !activeFile?.id) return
      const now = new Date().toISOString()
      const commentObj = {
        id: `comment-${Math.random().toString(36).slice(2, 9)}`,
        user: userName || 'User',
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: now,
        updatedAt: now
      }
      setComments((current) => {
        const next = mergeCommentLists(current, [commentObj])
        putWorkspaceContent(workspaceId, `documents-comments:${activeFile.id}`, {
          format: 'comments-v1',
          comments: [commentObj],
          removed: {}
        }).catch(() => {})
        return next
      })
      toast.success('Comment thread added!')
    },
    [activeFile, userName, workspaceId]
  )

  const handleDeleteComment = useCallback(
    (commentId) => {
      if (!commentId || !workspaceId || !activeFile?.id) return
      const ts = new Date().toISOString()
      removedCommentsRef.current = { ...removedCommentsRef.current, [commentId]: ts }
      setComments((current) => current.filter((c) => c.id !== commentId))
      putWorkspaceContent(workspaceId, `documents-comments:${activeFile.id}`, {
        format: 'comments-v1',
        comments: [],
        removed: { [commentId]: ts }
      }).catch(() => {})
      toast.success('Comment resolved.')
    },
    [activeFile, workspaceId]
  )

  return (
    <Documents
      mountElRef={mountElRef}
      quillRef={quillRef}
      editorReady={editorReady}
      isSaving={isSaving}
      activeUsersCount={activeUsersCount}
      comments={comments}
      versions={versions}
      socket={null}
      roomId={workspaceId}
      userName={userName}
      initialTitle={activeFile?.name}
      onCreateNewDocument={() => onCreateFile?.()}
      onRenameDocument={(title) => activeFile?.id && onRenameFile?.(activeFile.id, title)}
      onDuplicateDocument={handleDuplicate}
      onForceSave={forceSave}
      onSaveAs={handleSaveAs}
      onSaveDraft={handleSaveDraft}
      onDirtyChange={onDirtyChange}
      onRevertVersion={handleRevertVersion}
      onAddComment={handleAddComment}
      onDeleteComment={handleDeleteComment}
    />
  )
}
