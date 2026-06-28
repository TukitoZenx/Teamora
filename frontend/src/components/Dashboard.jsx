import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Plus,
  ArrowRight,
  Star,
  Pin,
  LayoutGrid,
  List,
  Clock,
  Users,
  SlidersHorizontal,
  Sparkles,
  Share2,
  FileText,
  ChevronRight,
  Bookmark,
  Activity,
  User,
  Layout
} from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';

const INITIAL_MOCK_WORKSPACES = [
  {
    id: 'design-system',
    name: 'Design System & Brand Guidelines',
    lastOpened: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    members: ['You', 'Sarah Chen', 'Alex Rivera'],
    lastActivity: 'Updated colors & typography tokens',
    isPinned: true,
    isFavorite: true,
    isShared: true,
    isTemplate: false,
    color: 'from-blue-500 to-indigo-500'
  },
  {
    id: 'marketing-q3',
    name: 'Marketing Q3 Launch Roadmap',
    lastOpened: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    members: ['You', 'Sarah Chen'],
    lastActivity: 'Added presentation slides for review',
    isPinned: false,
    isFavorite: true,
    isShared: false,
    isTemplate: false,
    color: 'from-pink-500 to-rose-500'
  },
  {
    id: 'prd-teamora',
    name: 'Teamora Product Requirement Doc (PRD)',
    lastOpened: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
    members: ['You', 'Marcus Vance'],
    lastActivity: 'Edited spreadsheet timelines',
    isPinned: false,
    isFavorite: false,
    isShared: true,
    isTemplate: false,
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'sales-pitch',
    name: 'Enterprise Sales Pitch Deck',
    lastOpened: new Date(Date.now() - 3600000 * 120).toISOString(), // 5 days ago
    members: ['You', 'Alex Rivera'],
    lastActivity: 'Polished slide visual hierarchy',
    isPinned: false,
    isFavorite: false,
    isShared: true,
    isTemplate: false,
    color: 'from-amber-500 to-orange-500'
  },
  {
    id: 'template-notes',
    name: 'Weekly Sync Meeting Notes Template',
    lastOpened: new Date(Date.now() - 3600000 * 240).toISOString(), // 10 days ago
    members: ['System'],
    lastActivity: 'Default Document Template',
    isPinned: false,
    isFavorite: false,
    isShared: false,
    isTemplate: true,
    color: 'from-purple-500 to-violet-500'
  },
  {
    id: 'template-okr',
    name: 'Team OKR Tracker Template',
    lastOpened: new Date(Date.now() - 3600000 * 300).toISOString(), // 12.5 days ago
    members: ['System'],
    lastActivity: 'Default Spreadsheet Template',
    isPinned: false,
    isFavorite: false,
    isShared: false,
    isTemplate: true,
    color: 'from-cyan-500 to-teal-500'
  }
];

export default function Dashboard({ isDarkMode, setIsDarkMode, onJoinRoom }) {
  const { user } = useUser();
  const [workspaces, setWorkspaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [activeTab, setActiveTab] = useState('recent'); // 'recent', 'pinned', 'favorites', 'shared', 'templates'
  const [sortBy, setSortBy] = useState('lastOpened'); // 'name', 'lastOpened'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  
  const [newRoomId, setNewRoomId] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  
  const [joinRoomId, setJoinRoomId] = useState('');

  // Load Workspaces from LocalStorage or initialize with mock data
  useEffect(() => {
    const stored = localStorage.getItem('teamora_workspaces_metadata');
    if (stored) {
      setWorkspaces(JSON.parse(stored));
    } else {
      localStorage.setItem('teamora_workspaces_metadata', JSON.stringify(INITIAL_MOCK_WORKSPACES));
      setWorkspaces(INITIAL_MOCK_WORKSPACES);
    }
  }, []);

  const saveWorkspaces = (updated) => {
    setWorkspaces(updated);
    localStorage.setItem('teamora_workspaces_metadata', JSON.stringify(updated));
  };

  // Toggle Favorite Status
  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    const updated = workspaces.map(ws => 
      ws.id === id ? { ...ws, isFavorite: !ws.isFavorite } : ws
    );
    saveWorkspaces(updated);
  };

  // Toggle Pin Status
  const togglePin = (id, e) => {
    e.stopPropagation();
    const updated = workspaces.map(ws => 
      ws.id === id ? { ...ws, isPinned: !ws.isPinned } : ws
    );
    saveWorkspaces(updated);
  };

  // Create Workspace
  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    const cleanName = newWorkspaceName.trim();
    const generatedId = newRoomId.trim() || 'room-' + Math.random().toString(36).substring(2, 9);
    
    const newWs = {
      id: generatedId,
      name: cleanName,
      lastOpened: new Date().toISOString(),
      members: ['You'],
      lastActivity: 'Workspace created',
      isPinned: false,
      isFavorite: false,
      isShared: false,
      isTemplate: false,
      color: getRandomGradient()
    };

    const updated = [newWs, ...workspaces];
    saveWorkspaces(updated);
    
    // Clear inputs
    setNewWorkspaceName('');
    setNewRoomId('');
    
    // Enter Workspace
    onJoinRoom(generatedId, cleanName);
  };

  // Join Existing Workspace
  const handleJoinWorkspace = () => {
    if (!joinRoomId.trim()) return;
    const cleanId = joinRoomId.trim();
    
    // Check if it already exists in our metadata
    const exists = workspaces.find(ws => ws.id === cleanId);
    if (exists) {
      const updated = workspaces.map(ws => 
        ws.id === cleanId ? { ...ws, lastOpened: new Date().toISOString() } : ws
      );
      saveWorkspaces(updated);
      onJoinRoom(cleanId, exists.name);
    } else {
      // Add as a new external workspace
      const newWs = {
        id: cleanId,
        name: cleanId, // Fallback to id as name
        lastOpened: new Date().toISOString(),
        members: ['You', 'External Collaborator'],
        lastActivity: 'Joined external workspace',
        isPinned: false,
        isFavorite: false,
        isShared: true,
        isTemplate: false,
        color: getRandomGradient()
      };
      const updated = [newWs, ...workspaces];
      saveWorkspaces(updated);
      onJoinRoom(cleanId, cleanId);
    }
    setJoinRoomId('');
  };

  const handleCardClick = (ws) => {
    // Update last opened
    const updated = workspaces.map(w => 
      w.id === ws.id ? { ...w, lastOpened: new Date().toISOString() } : w
    );
    saveWorkspaces(updated);
    onJoinRoom(ws.id, ws.name);
  };

  const getRandomGradient = () => {
    const gradients = [
      'from-blue-500 to-indigo-500',
      'from-emerald-500 to-teal-500',
      'from-pink-500 to-rose-500',
      'from-amber-500 to-orange-500',
      'from-purple-500 to-violet-500',
      'from-cyan-500 to-blue-500'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  };

  // Filter & Search Logic
  const filteredWorkspaces = workspaces
    .filter(ws => {
      // Search term
      const matchesSearch = ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ws.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab === 'recent') return !ws.isTemplate;
      if (activeTab === 'pinned') return ws.isPinned && !ws.isTemplate;
      if (activeTab === 'favorites') return ws.isFavorite && !ws.isTemplate;
      if (activeTab === 'shared') return ws.isShared && !ws.isTemplate;
      if (activeTab === 'templates') return ws.isTemplate;

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'lastOpened') {
        comparison = new Date(a.lastOpened) - new Date(b.lastOpened);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const getDisplayName = () => {
    if (user?.firstName) return user.firstName;
    return user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Collaborator';
  };

  return (
    <div className={`min-h-screen w-full font-sans flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Header bar */}
      <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-wide bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">Teamora</span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-950">Enterprise</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
            title="Toggle theme"
          >
            {isDarkMode ? (
              <span className="text-amber-400">☀️</span>
            ) : (
              <span className="text-slate-600">🌙</span>
            )}
          </button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {getDisplayName()} 👋</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage workspaces, collaborate in real-time, or start from templates.</p>
          </div>
          
          {/* Action box: Join/Create quick trigger */}
          <div className="flex flex-wrap gap-3">
            {/* Quick create modal trigger / inputs */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm">
              <input
                type="text"
                placeholder="New Workspace Name..."
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="px-3 py-1.5 bg-transparent text-sm focus:outline-none placeholder-slate-400 w-44"
              />
              <button
                onClick={handleCreateWorkspace}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create</span>
              </button>
            </div>

            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm">
              <input
                type="text"
                placeholder="Enter Room ID..."
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className="px-3 py-1.5 bg-transparent text-sm focus:outline-none placeholder-slate-400 w-36 font-mono"
              />
              <button
                onClick={handleJoinWorkspace}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Join</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search, Filter & Controls Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
          
          {/* Dashboard Tabs */}
          <div className="flex items-center gap-1 border-b md:border-b-0 border-slate-100 dark:border-slate-800 w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'recent', label: 'All Workspaces', icon: Clock },
              { id: 'pinned', label: 'Pinned', icon: Pin },
              { id: 'favorites', label: 'Favorites', icon: Star },
              { id: 'shared', label: 'Shared', icon: Share2 },
              { id: 'templates', label: 'Templates', icon: Layout }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search and view settings */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
            
            {/* Search Input */}
            <div className="relative flex-1 md:flex-none">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-60 pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all"
              />
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-sm">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="lastOpened">Last Opened</option>
                <option value="name">Name</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {/* View Mode Grid/List */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-sm' : 'text-slate-400'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-sm' : 'text-slate-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* Workspaces List/Grid */}
        {filteredWorkspaces.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/80 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No workspaces found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              We couldn't find any workspaces matching your query or selected filters. Try adjusting your settings.
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'flex flex-col gap-3'}>
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
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => handleCardClick(ws)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                    >
                      {/* Decorative Card Gradient Header */}
                      <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${ws.color || 'from-indigo-500 to-purple-500'}`} />

                      <div>
                        {/* Title and Pin/Favorite */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-bold text-lg text-slate-950 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                            {ws.name}
                          </h3>
                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => togglePin(ws.id, e)}
                              className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${ws.isPinned ? 'text-amber-500' : 'text-slate-400'}`}
                              title={ws.isPinned ? "Unpin workspace" : "Pin workspace"}
                            >
                              <Pin className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              onClick={(e) => toggleFavorite(ws.id, e)}
                              className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${ws.isFavorite ? 'text-amber-500' : 'text-slate-400'}`}
                              title={ws.isFavorite ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                        </div>

                        {/* ID / Code */}
                        <span className="inline-block text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md mb-4 uppercase tracking-wider">
                          ID: {ws.id}
                        </span>

                        {/* Recent Activity */}
                        <div className="flex items-center gap-2 mb-6">
                          <Activity className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{ws.lastActivity}</span>
                        </div>
                      </div>

                      {/* Footer: Date & Members */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{lastOpenedString}</span>
                        </div>

                        {/* Members Stack */}
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {ws.members.slice(0, 3).map((member, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-350"
                              title={member}
                            >
                              {member.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {ws.members.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400">
                              +{ws.members.length - 3}
                            </div>
                          )}
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
                      onClick={() => handleCardClick(ws)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-150 flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Mini Indicator */}
                        <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-tr ${ws.color || 'from-indigo-500 to-purple-500'} shrink-0`} />

                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-3 md:items-center">
                          <h3 className="font-bold text-sm text-slate-950 dark:text-white truncate">
                            {ws.name}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-400 truncate uppercase">
                            ID: {ws.id}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                            <Activity className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{ws.lastActivity}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Panel elements */}
                      <div className="flex items-center gap-6 shrink-0 pl-4">
                        <div className="flex items-center gap-1 text-xs text-slate-400 hidden sm:flex">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{lastOpenedString}</span>
                        </div>

                        {/* Pin & Fav controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => togglePin(ws.id, e)}
                            className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${ws.isPinned ? 'text-amber-500' : 'text-slate-400'}`}
                          >
                            <Pin className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={(e) => toggleFavorite(ws.id, e)}
                            className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${ws.isFavorite ? 'text-amber-500' : 'text-slate-400'}`}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>

                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </motion.div>
                  );
                }
              })}
            </AnimatePresence>
          </div>
        )}

      </main>
    </div>
  );
}
