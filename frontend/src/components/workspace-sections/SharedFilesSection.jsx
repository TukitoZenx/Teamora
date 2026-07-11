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
  Folder
} from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '../ui/Button'
import Input from '../ui/Input'

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
                  title="Delete folder and contents"
                  className="shrink-0 rounded p-1 text-muted opacity-0 hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                  onClick={() => handleDeleteFolder(folder)}
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
                        className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                        onClick={() => handleDelete(file)}
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
