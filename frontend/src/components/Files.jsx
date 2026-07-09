import React, { useState, useMemo } from 'react'
import { ensureArray } from './utils/arrayUtils'
import {
  FolderPlus,
  Upload,
  Trash2,
  Edit3,
  ArrowLeft,
  Folder,
  File,
  FileText,
  ImageIcon,
  Download,
  Search
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Files({ filesList = [], socket, roomId, userName, currentUserRole = 'editor' }) {
  const [currentFolderId, setCurrentFolderId] = useState(null) // null = root
  const [searchQuery, setSearchQuery] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [editingFile, setEditingFile] = useState(null)
  const [newFileName, setNewFileName] = useState('')
  const [previewFile, setPreviewFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  // Can user edit/upload?
  const canEdit = currentUserRole !== 'viewer' && currentUserRole !== 'commenter'

  // Breadcrumbs path resolver
  const breadcrumbs = useMemo(() => {
    const list = []
    let currentId = currentFolderId
    const safeFiles = ensureArray(filesList)
    while (currentId) {
      const folder = safeFiles.find((f) => f && f.id === currentId && f.type === 'folder')
      if (folder) {
        list.unshift(folder)
        currentId = folder.folderId
      } else {
        break
      }
    }
    return list
  }, [currentFolderId, filesList])

  // Current folder items
  const currentItems = useMemo(() => {
    const safeFiles = ensureArray(filesList)
    let items = safeFiles.filter((f) => f && f.folderId === currentFolderId)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = safeFiles.filter(
        (f) => f && f.name && typeof f.name === 'string' && f.name.toLowerCase().includes(query) && f.type !== 'folder'
      )
    }
    return items
  }, [currentFolderId, filesList, searchQuery])

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    const folderObj = {
      id: 'folder-' + Math.random().toString(36).substring(7),
      name: newFolderName,
      type: 'folder',
      size: 0,
      folderId: currentFolderId,
      uploadedBy: userName,
      uploadedAt: new Date().toLocaleString()
    }
    const updated = [...ensureArray(filesList), folderObj]
    socket.emit('update-files', { roomId, files: updated })
    setNewFolderName('')
    setShowFolderModal(false)
    toast.success(`Folder "${folderObj.name}" created!`)
  }

  const readUploadedFile = (file, onLoaded) => {
    const reader = new FileReader()
    reader.onload = (event) => onLoaded(event.target.result)
    reader.onerror = () => toast.error(`Could not read "${file.name}".`)

    const textLike =
      file.type.startsWith('text/') ||
      ['application/json', 'application/xml', 'application/javascript', 'image/svg+xml'].includes(file.type)

    if (textLike && file.size < 1024 * 1024) {
      reader.readAsText(file)
    } else {
      reader.readAsDataURL(file)
    }
  }

  const handleFileUpload = (e) => {
    const uploadFiles = Array.from(e.target.files)
    if (uploadFiles.length === 0) return

    uploadFiles.forEach((file) => {
      readUploadedFile(file, (content) => {
        const fileObj = {
          id: 'file-' + Math.random().toString(36).substring(7),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          content,
          folderId: currentFolderId,
          uploadedBy: userName,
          uploadedAt: new Date().toLocaleString(),
          version: 1,
          versionHistory: [
            {
              version: 1,
              name: file.name,
              size: file.size,
              uploadedAt: new Date().toLocaleString()
            }
          ]
        }
        const updated = [...ensureArray(filesList), fileObj]
        socket.emit('update-files', { roomId, files: updated })
        toast.success(`Uploaded "${file.name}"!`)
      })
    })
  }

  const handleDeleteItem = (itemId) => {
    const updated = ensureArray(filesList).filter((f) => f && f.id !== itemId && f.folderId !== itemId) // delete children if folder
    socket.emit('update-files', { roomId, files: updated })
    toast.success('Item deleted successfully.')
  }

  const handleRename = () => {
    if (!newFileName.trim() || !editingFile) return
    const updated = ensureArray(filesList).map((f) => {
      if (f && f.id === editingFile.id) {
        return {
          ...f,
          name: newFileName,
          version: f.type !== 'folder' ? (f.version || 1) + 1 : f.version,
          versionHistory:
            f.type !== 'folder'
              ? [
                  ...ensureArray(f.versionHistory),
                  {
                    version: (f.version || 1) + 1,
                    name: newFileName,
                    size: f.size,
                    uploadedAt: new Date().toLocaleString()
                  }
                ]
              : undefined
        }
      }
      return f
    })
    socket.emit('update-files', { roomId, files: updated })
    setNewFileName('')
    setEditingFile(null)
    toast.success('Item renamed successfully.')
  }

  // Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (!canEdit) {
      toast.error('You do not have permission to upload files.')
      return
    }
    const dropFiles = Array.from(e.dataTransfer.files)
    if (dropFiles.length === 0) return

    dropFiles.forEach((file) => {
      readUploadedFile(file, (content) => {
        const fileObj = {
          id: 'file-' + Math.random().toString(36).substring(7),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          content,
          folderId: currentFolderId,
          uploadedBy: userName,
          uploadedAt: new Date().toLocaleString(),
          version: 1,
          versionHistory: [
            {
              version: 1,
              name: file.name,
              size: file.size,
              uploadedAt: new Date().toLocaleString()
            }
          ]
        }
        const updated = [...ensureArray(filesList), fileObj]
        socket.emit('update-files', { roomId, files: updated })
        toast.success(`Uploaded "${file.name}"!`)
      })
    })
  }

  const formatSize = (bytes) => {
    if (bytes === 0) return '—'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFileIcon = (file) => {
    if (file.type === 'folder') return <Folder className="w-5 h-5 text-indigo-500" />
    if (file.type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-rose-500" />
    if (file.type.includes('text') || file.type.includes('json')) return <FileText className="w-5 h-5 text-blue-500" />
    return <File className="w-5 h-5 text-slate-500" />
  }

  const handleDownload = (file) => {
    if (!file.content) {
      toast.error('File content unavailable.')
      return
    }
    const element = document.createElement('a')
    if (file.content.startsWith('data:')) {
      element.href = file.content
    } else {
      const fileData = new Blob([file.content], { type: file.type })
      element.href = URL.createObjectURL(fileData)
    }
    element.download = file.name
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success(`Downloading "${file.name}"...`)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col bg-card-sunken overflow-hidden h-full transition-all duration-200 ${
        isDragging ? 'bg-primary/5 border-2 border-dashed border-primary' : ''
      }`}
    >
      {/* File Manager Header */}
      <div className="h-14 border-b border-border bg-card px-6 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
            <Folder className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-text">Shared Files</span>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex items-center bg-card-sunken border border-border rounded-xl px-3 py-1">
            <Search className="w-3.5 h-3.5 text-muted mr-2" />
            <input
              type="text"
              placeholder="Search shared files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-text placeholder-muted/65 w-44"
            />
          </div>

          {canEdit && (
            <>
              <button
                onClick={() => setShowFolderModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border text-text rounded-xl font-semibold text-xs hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>New Folder</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Files</span>
                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumb Path Bar */}
      <div className="h-10 border-b border-border bg-card-sunken/40 px-6 flex items-center justify-between shrink-0 transition-colors text-xs font-medium">
        <div className="flex items-center gap-1.5 text-muted">
          <button
            onClick={() => setCurrentFolderId(null)}
            className="hover:text-primary transition-colors cursor-pointer"
          >
            Drive
          </button>
          {breadcrumbs.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span className="text-border">/</span>
              <button
                onClick={() => setCurrentFolderId(folder.id)}
                className={`hover:text-primary transition-colors cursor-pointer truncate max-w-[120px] ${
                  index === breadcrumbs.length - 1 ? 'text-text font-semibold' : ''
                }`}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {currentFolderId && (
          <button
            onClick={() => {
              const currentFolder = filesList.find((f) => f.id === currentFolderId)
              setCurrentFolderId(currentFolder ? currentFolder.folderId : null)
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-hover cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
        )}
      </div>

      {/* Grid / List of Items */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-card rounded-2xl border border-border">
            <Folder className="w-12 h-12 text-muted mb-3 animate-pulse" />
            <span className="text-sm font-semibold text-text">Folder is empty</span>
            <span className="text-xs text-muted mt-1">
              Drag and drop or upload files to share them with your team.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentItems.map((item) => (
              <div
                key={item.id}
                onDoubleClick={() => {
                  if (item.type === 'folder') {
                    setCurrentFolderId(item.id)
                  } else {
                    setPreviewFile(item)
                  }
                }}
                className="bg-card border border-border hover:border-primary/50 rounded-xl p-4 flex flex-col justify-between h-36 hover:shadow-card transition-all relative group cursor-pointer"
              >
                {/* Icons & Actions */}
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-card-sunken rounded-lg shrink-0">{getFileIcon(item)}</div>

                  {/* Item Menu Overlay */}
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 z-10 transition-opacity">
                    {item.type !== 'folder' && (
                      <button
                        onClick={() => handleDownload(item)}
                        className="p-1 hover:bg-primary/10 text-muted hover:text-primary rounded-md transition-colors cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canEdit && (
                      <>
                        <button
                          onClick={() => {
                            setEditingFile(item)
                            setNewFileName(item.name)
                          }}
                          className="p-1 hover:bg-primary/10 text-muted hover:text-primary rounded-md transition-colors cursor-pointer"
                          title="Rename"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 hover:bg-danger/10 text-muted hover:text-danger rounded-md transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Name & Details */}
                <div className="min-w-0">
                  <h4
                    className="text-xs font-semibold text-text truncate block mt-3"
                    title={item.name}
                  >
                    {item.name}
                  </h4>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-muted">
                    <span>{formatSize(item.size)}</span>
                    <span className="truncate max-w-[80px]">{item.uploadedBy || 'system'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Folder Creation Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-card-sunken/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card max-w-sm w-full">
            <h3 className="text-sm font-bold text-text mb-4">Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder Name (e.g. Marketing Docs)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-card-sunken border border-border rounded-xl px-4 py-2.5 text-xs text-text focus:outline-none focus:border-primary mb-6 transition-all"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 bg-card border border-border text-text rounded-xl text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {editingFile && (
        <div className="fixed inset-0 bg-card-sunken/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card max-w-sm w-full">
            <h3 className="text-sm font-bold text-text mb-4">Rename Item</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full bg-card-sunken border border-border rounded-xl px-4 py-2.5 text-xs text-text focus:outline-none focus:border-primary mb-6 transition-all"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingFile(null)}
                className="px-4 py-2 bg-card border border-border text-text rounded-xl text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-card-sunken/40 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-card border border-border rounded-2xl shadow-card max-w-3xl w-full flex flex-col h-[80vh] overflow-hidden">
            {/* Preview Header */}
            <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(previewFile)}
                <span className="text-sm font-bold text-text truncate">{previewFile.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="p-2 hover:bg-primary/10 text-muted hover:text-primary rounded-lg cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="px-3 py-1.5 bg-card border border-border text-text hover:bg-primary/10 hover:text-primary rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Preview Body & Side Info Panel */}
            <div className="flex-1 flex overflow-hidden">
              {/* Main Preview */}
              <div className="flex-1 bg-card-sunken flex items-center justify-center p-6 overflow-auto">
                {previewFile.type.startsWith('image/') ? (
                  <img
                    src={previewFile.content}
                    alt={previewFile.name}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : previewFile.type.includes('text') || previewFile.type.includes('json') ? (
                  <pre className="text-xs text-text font-mono w-full h-full text-left whitespace-pre-wrap">
                    {previewFile.content}
                  </pre>
                ) : (
                  <div className="text-center text-muted">
                    <File className="w-16 h-16 mx-auto mb-4 opacity-40 text-muted" />
                    <span className="text-sm font-semibold">No preview available for this file type.</span>
                    <button
                      onClick={() => handleDownload(previewFile)}
                      className="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold block mx-auto cursor-pointer"
                    >
                      Download File
                    </button>
                  </div>
                )}
              </div>

              {/* Side Info Panel */}
              <div className="w-64 border-l border-border bg-card p-6 space-y-6 overflow-y-auto hidden md:block text-xs">
                <div>
                  <h4 className="font-bold text-muted uppercase tracking-wider text-[10px] mb-2">Metadata</h4>
                  <div className="space-y-2 text-text">
                    <p>
                      <span className="font-semibold">Type:</span> {previewFile.type}
                    </p>
                    <p>
                      <span className="font-semibold">Size:</span> {formatSize(previewFile.size)}
                    </p>
                    <p>
                      <span className="font-semibold">Uploaded by:</span> {previewFile.uploadedBy}
                    </p>
                    <p>
                      <span className="font-semibold">Uploaded at:</span> {previewFile.uploadedAt}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-border"></div>

                <div>
                  <h4 className="font-bold text-muted uppercase tracking-wider text-[10px] mb-2">
                    Version History
                  </h4>
                  <div className="space-y-3">
                    {previewFile.versionHistory ? (
                      previewFile.versionHistory.map((ver, idx) => (
                        <div key={idx} className="flex gap-2.5 items-start">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center font-bold text-[10px] text-primary shrink-0">
                            v{ver.version}
                          </div>
                          <div>
                            <p className="font-semibold text-text truncate w-36">{ver.name}</p>
                            <p className="text-[9px] text-muted mt-0.5">{ver.uploadedAt}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="italic text-muted">Version history not tracked.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
