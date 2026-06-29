import React, { useState, useMemo } from 'react';
import { 
  FolderPlus, Plus, FileText, TableProperties, Presentation, Paintbrush, 
  Trash2, Edit3, ArrowLeft, Folder, File, ImageIcon, Download, Eye, 
  Search, Star, Pin, Move, Copy, Grid, List as ListIcon, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FileExplorer({
  filesList = [],
  socket,
  roomId,
  userName,
  currentUserRole = 'editor',
  onOpenFile,
  activeFileId
}) {
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileType, setNewFileType] = useState('document'); // 'document' | 'spreadsheet' | 'presentation' | 'whiteboard'
  const [newFileName, setNewFileName] = useState('');

  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'lastModified'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'document' | 'spreadsheet' | 'presentation' | 'whiteboard' | 'upload'

  const canEdit = currentUserRole !== 'viewer' && currentUserRole !== 'commenter';

  // Breadcrumbs resolver
  const breadcrumbs = useMemo(() => {
    const list = [];
    let currentId = currentFolderId;
    while (currentId) {
      const folder = filesList.find((f) => f.id === currentId && f.type === 'folder');
      if (folder) {
        list.unshift(folder);
        currentId = folder.folderId;
      } else {
        break;
      }
    }
    return list;
  }, [currentFolderId, filesList]);

  // Current folder filtered items
  const currentItems = useMemo(() => {
    let items = filesList.filter((f) => f.folderId === currentFolderId);
    
    // Type filtering
    if (filterType !== 'all') {
      if (filterType === 'upload') {
        items = items.filter(f => f.type !== 'folder' && f.type !== 'document' && f.type !== 'spreadsheet' && f.type !== 'presentation' && f.type !== 'whiteboard');
      } else {
        items = items.filter(f => f.type === filterType);
      }
    }

    // Search query override
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = filesList.filter((f) => f.name.toLowerCase().includes(query) && f.type !== 'folder');
    }

    // Sorting
    return items.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'lastModified') {
        const dateA = new Date(a.lastModified || a.uploadedAt || 0);
        const dateB = new Date(b.lastModified || b.uploadedAt || 0);
        comparison = dateA - dateB;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [currentFolderId, filesList, searchQuery, filterType, sortBy, sortOrder]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const folderObj = {
      id: 'folder-' + Math.random().toString(36).substring(7),
      name: newFolderName.trim(),
      type: 'folder',
      size: 0,
      folderId: currentFolderId,
      uploadedBy: userName,
      uploadedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    const updated = [...filesList, folderObj];
    socket.emit('update-files', { roomId, files: updated });
    setNewFolderName('');
    setShowFolderModal(false);
    toast.success(`Folder "${folderObj.name}" created!`);
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    const cleanName = newFileName.trim();

    // Differentiate content based on file type
    let defaultContent = null;
    let extension = '';
    if (newFileType === 'document') {
      defaultContent = null;
      extension = '.docx';
    } else if (newFileType === 'spreadsheet') {
      defaultContent = Array(100).fill().map(() => Array(26).fill(''));
      extension = '.xlsx';
    } else if (newFileType === 'presentation') {
      defaultContent = [{ title: 'Title Slide', content: 'Sub-heading text', notes: '', elements: [], layout: 'title' }];
      extension = '.pptx';
    } else if (newFileType === 'whiteboard') {
      defaultContent = [];
      extension = ' Board';
    }

    const fullFileName = cleanName.endsWith(extension) ? cleanName : cleanName + extension;

    const fileObj = {
      id: `file-${newFileType}-${Math.random().toString(36).substring(7)}`,
      name: fullFileName,
      type: newFileType,
      size: 0,
      folderId: currentFolderId,
      content: defaultContent,
      comments: [],
      versions: [],
      uploadedBy: userName,
      uploadedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      isPinned: false,
      isFavorite: false
    };

    const updated = [...filesList, fileObj];
    socket.emit('update-files', { roomId, files: updated });
    setNewFileName('');
    setShowNewFileModal(false);
    toast.success(`Created ${newFileType}: "${fileObj.name}"!`);
  };

  const handleDeleteItem = (itemId, e) => {
    e.stopPropagation();
    // Delete target + any child folders/files recursively
    const idsToDelete = new Set([itemId]);
    let activeLength = 0;
    
    // Simple tree traversal
    while (idsToDelete.size !== activeLength) {
      activeLength = idsToDelete.size;
      filesList.forEach(f => {
        if (f.folderId && idsToDelete.has(f.folderId)) {
          idsToDelete.add(f.id);
        }
      });
    }

    const updated = filesList.filter((f) => !idsToDelete.has(f.id));
    socket.emit('update-files', { roomId, files: updated });
    toast.success('Workspace item removed.');
  };

  const handleDuplicateItem = (item, e) => {
    e.stopPropagation();
    const cleanName = item.name.includes('.') 
      ? item.name.replace(/\.(\w+)$/, ' - Copy.$1')
      : item.name + ' - Copy';

    const dupObj = {
      ...item,
      id: `file-${item.type}-${Math.random().toString(36).substring(7)}`,
      name: cleanName,
      folderId: currentFolderId,
      uploadedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    const updated = [...filesList, dupObj];
    socket.emit('update-files', { roomId, files: updated });
    toast.success(`Duplicated "${item.name}"`);
  };

  const handleToggleMetadata = (item, key, e) => {
    e.stopPropagation();
    const updated = filesList.map(f => {
      if (f.id === item.id) {
        return { ...f, [key]: !f[key] };
      }
      return f;
    });
    socket.emit('update-files', { roomId, files: updated });
  };

  const handleRename = () => {
    if (!editName.trim() || !editingItem) return;
    const updated = filesList.map((f) => {
      if (f.id === editingItem.id) {
        return {
          ...f,
          name: editName.trim(),
          lastModified: new Date().toISOString()
        };
      }
      return f;
    });
    socket.emit('update-files', { roomId, files: updated });
    setEditName('');
    setEditingItem(null);
    toast.success('Item renamed.');
  };

  // Drag and drop folders move
  const handleItemDragStart = (e, item) => {
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleFolderDrop = (e, targetFolderId) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetFolderId) return;

    // Prevent folder moving into its own tree
    let parentId = targetFolderId;
    while (parentId) {
      if (parentId === draggedId) {
        toast.error('Cannot move a folder inside itself.');
        return;
      }
      const p = filesList.find(f => f.id === parentId);
      parentId = p ? p.folderId : null;
    }

    const updated = filesList.map(f => {
      if (f.id === draggedId) {
        return { ...f, folderId: targetFolderId, lastModified: new Date().toISOString() };
      }
      return f;
    });
    socket.emit('update-files', { roomId, files: updated });
    toast.success('Workspace item relocated.');
  };

  const getFileIcon = (item) => {
    if (item.type === 'folder') return <Folder className="w-4 h-4 text-indigo-500 fill-current" />;
    if (item.type === 'document') return <FileText className="w-4 h-4 text-blue-500" />;
    if (item.type === 'spreadsheet') return <TableProperties className="w-4 h-4 text-emerald-500" />;
    if (item.type === 'presentation') return <Presentation className="w-4 h-4 text-amber-500" />;
    if (item.type === 'whiteboard') return <Paintbrush className="w-4 h-4 text-rose-500" />;
    if (item.type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-red-400" />;
    return <File className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden h-full">
      {/* File Manager Toolbar */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shrink-0 transition-colors z-20 select-none">
        
        {/* Breadcrumb path navigation */}
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
          <button 
            onClick={() => setCurrentFolderId(null)}
            className="hover:text-indigo-500 transition-colors cursor-pointer"
          >
            Drive
          </button>
          {breadcrumbs.map((f, i) => (
            <React.Fragment key={f.id}>
              <ChevronRight className="w-3 h-3 text-slate-350" />
              <button 
                onClick={() => setCurrentFolderId(f.id)}
                className={`hover:text-indigo-500 transition-colors cursor-pointer max-w-[90px] truncate ${i === breadcrumbs.length - 1 ? 'text-slate-800 dark:text-white' : ''}`}
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-650 cursor-pointer focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="document">Documents</option>
            <option value="spreadsheet">Spreadsheets</option>
            <option value="presentation">Presentations</option>
            <option value="whiteboard">Whiteboards</option>
            <option value="upload">Uploads</option>
          </select>

          {/* Sort Toggles */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border text-[10px] font-bold text-slate-600">
            <button 
              onClick={() => {
                setSortBy(sortBy === 'name' ? 'lastModified' : 'name');
              }}
              className="px-2 py-0.5 hover:bg-white rounded cursor-pointer"
            >
              {sortBy === 'name' ? 'Name' : 'Date'}
            </button>
            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-1.5 py-0.5 hover:bg-white rounded cursor-pointer"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <button 
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Toggle View Mode"
          >
            {viewMode === 'grid' ? <ListIcon className="w-4 h-4 text-slate-500" /> : <Grid className="w-4 h-4 text-slate-500" />}
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => setShowFolderModal(true)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 rounded-lg cursor-pointer"
                title="New Folder"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowNewFileModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New File</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Workspace search searchbar */}
      <div className="px-4 py-2 border-b border-slate-100 bg-white flex items-center shrink-0">
        <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
        <input 
          type="text" 
          placeholder="Search workspace files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-xs text-slate-700 placeholder-slate-400 w-full"
        />
      </div>

      {/* File Explorer Grid / List */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {currentItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-slate-200/50">
            <Folder className="w-10 h-10 text-slate-300 mb-2 fill-current" />
            <span className="text-xs font-bold text-slate-650">No files / folders here</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Use "New File" or "New Folder" to start planning.</span>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {currentItems.map((item) => {
              const isSelected = activeFileId === item.id;
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleItemDragStart(e, item)}
                  onDragOver={(e) => item.type === 'folder' && e.preventDefault()}
                  onDrop={(e) => item.type === 'folder' && handleFolderDrop(e, item.id)}
                  onClick={() => item.type !== 'folder' && onOpenFile(item)}
                  onDoubleClick={() => item.type === 'folder' && setCurrentFolderId(item.id)}
                  className={`bg-white dark:bg-slate-900 border hover:border-indigo-500 rounded-xl p-3 flex flex-col justify-between h-28 relative group cursor-pointer shadow-xs transition-all ${
                    isSelected ? 'ring-2 ring-indigo-500/20 border-indigo-500' : 'border-slate-200/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg shrink-0">
                      {getFileIcon(item)}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 z-10 transition-opacity">
                      <button 
                        onClick={(e) => handleToggleMetadata(item, 'isPinned', e)}
                        className={`p-1 hover:bg-slate-100 rounded text-slate-400 ${item.isPinned ? 'text-amber-500' : ''}`}
                        title="Pin"
                      >
                        <Pin className="w-3 h-3 fill-current" />
                      </button>
                      <button 
                        onClick={(e) => handleToggleMetadata(item, 'isFavorite', e)}
                        className={`p-1 hover:bg-slate-100 rounded text-slate-400 ${item.isFavorite ? 'text-amber-500' : ''}`}
                        title="Favorite"
                      >
                        <Star className="w-3 h-3 fill-current" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                          setEditName(item.name);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400"
                        title="Rename"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => handleDuplicateItem(item, e)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-550"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-slate-800 dark:text-white truncate block mt-2" title={item.name}>
                      {item.name}
                    </h4>
                    <span className="text-[9px] text-slate-400">{item.uploadedBy || 'system'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List Mode */
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden select-none">
            {currentItems.map((item) => {
              const isSelected = activeFileId === item.id;
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleItemDragStart(e, item)}
                  onDragOver={(e) => item.type === 'folder' && e.preventDefault()}
                  onDrop={(e) => item.type === 'folder' && handleFolderDrop(e, item.id)}
                  onClick={() => item.type !== 'folder' && onOpenFile(item)}
                  onDoubleClick={() => item.type === 'folder' && setCurrentFolderId(item.id)}
                  className={`flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-xs ${
                    isSelected ? 'bg-indigo-500/5 font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(item)}
                    <span className="text-slate-850 dark:text-white truncate max-w-[200px]" title={item.name}>{item.name}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[9px] text-slate-400 hidden md:inline">{item.uploadedBy || 'system'}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => handleToggleMetadata(item, 'isPinned', e)}
                        className={`p-1 hover:bg-slate-100 rounded text-slate-400 ${item.isPinned ? 'text-amber-500' : ''}`}
                      >
                        <Pin className="w-3 h-3 fill-current" />
                      </button>
                      <button 
                        onClick={(e) => handleToggleMetadata(item, 'isFavorite', e)}
                        className={`p-1 hover:bg-slate-100 rounded text-slate-400 ${item.isFavorite ? 'text-amber-500' : ''}`}
                      >
                        <Star className="w-3 h-3 fill-current" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-550"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">New Folder</h3>
            <input
              type="text"
              placeholder="e.g., Marketing Assets"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-6"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Create Collaborative File</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">File Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'document', label: 'Document', icon: FileText },
                    { id: 'spreadsheet', label: 'Spreadsheet', icon: TableProperties },
                    { id: 'presentation', label: 'Presentation', icon: Presentation },
                    { id: 'whiteboard', label: 'Whiteboard', icon: Paintbrush }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setNewFileType(t.id)}
                      className={`flex items-center gap-2 p-2.5 border rounded-xl text-xs font-bold capitalize cursor-pointer transition-all ${
                        newFileType === t.id ? 'border-indigo-600 bg-indigo-500/5 text-indigo-600' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <t.icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">File Name</label>
                <input
                  type="text"
                  placeholder="e.g., Marketing Plan"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowNewFileModal(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateFile}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Rename Item</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none mb-6"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleRename}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
