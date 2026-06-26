import React from 'react';
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
  Calendar
} from 'lucide-react';

export default function CollaborationPanel({
  roomId,
  messages,
  chatInput,
  setChatInput,
  handleSendMessage,
  activeUsers,
  activities = []
}) {
  const [activeTab, setActiveTab] = React.useState('chat'); // 'chat', 'members', 'activity'
  const chatEndRef = React.useRef(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, badge: messages.length > 0 ? messages.length : null },
    { id: 'members', label: 'Members', icon: Users, badge: activeUsers.length },
    { id: 'activity', label: 'Activity', icon: Activity, badge: activities.length > 0 ? activities.length : null },
  ];

  return (
    <aside className="w-96 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full z-30 transition-colors duration-300">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800/80 p-2 gap-1 bg-slate-50/50 dark:bg-slate-900/10">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${
                isActive 
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50' 
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge !== null && (
                <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-950">
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
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500 mb-3">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">No messages yet</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">Start the conversation with your team!</span>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className="flex gap-3 items-start">
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
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/20">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3 py-1 shadow-sm">
                  <button className="text-slate-400 hover:text-indigo-500 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Smile className="w-4.5 h-4.5" />
                  </button>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 bg-transparent border-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-2"
                  />
                  <button className="text-slate-400 hover:text-indigo-500 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Paperclip className="w-4.5 h-4.5" />
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
                {activeUsers.map((member, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={member.imageUrl || 'https://www.gravatar.com/avatar/?d=mp'}
                          alt={member.user}
                          className="w-9 h-9 rounded-full object-cover ring-2"
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
                          <Monitor className="w-3 h-3 text-indigo-400" />
                          Viewing: {member.activeApp || 'Docs'}
                        </span>
                      </div>
                    </div>
                    {member.color && (
                      <div 
                        className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-950 shadow-sm"
                        style={{ backgroundColor: member.color }}
                        title="Cursor Color"
                      />
                    )}
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
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400 mt-8">
                    <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                    <span className="text-xs font-medium">No recent activities</span>
                  </div>
                ) : (
                  activities.map((act, idx) => (
                    <div key={idx} className="flex gap-3 items-start relative">
                      {idx !== activities.length - 1 && (
                        <div className="absolute left-2.5 top-5 bottom-[-20px] w-[1px] bg-slate-200 dark:bg-slate-800" />
                      )}
                      <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-indigo-500 shrink-0 z-10">
                        {act.type === 'join' ? '➕' : act.type === 'edit' ? '✏️' : '🔔'}
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
