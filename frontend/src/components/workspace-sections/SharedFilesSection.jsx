import { useMemo, useRef, useState } from 'react'
import {
  FileText,
  TableProperties,
  Presentation,
  Paintbrush,
  Upload,
  FolderOpen,
  Search,
  Trash2,
  FolderPlus,
  Folder,
  Download
} from 'lucide-react'
import toast from 'react-hot-toast'
import * as Y from 'yjs'
import Button from '../ui/Button'
import Input from '../ui/Input'

const fromBase64 = (b64) => {
  const s = atob(b64)
  const u8 = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i += 1) u8[i] = s.charCodeAt(i)
  return u8
}

const extractYjsContent = (res, kind) => {
  const data = res?.data
  if (!data) {
    if (kind === 'document') return ''
    return '[]'
  }

  if (data.format !== 'yjs-v1' || typeof data.state !== 'string') {
    if (kind === 'document') {
      return data.html || ''
    }
    return JSON.stringify(data, null, 2)
  }

  try {
    const ydoc = new Y.Doc()
    Y.applyUpdate(ydoc, fromBase64(data.state))

    if (kind === 'document') {
      const ytext = ydoc.getText('quill').toString()
      const meta = ydoc.getMap('meta')
      const legacyHtml = meta.get('legacyHtml')
      return ytext || legacyHtml || ''
    }

    if (kind === 'whiteboard') {
      const elementsMap = ydoc.getMap('elements')
      const list = []
      elementsMap.forEach((value, key) => {
        if (!value || typeof value !== 'object') return
        const id = typeof value.id === 'string' ? value.id : key
        const el = { ...value, id }
        if (Array.isArray(value.points)) {
          el.points = value.points.map((p) => (p && typeof p === 'object' ? { ...p } : p))
        }
        list.push(el)
      })
      list.sort((a, b) => {
        const ao = Number.isFinite(a.order) ? a.order : 0
        const bo = Number.isFinite(b.order) ? b.order : 0
        if (ao !== bo) return ao - bo
        return String(a.id).localeCompare(String(b.id))
      })
      return JSON.stringify(list, null, 2)
    }

    if (kind === 'spreadsheet') {
      const cellsMap = ydoc.getMap('cells')
      let maxRow = -1
      const entries = []
      cellsMap.forEach((value, key) => {
        if (typeof key !== 'string' || !key.includes(':')) return
        const [rs, cs] = key.split(':')
        const r = Number(rs)
        const c = Number(cs)
        if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) return
        maxRow = Math.max(maxRow, r)
        entries.push([r, c, value == null ? '' : String(value)])
      })
      if (maxRow < 0) return '[]'
      const grid = Array.from({ length: maxRow + 1 }, () => [])
      for (const [r, c, value] of entries) {
        if (!grid[r]) grid[r] = []
        grid[r][c] = value
      }
      return JSON.stringify(grid, null, 2)
    }

    if (kind === 'presentation') {
      const slidesMap = ydoc.getMap('slides')
      const list = []
      slidesMap.forEach((value, key) => {
        if (!value || typeof value !== 'object') return
        const plain = { ...value }
        const id = typeof plain.id === 'string' && plain.id ? plain.id : key
        list.push({
          ...plain,
          id,
          elements: Array.isArray(plain.elements) ? plain.elements : []
        })
      })
      list.sort((a, b) => {
        const ao = Number.isFinite(a.order) ? a.order : 0
        const bo = Number.isFinite(b.order) ? b.order : 0
        if (ao !== bo) return ao - bo
        return String(a.id).localeCompare(String(b.id))
      })
      return JSON.stringify(list, null, 2)
    }
  } catch (err) {
    console.error('Yjs decode failed', err)
  }

  if (kind === 'document') return ''
  return '[]'
}

const EXT_KIND = {
  doc: 'document',
  docx: 'document',
  txt: 'document',
  md: 'document',
  html: 'document',
  xlsx: 'spreadsheet',
  xls: 'spreadsheet',
  csv: 'spreadsheet',
  pptx: 'presentation',
  ppt: 'presentation',
  board: 'whiteboard',
  png: 'document',
  jpg: 'document',
  jpeg: 'document',
  gif: 'document',
  webp: 'document',
  pdf: 'document'
}

const kindIcon = {
  document: FileText,
  spreadsheet: TableProperties,
  presentation: Presentation,
  whiteboard: Paintbrush
}

const inferKind = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return EXT_KIND[ext] || 'document'
}

/**
 * Shared Files — collaborative file tree + imports into editors.
 * Save/upload defaults to Active Folder; hierarchy syncs via files-v1.
 */
export default function SharedFilesSection({
  workspaceId,
  userName,
  workspaceFiles = [],
  activeFolderId = null,
  onCreateWorkspaceFile,
  onOpenWorkspaceFile,
  onSelectFolder,
  onDeleteFile,
  onCreateFolder,
  onFilesChange
}) {
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [dragging, setDragging] = useState(false)

  const folders = useMemo(() => (workspaceFiles || []).filter((f) => f?.type === 'folder'), [workspaceFiles])

  const files = useMemo(() => {
    const list = (workspaceFiles || []).filter((f) => f && f.type !== 'folder')
    const scoped = activeFolderId ? list.filter((f) => f.parentId === activeFolderId) : list.filter((f) => !f.parentId)
    if (!query.trim()) return scoped
    const q = query.toLowerCase()
    return list.filter((f) => f.name?.toLowerCase().includes(q))
  }, [workspaceFiles, activeFolderId, query])

  const activeFolder = folders.find((f) => f.id === activeFolderId)

  const seedContent = async (file, kind, content) => {
    if (!workspaceId || content == null) return
    try {
      const { putWorkspaceContent } = await import('../../services/workspaceContent')
      if (kind === 'document' && typeof content === 'string' && !content.startsWith('data:')) {
        await putWorkspaceContent(workspaceId, `documents:${file.id}`, { html: content })
      }
    } catch {
      // best-effort
    }
  }

  const importBrowserFiles = (fileList) => {
    Array.from(fileList || []).forEach((browserFile) => {
      const kind = inferKind(browserFile.name)
      const reader = new FileReader()
      reader.onload = () => {
        const created = onCreateWorkspaceFile?.(kind, activeFolderId, {
          name: browserFile.name,
          silent: false,
          successMessage: `Saved "${browserFile.name}" to ${activeFolder?.name || 'Root'}`
        })
        if (!created) {
          toast.error(`Could not import ${browserFile.name}`)
          return
        }
        seedContent(created, kind, reader.result)
      }
      reader.onerror = () => toast.error(`Failed to read ${browserFile.name}`)
      if (browserFile.type.startsWith('text/') || /\.(csv|md|html|txt)$/i.test(browserFile.name)) {
        reader.readAsText(browserFile)
      } else {
        reader.readAsDataURL(browserFile)
      }
    })
  }

  const handleDelete = (file) => {
    if (onDeleteFile) {
      onDeleteFile(file.id)
      return
    }
    if (!window.confirm(`Remove "${file.name}"?`)) return
    onFilesChange?.((workspaceFiles || []).filter((f) => f.id !== file.id))
    toast.success('Removed')
  }

  const handleDeleteFolder = (folder) => {
    if (!folder) return
    if (onDeleteFile) {
      onDeleteFile(folder.id)
      return
    }
    toast.error('Delete folder is not available')
  }

  const handleNewFolder = () => {
    const name = window.prompt('Folder name', 'New folder')
    if (!name?.trim()) return
    onCreateFolder?.(name.trim())
  }

  const handleDownloadFile = async (file) => {
    if (!workspaceId) return
    try {
      toast.loading(`Downloading ${file.name}...`, { id: 'download' })
      const { getWorkspaceContent } = await import('../../services/workspaceContent')

      let res = null
      if (file.kind === 'document') {
        res = await getWorkspaceContent(workspaceId, `documents:${file.id}`)
      } else if (file.kind === 'whiteboard') {
        res = await getWorkspaceContent(workspaceId, `whiteboards:${file.id}`)
      } else if (file.kind === 'spreadsheet') {
        res = await getWorkspaceContent(workspaceId, `spreadsheets:${file.id}`)
      } else if (file.kind === 'presentation') {
        res = await getWorkspaceContent(workspaceId, `presentations:${file.id}`)
      } else {
        toast.error('Unsupported file kind for download', { id: 'download' })
        return
      }

      const contentData = extractYjsContent(res, file.kind)

      const blob = new Blob([contentData || ''], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Downloaded', { id: 'download' })
    } catch (err) {
      console.error(err)
      toast.error('Failed to download', { id: 'download' })
    }
  }

  const handleDownloadFolder = async (folder) => {
    if (!workspaceId) return
    try {
      toast.loading(`Zipping folder...`, { id: 'zip' })
      const { downloadZip } = await import('client-zip')
      const { getWorkspaceContent } = await import('../../services/workspaceContent')

      async function* getFiles() {
        const fetchFolderContents = async function* (folderId, path = '') {
          const children = (workspaceFiles || []).filter((f) => f.parentId === folderId)
          for (const child of children) {
            if (child.type === 'folder') {
              yield* fetchFolderContents(child.id, `${path}${child.name}/`)
            } else {
              let contentData = ''
              try {
                let res = null
                if (child.kind === 'document') {
                  res = await getWorkspaceContent(workspaceId, `documents:${child.id}`)
                } else if (child.kind === 'whiteboard') {
                  res = await getWorkspaceContent(workspaceId, `whiteboards:${child.id}`)
                } else if (child.kind === 'spreadsheet') {
                  res = await getWorkspaceContent(workspaceId, `spreadsheets:${child.id}`)
                } else if (child.kind === 'presentation') {
                  res = await getWorkspaceContent(workspaceId, `presentations:${child.id}`)
                }
                contentData = extractYjsContent(res, child.kind)
              } catch (e) {
                console.error(e)
              }
              yield {
                name: `${path}${child.name}`,
                lastModified: new Date(),
                input: contentData || ''
              }
            }
          }
        }
        yield* fetchFolderContents(folder.id, `${folder.name || 'Shared_Files'}/`)
      }

      const response = downloadZip(getFiles())

      if (window.showSaveFilePicker) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: `${folder.name || 'Shared_Files'}.zip`
          })
          const writable = await fileHandle.createWritable()
          await response.body.pipeTo(writable)
          toast.success('Downloaded folder', { id: 'zip' })
          return
        } catch (e) {
          if (e.name !== 'AbortError') {
            console.error(e)
            toast.error('Failed to save file', { id: 'zip' })
          } else {
            toast.dismiss('zip')
          }
          return
        }
      }

      const blob = await response.blob()
      const element = document.createElement('a')
      element.href = URL.createObjectURL(blob)
      element.download = `${folder.name || 'Shared_Files'}.zip`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      URL.revokeObjectURL(element.href)
      toast.success('Downloaded folder', { id: 'zip' })
    } catch (err) {
      console.error(err)
      toast.error('Failed to download folder', { id: 'zip' })
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text">Shared Files</h1>
          <p className="text-sm text-muted">
            Uploads go to <span className="font-semibold text-primary">{activeFolder?.name || 'Root'}</span>· hierarchy
            syncs for all collaborators
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              className="h-10 w-44 pl-9 sm:w-52"
            />
          </div>
          <Button type="button" variant="secondary" className="h-10" onClick={handleNewFolder}>
            <FolderPlus className="h-4 w-4" />
            Folder
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              importBrowserFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <Button type="button" className="h-10" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Folder rail */}
        <aside className="flex w-44 shrink-0 flex-col border-r border-border bg-card-sunken/60 sm:w-52">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted">Folders</p>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
            <button
              type="button"
              onClick={() => onSelectFolder?.(null)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold ${
                !activeFolderId ? 'bg-primary/15 text-primary' : 'text-text hover:bg-primary/10'
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Root
            </button>
            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`group flex w-full items-center gap-1 rounded-lg px-1 py-0.5 ${
                  activeFolderId === folder.id ? 'bg-primary/15' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectFolder?.(folder.id)}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold ${
                    activeFolderId === folder.id ? 'text-primary' : 'text-text hover:bg-primary/10'
                  }`}
                >
                  <Folder className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </button>
                <button
                  type="button"
                  title="Download folder"
                  className="shrink-0 rounded p-1 text-muted opacity-0 hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownloadFolder(folder)
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete folder and contents"
                  className="shrink-0 rounded p-1 text-muted opacity-0 hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteFolder(folder)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <div
          className={`m-3 flex min-h-0 min-w-0 flex-1 flex-col rounded-card border-2 border-dashed p-3 transition ${
            dragging ? 'border-primary bg-primary/5' : 'border-border bg-card-sunken'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            importBrowserFiles(e.dataTransfer.files)
          }}
        >
          {files.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted">
              <FolderOpen className="h-10 w-10 text-primary/60" />
              <p>
                Drop files here to save into <strong>{activeFolder?.name || 'Root'}</strong>.
              </p>
              <p className="text-xs">Signed in as {userName}</p>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {files.map((file) => {
                const Icon = kindIcon[file.kind] || FileText
                return (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-button border border-border bg-card px-3 py-2"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => onOpenWorkspaceFile?.(file)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-text">{file.name}</span>
                        <span className="text-[11px] text-muted">
                          {file.kind || 'file'} · {file.createdBy || 'team'}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button type="button" className="h-8 px-2 text-xs" onClick={() => onOpenWorkspaceFile?.(file)}>
                        Open
                      </Button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-muted hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadFile(file)
                        }}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(file)
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
