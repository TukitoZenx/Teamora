import { useEffect, useRef, useState } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import toast from 'react-hot-toast'
import Documents from '../Documents'
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'

const SAVE_DEBOUNCE_MS = 800

/**
 * Owns the state Documents.jsx expects a parent to manage (comments, version
 * history, the Quill instance itself) and persists it locally per workspace.
 * See src/utils/localCollabChannel.js for the sync/persistence strategy.
 */
export default function DocumentsSection({
  workspaceId,
  userName,
  activeFile,
  onCreateFile,
  onRenameFile,
  onDirtyChange
}) {
  const wrapperRef = useRef(null)
  const quillRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const channel = useLocalCollabChannel(workspaceId, `documents:${activeFile?.id || 'default'}`)

  const [comments, setComments] = useState([])
  const [versions, setVersions] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    channel.on('receive-document-comments', setComments)
    channel.on('receive-document-versions', setVersions)
    return () => {
      channel.off('receive-document-comments', setComments)
      channel.off('receive-document-versions', setVersions)
    }
  }, [channel])

  useEffect(() => {
    if (!wrapperRef.current || quillRef.current) return

    // Documents.jsx looks up its editor instance via `window.Quill.find(...)`
    // instead of owning it directly, so the class must be exposed globally.
    window.Quill = Quill

    const quill = new Quill(wrapperRef.current, {
      theme: 'snow',
      modules: { toolbar: false } // Documents.jsx renders its own toolbar UI
    })
    quillRef.current = quill

    const handleChange = (_delta, _old, source) => {
      if (source !== 'user' && source !== 'api') return
      setIsSaving(true)
      onDirtyChange?.(true)
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        channel.emit('doc-content-sync', { roomId: workspaceId, html: quill.root.innerHTML })
        onDirtyChange?.(false)
        setIsSaving(false)
      }, SAVE_DEBOUNCE_MS)
    }

    quill.on('text-change', handleChange)

    const applyRemoteHtml = (html) => {
      if (typeof html !== 'string' || html === quill.root.innerHTML) return
      const range = quill.getSelection()
      quill.clipboard.dangerouslyPasteHTML(html, 'silent')
      if (range) quill.setSelection(range, 'silent')
    }

    channel.on('receive-doc-content-sync', applyRemoteHtml)

    return () => {
      quill.off('text-change', handleChange)
      channel.off('receive-doc-content-sync', applyRemoteHtml)
      clearTimeout(saveTimeoutRef.current)
    }
  }, [channel, onDirtyChange, workspaceId])

  const handleRevertVersion = (version) => {
    const quill = quillRef.current
    if (!quill || !version) return

    quill.clipboard.dangerouslyPasteHTML(version.data || '', 'silent')
    channel.emit('doc-content-sync', { roomId: workspaceId, html: quill.root.innerHTML })
    toast.success('Reverted to the selected version')
  }

  return (
    <Documents
      wrapperRef={wrapperRef}
      isSaving={isSaving}
      activeUsersCount={1}
      comments={comments}
      versions={versions}
      socket={channel}
      roomId={workspaceId}
      userName={userName}
      activeFileId={activeFile?.id}
      initialTitle={activeFile?.name}
      onCreateNewDocument={onCreateFile}
      onRenameDocument={(title) => activeFile?.id && onRenameFile?.(activeFile.id, title)}
      onRevertVersion={handleRevertVersion}
    />
  )
}
