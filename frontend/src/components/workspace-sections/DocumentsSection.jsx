import { useCallback, useEffect, useRef, useState } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import toast from 'react-hot-toast'
import Documents from '../Documents'
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'
import { getWorkspaceContent, putWorkspaceContent } from '../../services/workspaceContent'

const SAVE_DEBOUNCE_MS = 800

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

    formatsRegistered = true
  } catch (error) {
    console.warn('Quill format registration failed', error)
  }
}

/**
 * Owns the Quill instance + local/server persistence for one document file.
 * IMPORTANT: do not put unstable callbacks (e.g. onDirtyChange) in the Quill
 * mount effect deps — that remounts the editor on every keystroke.
 */
export default function DocumentsSection({
  workspaceId,
  userName,
  activeFile,
  onCreateFile,
  onRenameFile,
  onDirtyChange
}) {
  const mountElRef = useRef(null)
  const quillRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const onDirtyChangeRef = useRef(onDirtyChange)
  const channel = useLocalCollabChannel(workspaceId, `documents:${activeFile?.id || 'default'}`)

  const [comments, setComments] = useState([])
  const [versions, setVersions] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [editorReady, setEditorReady] = useState(false)

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange
  }, [onDirtyChange])

  useEffect(() => {
    channel.on('receive-document-comments', setComments)
    channel.on('receive-document-versions', setVersions)
    return () => {
      channel.off('receive-document-comments', setComments)
      channel.off('receive-document-versions', setVersions)
    }
  }, [channel])

  useEffect(() => {
    const mountEl = mountElRef.current
    if (!mountEl) return undefined

    registerQuillFormats()
    window.Quill = Quill

    // Clean previous instance if React reused the node.
    mountEl.innerHTML = ''
    setEditorReady(false)

    const quill = new Quill(mountEl, {
      theme: 'snow',
      modules: { toolbar: false },
      placeholder: 'Start writing…'
    })
    quillRef.current = quill
    setEditorReady(true)

    // Keep focus in the editor so continuous typing works after toolbar clicks.
    const editorRoot = quill.root
    editorRoot.setAttribute('spellcheck', 'true')

    const contentKey = `documents:${activeFile?.id || 'default'}`

    const persistServer = (html) => {
      if (!workspaceId) return
      putWorkspaceContent(workspaceId, contentKey, { html }).catch(() => {})
    }

    const flushSave = () => {
      if (!quillRef.current) return
      clearTimeout(saveTimeoutRef.current)
      const html = quillRef.current.root.innerHTML
      channel.emit('doc-content-sync', { roomId: workspaceId, html })
      persistServer(html)
      onDirtyChangeRef.current?.(false)
      setIsSaving(false)
    }

    const handleChange = (_delta, _old, source) => {
      if (source !== 'user' && source !== 'api') return
      setIsSaving(true)
      onDirtyChangeRef.current?.(true)
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS)
    }

    quill.on('text-change', handleChange)

    const applyRemoteHtml = (html) => {
      if (typeof html !== 'string' || !quillRef.current) return
      if (html === quillRef.current.root.innerHTML) return
      const range = quillRef.current.getSelection()
      quillRef.current.clipboard.dangerouslyPasteHTML(html, 'silent')
      if (range) quillRef.current.setSelection(range, 'silent')
    }

    channel.on('receive-doc-content-sync', applyRemoteHtml)

    let cancelled = false
    getWorkspaceContent(workspaceId, contentKey)
      .then((content) => {
        if (cancelled || !quillRef.current) return
        const html = content?.data?.html
        if (typeof html !== 'string' || !html) return
        const text = quillRef.current.getText().replace(/\n/g, '').trim()
        if (!text) {
          applyRemoteHtml(html)
        }
      })
      .catch(() => {})

    // Focus editor so the user can type immediately.
    queueMicrotask(() => {
      try {
        quill.focus()
      } catch {
        // ignore
      }
    })

    return () => {
      cancelled = true
      try {
        if (quillRef.current) {
          const html = quillRef.current.root.innerHTML
          channel.emit('doc-content-sync', { roomId: workspaceId, html })
          persistServer(html)
        }
      } catch {
        // ignore
      }
      quill.off('text-change', handleChange)
      channel.off('receive-doc-content-sync', applyRemoteHtml)
      clearTimeout(saveTimeoutRef.current)
      quillRef.current = null
      setEditorReady(false)
    }
    // Only remount when the file or workspace channel identity changes.
  }, [channel, workspaceId, activeFile?.id])

  const forceSave = useCallback(() => {
    const quill = quillRef.current
    if (!quill) return
    clearTimeout(saveTimeoutRef.current)
    const html = quill.root.innerHTML
    channel.emit('doc-content-sync', { roomId: workspaceId, html })
    const fileId = activeFile?.id
    if (workspaceId && fileId) {
      putWorkspaceContent(workspaceId, `documents:${fileId}`, { html }).catch(() => {})
    }
    onDirtyChangeRef.current?.(false)
    setIsSaving(false)
  }, [activeFile, channel, workspaceId])

  const handleDuplicate = useCallback(
    ({ title, html }) => {
      onCreateFile?.({
        name: title || `${activeFile?.name || 'Document'} (Copy)`,
        initialHtml: html,
        successMessage: 'Document duplicated'
      })
    },
    [activeFile, onCreateFile]
  )

  const handleRevertVersion = useCallback(
    (version) => {
      const quill = quillRef.current
      if (!quill || !version) return
      quill.clipboard.dangerouslyPasteHTML(version.data || '', 'silent')
      channel.emit('doc-content-sync', { roomId: workspaceId, html: quill.root.innerHTML })
      toast.success('Reverted to the selected version')
    },
    [channel, workspaceId]
  )

  return (
    <Documents
      mountElRef={mountElRef}
      quillRef={quillRef}
      editorReady={editorReady}
      isSaving={isSaving}
      activeUsersCount={1}
      comments={comments}
      versions={versions}
      socket={channel}
      roomId={workspaceId}
      userName={userName}
      initialTitle={activeFile?.name}
      onCreateNewDocument={() => onCreateFile?.()}
      onRenameDocument={(title) => activeFile?.id && onRenameFile?.(activeFile.id, title)}
      onDuplicateDocument={handleDuplicate}
      onForceSave={forceSave}
      onDirtyChange={onDirtyChange}
      onRevertVersion={handleRevertVersion}
    />
  )
}
