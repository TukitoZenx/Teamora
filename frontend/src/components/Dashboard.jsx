import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Plus,
  ArrowRight,
  Star,
  Pin,
  LayoutGrid,
  List as ListIcon,
  Clock,
  Users,
  Share2,
  Folder,
  ChevronRight,
  Bell,
  MoreHorizontal,
  Copy,
  Trash2,
  Globe,
  Lock,
  X
} from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

const INITIAL_MOCK_WORKSPACES = [
  {
    id: 'design-system',
    name: 'Design System & Brand Guidelines',
    lastOpened: new Date(Date.now() - 3600000 * 2).toISOString(),
    members: ['You', 'Sarah Chen', 'Alex Rivera'],
    lastActivity: 'Updated colors & typography tokens',
    isPinned: true,
    isFavorite: true,
    isShared: true,
    isTemplate: false
  },
  {
    id: 'marketing-q3',
    name: 'Marketing Q3 Launch Roadmap',
    lastOpened: new Date(Date.now() - 3600000 * 24).toISOString(),
    members: ['You', 'Sarah Chen'],
    lastActivity: 'Added presentation slides for review',
    isPinned: false,
    isFavorite: true,
    isShared: false,
    isTemplate: false
  },
  {
    id: 'prd-teamora',
    name: 'Teamora Product Requirement Doc (PRD)',
    lastOpened: new Date(Date.now() - 3600000 * 48).toISOString(),
    members: ['You', 'Marcus Vance'],
    lastActivity: 'Edited spreadsheet timelines',
    isPinned: false,
    isFavorite: false,
    isShared: true,
    isTemplate: false
  },
  {
    id: 'sales-pitch',
    name: 'Enterprise Sales Pitch Deck',
    lastOpened: new Date(Date.now() - 3600000 * 120).toISOString(),
    members: ['You', 'Alex Rivera'],
    lastActivity: 'Polished slide visual hierarchy',
    isPinned: false,
    isFavorite: false,
    isShared: true,
    isTemplate: false
  }
];

export default function Dashboard({ isDarkMode, setIsDarkMode, onJoinRoom, onCreateRoom }) {
  const { user } = useUser();
  const [workspaces, setWorkspaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [activeTab, setActiveTab] = useState('recent'); // 'recent', 'pinned', 'shared', 'favorites'

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');

  // Dropdown menu state
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  // Notifications simulation
  const [hasNotifications, setHasNotifications] = useState(true);

  // Load Workspaces from LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem('teamora_workspaces_metadata');
    if (stored) {
      // Filter out legacy template spaces to align with the redesign
      const parsed = JSON.parse(stored).filter(ws => !ws.isTemplate);
      setWorkspaces(parsed);
    } else {
      localStorage.setItem('teamora_workspaces_metadata', JSON.stringify(INITIAL_MOCK_WORKSPACES));
      setWorkspaces(INITIAL_MOCK_WORKSPACES);
    }
  }, []);

  // Handle outside clicks to close the card context menus
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveWorkspaces = (updated) => {
    setWorkspaces(updated);
    localStorage.setItem('teamora_workspaces_metadata', JSON.stringify(updated));
  };

  // Toggle Favorite
  const toggleFavorite = (id, e) => {
    e?.stopPropagation();
    const updated = workspaces.map(ws =>
      ws.id === id ? { ...ws, isFavorite: !ws.isFavorite } : ws
    );
    saveWorkspaces(updated);
    toast.success(
      workspaces.find(w => w.id === id)?.isFavorite
        ? 'Removed from Favorites'
        : 'Added to Favorites',
      { duration: 1500 }
    );
  };

  // Toggle Pin
  const togglePin = (id, e) => {
    e?.stopPropagation();
    const updated = workspaces.map(ws =>
      ws.id === id ? { ...ws, isPinned: !ws.isPinned } : ws
    );
    saveWorkspaces(updated);
    toast.success(
      workspaces.find(w => w.id === id)?.isPinned
        ? 'Unpinned Workspace'
        : 'Pinned Workspace',
      { duration: 1500 }
    );
  };

  // Copy Workspace ID to Clipboard
  const handleCopyId = (id, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(id);
    toast.success('Workspace ID copied to clipboard', { duration: 1500 });
    setActiveDropdownId(null);
  };

  // Delete Workspace
  const handleDeleteWorkspace = (id, e) => {
    e?.stopPropagation();
    const updated = workspaces.filter(ws => ws.id !== id);
    saveWorkspaces(updated);
    toast.success('Workspace removed successfully', { duration: 1500 });
    setActiveDropdownId(null);
  };

  // Create Workspace
  const handleCreateWorkspace = (e) => {
    e?.preventDefault();
    if (!newWorkspaceName.trim()) {
      toast.error('Workspace Name is required');
      return;
    }
    const cleanName = newWorkspaceName.trim();
    const generatedId = newRoomId.trim() || 'room-' + Math.random().toString(36).substring(2, 9);

    // Clear inputs & close modal
    setNewWorkspaceName('');
    setNewRoomId('');
    setShowCreateModal(false);

    toast.success(`Created Workspace: ${cleanName}`);

    // Enter Workspace
    if (onCreateRoom) {
      onCreateRoom(generatedId, cleanName);
    } else {
      onJoinRoom(generatedId, cleanName);
    }
  };

  // Join Existing Workspace
  const handleJoinWorkspace = async (e) => {
    e?.preventDefault();
    if (!joinRoomId.trim()) {
      toast.error('Room ID is required');
      return;
    }
    const cleanId = joinRoomId.trim();

    // Check if it already exists in our metadata to pass the display name if found
    const exists = workspaces.find(ws => ws.id === cleanId);
    const workspaceName = exists ? exists.name : cleanId;

    const success = await onJoinRoom(cleanId, workspaceName);
    if (success) {
      setShowJoinModal(false);
      setJoinRoomId('');
    }
  };

  const handleCardClick = async (ws) => {
    const success = await onJoinRoom(ws.id, ws.name);
    if (!success) {
      // Reload workspaces from localStorage if validation failed (in case it was deleted)
      const stored = localStorage.getItem('teamora_workspaces_metadata');
      if (stored) {
        const parsed = JSON.parse(stored).filter(w => !w.isTemplate);
        setWorkspaces(parsed);
      }
    }
  };

  // Filter & Search Logic
  const filteredWorkspaces = workspaces
    .filter(ws => {
      const matchesSearch = ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'pinned') return ws.isPinned;
      if (activeTab === 'shared') return ws.isShared;
      if (activeTab === 'favorites') return ws.isFavorite;

      return true; // 'recent'
    })
    .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened)); // Sort by lastOpened DESC

  const getDisplayName = () => {
    if (user?.fullName) return user.fullName;
    if (user?.firstName) return user.firstName;
    return user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Collaborator';
  };

  return (
    <div className={`min-h-screen w-full font-sans flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>

      {/* 1. Top Navigation */}
      <header className="h-16 px-6 md:px-12 border-b border-neutral-200 dark:border-neutral-850 flex items-center justify-between bg-white dark:bg-neutral-900 transition-colors duration-200 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neutral-900 dark:bg-white rounded-lg flex items-center justify-center shadow-xs transition-colors">
            <Building2 className="w-4.5 h-4.5 text-white dark:text-neutral-950" />
          </div>
          <span className="text-base font-extrabold tracking-tight">Teamora</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <button
            onClick={() => {
              setHasNotifications(false);
              toast('No new notifications', { icon: '🔔', duration: 1500 });
            }}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 dark:text-neutral-400 relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {hasNotifications && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full" />
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 dark:text-neutral-400 cursor-pointer"
            title="Toggle theme"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {/* Clerk Profile */}
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Container */}
      <main className={`flex-1 max-w-[1380px] w-full mx-auto px-6 py-10 md:px-12 flex flex-col ${workspaces.length === 0 ? 'justify-center items-center' : 'gap-10'}`}>

        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-10 px-4">
            <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center mb-5 text-neutral-400 dark:text-neutral-350 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-neutral-955 dark:text-white mb-2">No Workspaces Yet</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed max-w-xs">
              You haven't created or joined a workspace yet. <br />
              Create a new workspace or join an existing one using a Room ID.
            </p>
            <div className="flex items-center gap-3 font-semibold">
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-5 py-2.5 text-xs font-bold text-black dark:text-white bg-white dark:bg-neutral-900 border border-black dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl transition-colors duration-150 cursor-pointer"
              >
                Join Workspace
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-black hover:bg-[#222] active:bg-[#111] dark:bg-neutral-800 dark:hover:bg-neutral-750 rounded-xl transition-colors duration-150 cursor-pointer shadow-xs"
              >
                New Workspace
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 2. Welcome Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h1 className="text-3.5xl md:text-4xl font-black tracking-tight text-neutral-950 dark:text-white">Welcome back, {getDisplayName()}</h1>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
                  Manage your workspaces, collaborate in real time, and continue where you left off.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-4 py-2.5 text-xs font-bold text-black dark:text-white bg-white dark:bg-neutral-900 border border-black dark:border-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-[10px] md:rounded-[12px] transition-colors duration-150 cursor-pointer"
                >
                  Join Workspace
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-black hover:bg-[#222] active:bg-[#111] dark:bg-neutral-900 dark:hover:bg-neutral-850 rounded-[10px] md:rounded-[12px] transition-colors duration-150 cursor-pointer"
                >
                  New Workspace
                </button>
              </div>
            </div>

        {/* 3. Workspace Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center border-b border-neutral-200 dark:border-neutral-850 pb-4">

          {/* Tabs */}
          <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'recent', label: 'Recent' },
              { id: 'pinned', label: 'Pinned' },
              { id: 'shared', label: 'Shared with Me' },
              { id: 'favorites', label: 'Favorites' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/50'
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search bar inside list and Grid/List toggle */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">

            {/* Minimal Search Input */}
            <div className="relative flex-1 md:flex-none">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-56 pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-neutral-400"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-400'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-400'}`}
                title="List view"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* 4. Workspace Grid/List */}
        {filteredWorkspaces.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-2xl py-16 px-6 flex flex-col items-center justify-center text-center max-w-lg mx-auto w-full">
            <div className="w-10 h-10 bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded-lg flex items-center justify-center mb-4">
              <Folder className="w-4.5 h-4.5 text-neutral-400 dark:text-neutral-350" />
            </div>
            <h3 className="text-sm font-bold text-neutral-950 dark:text-white mb-1.5 uppercase tracking-wider">No Workspaces Found</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs leading-relaxed mb-6">
              Get started by creating a new secure real-time collaboration room or join an existing workspace by entering its ID.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-[#222] active:bg-[#111] dark:bg-neutral-800 dark:hover:bg-neutral-750 rounded-[10px] transition-colors duration-150 cursor-pointer shadow-xs"
              >
                Create Workspace
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 text-xs font-bold text-black dark:text-white bg-white dark:bg-neutral-900 border border-black dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-[10px] transition-colors duration-150 cursor-pointer"
              >
                Join
              </button>
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'flex flex-col gap-3'}>
            <AnimatePresence mode="popLayout">
              {filteredWorkspaces.map(ws => {
                const lastOpenedString = new Date(ws.lastOpened).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                if (viewMode === 'grid') {
                  return (
                    <motion.div
                      key={ws.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => handleCardClick(ws)}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 hover:border-black dark:hover:border-neutral-700 hover:shadow-sm dark:hover:shadow-none rounded-2xl p-5 transition-colors duration-150 flex flex-col justify-between group cursor-pointer relative"
                    >
                      <div>
                        {/* Title and Action Icons */}
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Folder className="w-4 h-4 text-neutral-450 shrink-0" />
                            <h3 className="font-bold text-sm text-neutral-950 dark:text-white group-hover:text-black dark:group-hover:text-white transition-colors line-clamp-1">
                              {ws.name}
                            </h3>
                          </div>

                          {/* Icons Group Container: Order is Pin, Favorite, More */}
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            {/* Pin Icon */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(ws.id);
                              }}
                              className={`p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
                                ws.isPinned ? 'text-black dark:text-white' : 'text-neutral-400 opacity-0 group-hover:opacity-100'
                              }`}
                              title={ws.isPinned ? "Unpin workspace" : "Pin workspace"}
                            >
                              <Pin className="w-3.5 h-3.5 fill-current" />
                            </button>

                            {/* Star (Favorite) Icon */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(ws.id);
                              }}
                              className={`p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
                                ws.isFavorite ? 'text-black dark:text-white' : 'text-neutral-400 opacity-0 group-hover:opacity-100'
                              }`}
                              title={ws.isFavorite ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>

                            {/* More (⋯) Menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === ws.id ? null : ws.id);
                                }}
                                className="p-1 rounded-lg hover:bg-neutral-150 dark:hover:bg-neutral-850 transition-colors text-neutral-400 hover:text-neutral-700 cursor-pointer"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeDropdownId === ws.id && (
                                <div
                                  ref={dropdownRef}
                                  className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg py-1 z-30 text-xs font-semibold text-neutral-605 dark:text-neutral-350"
                                >
                                  <button
                                    onClick={(e) => {
                                      togglePin(ws.id, e);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors flex items-center gap-2"
                                  >
                                    <Pin className="w-3.5 h-3.5 text-neutral-450" />
                                    <span>{ws.isPinned ? 'Unpin' : 'Pin'}</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      toggleFavorite(ws.id, e);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors flex items-center gap-2"
                                  >
                                    <Star className="w-3.5 h-3.5 text-neutral-450" />
                                    <span>{ws.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleCopyId(ws.id, e)}
                                    className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors flex items-center gap-2"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-neutral-450" />
                                    <span>Copy ID</span>
                                  </button>
                                  <div className="h-px bg-neutral-150 dark:bg-neutral-800 my-1" />
                                  <button
                                    onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                                    className="w-[calc(100%-16px)] mx-2 my-1 text-left px-2.5 py-1.5 bg-white dark:bg-neutral-900 text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-lg transition-colors flex items-center gap-2 font-bold"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Recent Activity */}
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-6 truncate">
                          {ws.lastActivity}
                        </p>
                      </div>

                      {/* Footer: Date & Members */}
                      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-850 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{lastOpenedString}</span>
                        </div>

                        {/* Members Stack / Count */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center -space-x-1.5 overflow-hidden">
                            {ws.members.slice(0, 3).map((member, i) => (
                              <div
                                key={i}
                                className="w-5.5 h-5.5 rounded-full bg-neutral-200 dark:bg-neutral-700 border border-white dark:border-neutral-900 flex items-center justify-center text-[8px] font-bold text-neutral-650 dark:text-neutral-350"
                                title={member}
                              >
                                {member.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <span className="text-[9px] font-semibold text-neutral-400">
                            {ws.members.length} member{ws.members.length !== 1 && 's'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                } else {
                  // List View
                  return (
                    <motion.div
                      key={ws.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => handleCardClick(ws)}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 hover:border-black dark:hover:border-neutral-700 hover:shadow-xs rounded-xl p-4 transition-colors duration-150 flex items-center justify-between group cursor-pointer relative"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Folder className="w-4 h-4 text-neutral-450 shrink-0" />
                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3 md:items-center">
                          <h3 className="font-bold text-xs text-neutral-950 dark:text-white group-hover:text-black dark:group-hover:text-white transition-colors truncate">
                            {ws.name}
                          </h3>
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-450 truncate">
                            {ws.lastActivity}
                          </span>
                        </div>
                      </div>

                      {/* Right items */}
                      <div className="flex items-center gap-6 shrink-0 pl-4">
                        <span className="text-[10px] text-neutral-400 hidden sm:inline">
                          {lastOpenedString}
                        </span>

                        {/* Icons Row: Order is Pin, Star, More */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(ws.id);
                            }}
                            className={`p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                              ws.isPinned ? 'text-black dark:text-white' : 'text-neutral-400'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(ws.id);
                            }}
                            className={`p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                              ws.isFavorite ? 'text-black dark:text-white' : 'text-neutral-400'
                            }`}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>

                        {/* More Options Button */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === ws.id ? null : ws.id);
                            }}
                            className="p-1 rounded-lg hover:bg-neutral-150 dark:hover:bg-neutral-850 transition-colors text-neutral-400 hover:text-neutral-700 cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {/* Context Dropdown Menu */}
                          {activeDropdownId === ws.id && (
                            <div
                              ref={dropdownRef}
                              className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg py-1 z-30 text-xs font-semibold text-neutral-605 dark:text-neutral-350"
                            >
                              <button
                                onClick={(e) => {
                                  togglePin(ws.id, e);
                                  setActiveDropdownId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors flex items-center gap-2"
                              >
                                <Pin className="w-3.5 h-3.5 text-neutral-450" />
                                <span>{ws.isPinned ? 'Unpin' : 'Pin'}</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  toggleFavorite(ws.id, e);
                                  setActiveDropdownId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors flex items-center gap-2"
                              >
                                <Star className="w-3.5 h-3.5 text-neutral-450" />
                                <span>{ws.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
                              </button>
                              <button
                                onClick={(e) => handleCopyId(ws.id, e)}
                                className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors flex items-center gap-2"
                              >
                                <Copy className="w-3.5 h-3.5 text-neutral-450" />
                                <span>Copy ID</span>
                              </button>
                              <div className="h-px bg-neutral-150 dark:bg-neutral-800 my-1" />
                              <button
                                onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                                className="w-[calc(100%-16px)] mx-2 my-1 text-left px-2.5 py-1.5 bg-white dark:bg-neutral-900 text-red-650 border border-red-250 dark:border-red-900/50 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-lg transition-colors flex items-center gap-2 font-bold"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <ChevronRight className="w-4.5 h-4.5 text-neutral-450 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                      </div>
                    </motion.div>
                  );
                }
              })}
            </AnimatePresence>
          </div>
        )}

        {/* 5. Recent Activity Section */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-6 md:p-8 transition-colors duration-150 mt-6">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-neutral-100 dark:border-neutral-850">
            <h2 className="text-xs font-bold tracking-tight text-neutral-900 dark:text-white uppercase tracking-wider">Recent Activity</h2>
            <span className="text-[10px] font-semibold text-neutral-450">System Logs</span>
          </div>
          <div className="space-y-4">
            {[
              {
                user: 'You',
                action: 'updated spreadsheet grid data',
                target: 'Q3 Financial Model',
                time: '15 mins ago',
                icon: Folder
              },
              {
                user: 'Marcus Vance',
                action: 'joined workspace',
                target: 'Brand Kit v2',
                time: '2 hours ago',
                icon: Users
              },
              {
                user: 'You',
                action: 'modified document contents',
                target: 'Product Requirement Doc (PRD)',
                time: '1 day ago',
                icon: Clock
              },
              {
                user: 'Alex Rivera',
                action: 'edited workspace slides',
                target: 'Enterprise Sales Pitch Deck',
                time: '3 days ago',
                icon: Share2
              }
            ].map((activity, index) => {
              const IconComponent = activity.icon;
              return (
                <div key={index} className="flex items-start justify-between gap-4 text-xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-neutral-50 dark:bg-neutral-850 border border-neutral-150 dark:border-neutral-800 flex items-center justify-center shrink-0">
                      <IconComponent className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-neutral-800 dark:text-neutral-200">
                        <span className="font-bold text-neutral-950 dark:text-white">{activity.user}</span>{' '}
                        {activity.action}{' '}
                        <span className="font-semibold text-neutral-950 dark:text-white">"{activity.target}"</span>
                      </p>
                      <span className="text-[10px] text-neutral-400 mt-0.5 block">{activity.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
          </>
        )}

      </main>

      {/* --- CREATE WORKSPACE MODAL --- */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.15 }}
              className="relative bg-white dark:bg-neutral-900 border border-neutral-205 dark:border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-xl z-10 text-neutral-900 dark:text-neutral-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-sm tracking-tight">Create Workspace</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Marketing Roadmap"
                    required
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 placeholder:text-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Custom Room ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. marketing-q3 (autogenerated if blank)"
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 placeholder:text-neutral-400 font-mono"
                  />
                </div>

                <div className="flex items-center gap-3 justify-end pt-2 font-semibold">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-black dark:text-white bg-white dark:bg-neutral-900 border border-black dark:border-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-[10px] transition-colors duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-xs font-bold text-white bg-black hover:bg-[#222] active:bg-[#111] dark:bg-neutral-850 dark:hover:bg-neutral-800 rounded-[10px] transition-colors duration-150 cursor-pointer"
                  >
                    Create Workspace
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- JOIN WORKSPACE MODAL --- */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs"
              onClick={() => setShowJoinModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.15 }}
              className="relative bg-white dark:bg-neutral-900 border border-neutral-205 dark:border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-xl z-10 text-neutral-900 dark:text-neutral-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-sm tracking-tight">Join Workspace</h3>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleJoinWorkspace} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Workspace ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Room ID..."
                    required
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 placeholder:text-neutral-400 font-mono"
                  />
                </div>

                <div className="flex items-center gap-3 justify-end pt-2 font-semibold">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-black dark:text-white bg-white dark:bg-neutral-900 border border-black dark:border-neutral-850 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-[10px] transition-colors duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-xs font-bold text-white bg-black hover:bg-[#222] active:bg-[#111] dark:bg-neutral-850 dark:hover:bg-neutral-800 rounded-[10px] transition-colors duration-150 cursor-pointer"
                  >
                    Join Workspace
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
