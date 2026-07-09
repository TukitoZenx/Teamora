import { useState } from 'react'
import {
  CheckSquare,
  List,
  Calendar as CalendarIcon,
  Plus,
  User,
  Clock,
  MessageSquare,
  Send,
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Tasks({
  tasksList = [],
  socket,
  roomId,
  userName,
  activeUsers = [],
  currentUserRole = 'editor'
}) {
  const [activeTab, setActiveTab] = useState('kanban') // 'kanban' | 'list' | 'calendar'
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  // Create task states
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskStatus, setTaskStatus] = useState('todo') // 'backlog', 'todo', 'in-progress', 'review', 'completed'
  const [taskPriority, setTaskPriority] = useState('medium') // 'low', 'medium', 'high'
  const [taskAssignee, setTaskAssignee] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')

  // Comment input
  const [commentInput, setCommentInput] = useState('')

  const canEdit = currentUserRole !== 'viewer' && currentUserRole !== 'commenter'

  const handleCreateTask = () => {
    if (!taskTitle.trim()) return

    const newTask = {
      id: 'task-' + Math.random().toString(36).substring(7),
      title: taskTitle,
      description: taskDesc,
      status: taskStatus,
      priority: taskPriority,
      assignee: taskAssignee || 'Unassigned',
      dueDate: taskDueDate || new Date().toISOString().split('T')[0],
      comments: [],
      createdBy: userName,
      createdAt: new Date().toLocaleDateString()
    }

    const updated = [...tasksList, newTask]
    socket.emit('update-tasks', { roomId, tasks: updated })

    // Reset Form
    setTaskTitle('')
    setTaskDesc('')
    setTaskStatus('todo')
    setTaskPriority('medium')
    setTaskAssignee('')
    setTaskDueDate('')
    setShowTaskModal(false)
    toast.success('Task created successfully!')
  }

  const handleUpdateStatus = (taskId, newStatus) => {
    const updated = tasksList.map((t) => {
      if (t.id === taskId) {
        return { ...t, status: newStatus }
      }
      return t
    })
    socket.emit('update-tasks', { roomId, tasks: updated })
    toast.success(`Task status updated to ${newStatus.replace('-', ' ')}`)
  }

  const handleDeleteTask = (taskId) => {
    const updated = tasksList.filter((t) => t.id !== taskId)
    socket.emit('update-tasks', { roomId, tasks: updated })
    setSelectedTask(null)
    toast.success('Task deleted successfully.')
  }

  const handleAddComment = () => {
    if (!commentInput.trim() || !selectedTask) return

    const commentObj = {
      text: commentInput,
      user: userName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const updated = tasksList.map((t) => {
      if (t.id === selectedTask.id) {
        const newComments = [...(t.comments || []), commentObj]
        // Keep selectedTask in sync locally
        setSelectedTask({ ...t, comments: newComments })
        return { ...t, comments: newComments }
      }
      return t
    })

    socket.emit('update-tasks', { roomId, tasks: updated })
    setCommentInput('')
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50'
      case 'medium':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50'
      default:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50' // low
    }
  }

  const getLaneLabel = (laneId) => {
    switch (laneId) {
      case 'backlog':
        return 'Backlog'
      case 'todo':
        return 'To Do'
      case 'in-progress':
        return 'In Progress'
      case 'review':
        return 'In Review'
      case 'completed':
        return 'Completed'
      default:
        return 'Lanes'
    }
  }

  const lanes = ['backlog', 'todo', 'in-progress', 'review', 'completed']

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden h-full">
      {/* Task Manager Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500 shrink-0">
            <CheckSquare className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Project Tasks</span>
        </div>

        {/* View Swapping Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'kanban'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Board</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Deadlines</span>
          </button>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-indigo-500/10"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        )}
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-auto p-6">
        {/* Tab 1: KANBAN BOARD */}
        {activeTab === 'kanban' && (
          <div className="flex gap-4 h-full min-w-max items-start">
            {lanes.map((lane) => {
              const laneTasks = tasksList.filter((t) => t.status === lane)
              return (
                <div
                  key={lane}
                  className="w-72 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl flex flex-col max-h-full transition-colors overflow-hidden"
                >
                  {/* Lane Header */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/10">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                      {getLaneLabel(lane)}
                    </span>
                    <span className="text-[10px] bg-slate-200/50 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                      {laneTasks.length}
                    </span>
                  </div>

                  {/* Lane Cards List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[40vh] no-scrollbar">
                    {laneTasks.length === 0 ? (
                      <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center text-slate-400 italic text-[11px]">
                        No tasks
                      </div>
                    ) : (
                      laneTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/50 rounded-xl p-3.5 flex flex-col gap-3 shadow-xs hover:shadow-md transition-all cursor-pointer relative group"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${getPriorityColor(task.priority)}`}
                              >
                                {task.priority}
                              </span>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {task.dueDate}
                              </span>
                            </div>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-xs mt-2 leading-snug">
                              {task.title}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-900">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[100px] font-medium">{task.assignee}</span>
                            </div>
                            {task.comments && task.comments.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <MessageSquare className="w-3 h-3" />
                                <span>{task.comments.length}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab 2: LIST VIEW */}
        {activeTab === 'list' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    <th className="px-6 py-3">Task Name</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Priority</th>
                    <th className="px-6 py-3">Assignee</th>
                    <th className="px-6 py-3">Due Date</th>
                    <th className="px-6 py-3">Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tasksList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                        No tasks created yet.
                      </td>
                    </tr>
                  ) : (
                    tasksList.map((task) => (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer text-xs"
                      >
                        <td className="px-6 py-3.5 font-semibold text-slate-800 dark:text-slate-100">{task.title}</td>
                        <td className="px-6 py-3.5">
                          <span className="capitalize text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                            {task.status.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300 font-medium">{task.assignee}</td>
                        <td className="px-6 py-3.5 text-slate-400 dark:text-slate-500 font-mono">{task.dueDate}</td>
                        <td className="px-6 py-3.5 text-slate-400">{task.comments?.length || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: CALENDAR VIEW */}
        {activeTab === 'calendar' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Task Due Deadlines</h3>
            <div className="space-y-3">
              {tasksList.length === 0 ? (
                <p className="italic text-slate-400 text-center py-4">No deadlines set.</p>
              ) : (
                tasksList.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="flex items-center justify-between p-3.5 border border-slate-100 dark:border-slate-800/80 rounded-xl hover:border-indigo-500/50 cursor-pointer hover:shadow-xs transition-all bg-slate-50/20 dark:bg-slate-950/10"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">{task.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Assignee: {task.assignee}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPriorityColor(task.priority)}`}
                      >
                        {task.priority}
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-500">{task.dueDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Task Creator Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full flex flex-col max-h-[85vh] overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 shrink-0 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-500" />
              <span>Create New Task</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Task Title */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="Design login system Mockups"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Task Description
                </label>
                <textarea
                  placeholder="Outline acceptance criteria or technical notes..."
                  value={taskDesc}
                  rows={2}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
                />
              </div>

              {/* Status and Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Status Lane
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Under Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>
              </div>

              {/* Assignee & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Assignee
                  </label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="">Select Assignee</option>
                    {activeUsers.map((m, idx) => (
                      <option key={idx} value={m.user}>
                        {m.user}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details & Comments Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col h-[75vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Task Details</span>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl transition-colors cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Details Panel & Comments Split */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: Details form */}
              <div className="flex-1 p-6 space-y-5 overflow-y-auto border-r border-slate-100 dark:border-slate-800/80">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                    {selectedTask.title}
                  </h3>
                  {selectedTask.description && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed mt-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200/30">
                      {selectedTask.description}
                    </p>
                  )}
                </div>

                {/* Edit Controls */}
                <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-600 dark:text-slate-300">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Status
                    </label>
                    <select
                      disabled={!canEdit}
                      value={selectedTask.status}
                      onChange={(e) => handleUpdateStatus(selectedTask.id, e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
                    >
                      <option value="backlog">Backlog</option>
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Under Review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Priority
                    </label>
                    <select
                      disabled={!canEdit}
                      value={selectedTask.priority}
                      onChange={(e) => {
                        const pri = e.target.value
                        const updated = tasksList.map((t) => (t.id === selectedTask.id ? { ...t, priority: pri } : t))
                        socket.emit('update-tasks', { roomId, tasks: updated })
                        setSelectedTask((prev) => ({ ...prev, priority: pri }))
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <span className="font-semibold block text-[9px] text-slate-400 uppercase tracking-wider mb-1">
                      Assignee
                    </span>
                    <div className="flex items-center gap-1.5 py-1 bg-slate-100/50 dark:bg-slate-800 px-2 rounded-lg border border-slate-200/20">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate w-24">
                        {selectedTask.assignee}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold block text-[9px] text-slate-400 uppercase tracking-wider mb-1">
                      Due Date
                    </span>
                    <div className="flex items-center gap-1.5 py-1 bg-slate-100/50 dark:bg-slate-800 px-2 rounded-lg border border-slate-200/20 font-mono font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300">{selectedTask.dueDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Comments & Updates */}
              <div className="w-full md:w-80 flex flex-col bg-slate-50/50 dark:bg-slate-950/20">
                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
                  <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-3">
                    Task Comments ({selectedTask.comments?.length || 0})
                  </h4>

                  {!selectedTask.comments || selectedTask.comments.length === 0 ? (
                    <p className="italic text-slate-400 text-center py-6">No comments written yet.</p>
                  ) : (
                    selectedTask.comments.map((c, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-[10px] text-indigo-600 dark:text-indigo-400 shrink-0">
                          {c.user.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/20 rounded-xl p-2.5">
                          <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 mb-1">
                            <span>{c.user}</span>
                            <span>{c.timestamp}</span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                            {c.text}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                {canEdit && (
                  <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-[11px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-400"
                    />
                    <button
                      disabled={!commentInput.trim()}
                      onClick={handleAddComment}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
