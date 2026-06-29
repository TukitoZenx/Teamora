import React from 'react';
import { ensureArray } from '../utils/arrayUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Users, 
  Activity, 
  Send, 
  Smile, 
  Paperclip,
  Crown,
  Monitor,
  Calendar,
  X,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Tv,
  Eye
} from 'lucide-react';

const EMOJI_LIST = ['😀','😂','❤️','👍','🎉','🔥','💯','✨','🚀','💡','👏','🙌','😍','🤔','😎','💪','🎯','⭐','💜','🙏'];

export default function CollaborationPanel({
  roomId,
  messages,
  chatInput,
  setChatInput,
  handleSendMessage,
  activeUsers,
  activities = [],
  isCollapsed,
  setIsCollapsed,
  presenter,
  onJoinPresentation
}) {
  const [activeTab, setActiveTab] = React.useState('chat');
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const chatEndRef = React.useRef(null);
  const typingTimeoutRef = React.useRef(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
      setIsTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setChatInput(e.target.value);
    
    // Typing indicator simulation
    if (!isTyping) setIsTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
  };

  const insertEmoji = (emoji) => {
    setChatInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getAppLabel = (appId) => {
    switch(appId) {
      case 'docs': return 'Editing Document';
      case 'whiteboard': return 'Drawing';
      case 'sheets': return 'Editing Spreadsheet';
      case 'slides': return 'Presentation';
      case 'calendar': return 'Calendar';
      case 'tasks': return 'Tasks';
      case 'meetings': return 'Meeting';
      case 'chat': return 'Chat';
      case 'settings': return 'Settings';
      case 'presenting': return 'Presenting';
      case 'watching': return 'Watching Presentation';
      case 'idle': return 'Idle';
      default: return 'Workspace';
    }
  };

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, badge: ensureArray(messages).length > 0 ? ensureArray(messages).length : null },
    { id: 'members', label: 'Members', icon: Users, badge: ensureArray(activeUsers).length },
    { id: 'activity', label: 'Activity', icon: Activity, badge: ensureArray(activities).length > 0 ? ensureArray(activities).length : null },
  ];

  // Collapsed state: Show a thin bar with a toggle button
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="w-10 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
        title="Open collaboration panel"
      >
        <ChevronLeft className="w-4 h-4 text-slate-400" />
        <MessageSquare className="w-4 h-4 text-slate-400" />
        <Users className="w-4 h-4 text-slate-400" />
      </button>
    );
  }

  return (
    <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full z-30 transition-colors duration-300">
      {/* Tab Navigation with Collapse Button */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800/80 p-2 gap-1 bg-slate-50/50 dark:bg-slate-900/10">
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title="Collapse panel"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${
                isActive 
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50' 
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge !== null && (
                <span className="bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-950">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div
              key="chat-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {ensureArray(messages).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500 mb-3">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">No messages yet</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">Start the conversation with your team!</span>
                  </div>
                ) : (
                  ensureArray(messages).map((m, i) => {
                    const isSystemScreenShare = m.user === 'System' && m.message.startsWith('SYSTEM_SCREEN_SHARE_START|');
                    if (isSystemScreenShare) {
                      const [, presenterName, startTime, presenterSocketId] = m.message.split('|');
                      const isActive = presenter && presenter.socketId === presenterSocketId;
                      return (
                        <div key={i} className="flex gap-3 items-start w-full">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 border border-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            📢
                          </div>
                          <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 border border-indigo-500/20 rounded-2xl p-4 text-white shadow-md flex flex-col gap-3 my-1 w-full max-w-[80%]">
                            <div className="flex items-center gap-2">
                              <span className="text-base shrink-0">📺</span>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-100 truncate">{presenterName} started Screen Sharing</span>
                                <span className="text-[9px] text-slate-400">Started at {startTime}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => isActive && onJoinPresentation(presenterSocketId)}
                              disabled={!isActive}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-white transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
                            >
                              {isActive ? 'Join Presentation' : 'Presentation Ended'}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={i} className="flex gap-3 items-start group">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                          {m.user?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="space-y-1 max-w-[80%]">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{m.user}</span>
                            <span className="text-[9px] text-slate-400">{m.timestamp || 'Just now'}</span>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 leading-relaxed border border-slate-200/20">
                            {m.message}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Typing Indicator */}
              {isTyping && (
                <div className="px-4 pb-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 italic animate-pulse">You are typing...</span>
                </div>
              )}

              {/* Chat Input */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/20 relative">
                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                    <div className="absolute bottom-full left-3 mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Quick Emoji</span>
                        <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-10 gap-1">
                        {EMOJI_LIST.map((emoji, i) => (
                          <button
                            key={i}
                            onClick={() => insertEmoji(emoji)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-base"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3 py-1 shadow-sm">
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-slate-400 hover:text-indigo-500 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="flex-1 bg-transparent border-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-2"
                  />
                  <button className="text-slate-400 hover:text-indigo-500 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim()}
                    className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'members' && (
            <motion.div
              key="members-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 p-4 overflow-y-auto space-y-4 no-scrollbar"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Collaborators in Room</h3>
              <div className="space-y-3">
                {ensureArray(activeUsers).map((member, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={member.imageUrl || 'https://www.gravatar.com/avatar/?d=mp'}
                          alt={member.user}
                          className="w-10 h-10 rounded-full object-cover ring-2"
                          style={{ ringColor: member.color || '#6366f1' }}
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full"></span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          {member.user}
                          {i === 0 && <Crown className="w-3.5 h-3.5 text-amber-500" title="Host" />}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                          {member.activeApp === 'presenting' ? (
                            <Tv className="w-3 h-3 text-rose-500 animate-pulse" />
                          ) : member.activeApp === 'watching' ? (
                            <Eye className="w-3 h-3 text-emerald-500 animate-pulse" />
                          ) : (
                            <Monitor className="w-3 h-3 text-indigo-400" />
                          )}
                          {getAppLabel(member.activeApp || 'docs')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.color && (
                        <div 
                          className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-950 shadow-sm"
                          style={{ backgroundColor: member.color }}
                          title="Cursor Color"
                        />
                      )}
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">Online</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div
              key="activity-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 p-4 overflow-y-auto space-y-4 no-scrollbar"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Live Activity Log</h3>
              <div className="space-y-4">
                {ensureArray(activities).length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400 mt-8">
                    <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                    <span className="text-xs font-medium">No recent activities</span>
                  </div>
                ) : (
                  ensureArray(activities).map((act, idx) => (
                    <div key={idx} className="flex gap-3 items-start relative">
                      {idx !== activities.length - 1 && (
                        <div className="absolute left-2.5 top-5 bottom-[-20px] w-[1px] bg-slate-200 dark:bg-slate-800" />
                      )}
                      <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-indigo-500 shrink-0 z-10">
                        {act.type === 'join' ? '➕' : act.type === 'leave' ? '🏃' : act.type === 'edit' ? '✏️' : '🔔'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-700 dark:text-slate-300 leading-tight">
                          <span className="font-semibold text-slate-900 dark:text-white">{act.user}</span> {act.action}
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1">{act.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
