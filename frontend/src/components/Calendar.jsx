import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { ensureArray } from './utils/arrayUtils'
import useLocalCollabChannel from '../hooks/useLocalCollabChannel'
import { canShowBrowserNotification } from './utils/notificationPreferences'
import { addWorkspaceNotification } from './utils/notifications'
import AiTaskModal from './AiTaskModal'

const priorities = ['Low', 'Medium', 'High', 'Urgent']
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDate = (dateKey) => {
  if (!dateKey) return ''
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatDateInput = (dateKey) => {
  if (!dateKey) return ''
  const [year, month, day] = dateKey.split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

const parseDateInput = (value) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    const parsedDate = new Date(`${year}-${month}-${day}T12:00:00`)
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.getFullYear() !== Number(year) ||
      parsedDate.getMonth() + 1 !== Number(month) ||
      parsedDate.getDate() !== Number(day)
    )
      return ''
    return `${year}-${month}-${day}`
  }

  const dashMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dashMatch) {
    const [, year, month, day] = dashMatch
    const parsedDate = new Date(`${year}-${month}-${day}T12:00:00`)
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.getFullYear() !== Number(year) ||
      parsedDate.getMonth() + 1 !== Number(month) ||
      parsedDate.getDate() !== Number(day)
    )
      return ''
    return `${year}-${month}-${day}`
  }

  return ''
}

const getTaskId = (task) => task?._id || task?.id
const getReminderMinutes = (reminder) => {
  if (reminder === 'At time of event') return 0
  if (reminder === '15 min') return 15
  if (reminder === '30 min') return 30
  if (reminder === '1 hour') return 60
  if (reminder === '1 day') return 1440
  return null
}

const getReminderTriggerTime = (task) => {
  const minutes = getReminderMinutes(task?.reminder)
  if (minutes === null || !task?.date) return null
  const dueTime = task.startTime || task.endTime || '09:00'
  const timeStr = dueTime.includes(':') && dueTime.length === 5 ? `${dueTime}:00` : dueTime
  const dueDate = new Date(`${task.date}T${timeStr}`)
  if (Number.isNaN(dueDate.getTime())) return null
  return new Date(dueDate.getTime() - minutes * 60 * 1000)
}

const formatReminderTrigger = (task) => {
  const trigger = getReminderTriggerTime(task)
  return trigger ? trigger.toLocaleString() : 'None'
}

const getTaskBadgeColor = (task) => {
  if (task?.completed || task?.status === 'completed') return 'bg-emerald-100 text-emerald-700'
  if (task?.priority === 'Urgent' || task?.priority === 'High') return 'bg-rose-100 text-rose-700'
  if (task?.priority === 'Medium') return 'bg-amber-100 text-amber-700'
  return 'bg-card-sunken text-text'
}

export default function Calendar({
  calendarList = [],
  userName,
  workspaceId,
  currentUserRole = 'editor',
  onOpenTasksPage,
  taskViewerPage = false
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [tasks, setTasks] = useState(() => ensureArray(calendarList))
  const [loading, setLoading] = useState(Boolean(workspaceId))
  const [error, setError] = useState('')
  const tasksChannel = useLocalCollabChannel(workspaceId, 'tasks')
  const [activeDate, setActiveDate] = useState('')
  const [modalMode, setModalMode] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [priority, setPriority] = useState('')
  const [reminder, setReminder] = useState('')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderEmail, setReminderEmail] = useState('')
  const [reminderGapMinutes, setReminderGapMinutes] = useState(0)
  const [reminderLimit, setReminderLimit] = useState(1)
  const [workspaceName, setWorkspaceName] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [monthPulse, setMonthPulse] = useState(0)
  const [taskViewerOpen, setTaskViewerOpen] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [taskFilter, setTaskFilter] = useState('all')
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('all')
  const [taskSort, setTaskSort] = useState('newest')
  const datePickerRef = useRef(null)

  const canEdit = currentUserRole !== 'viewer' && currentUserRole !== 'commenter'
  const todayKey = toDateKey(new Date())

  const monthLabel = useMemo(
    () => currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [currentDate]
  )

  const fetchTasks = useCallback(() => {
    if (!workspaceId) return
    api
      .get(`/api/v1/workspaces/${workspaceId}/tasks`)
      .then(({ data }) => {
        setTasks(data.tasks || [])
      })
      .catch((requestError) => {
        setError(requestError.message)
      })
  }, [workspaceId])

  useEffect(() => {
    if (!workspaceId) {
      queueMicrotask(() => {
        setTasks(ensureArray(calendarList))
        setLoading(false)
      })
      return
    }

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setError('')
      }
    })

    api
      .get(`/api/v1/workspaces/${workspaceId}/tasks`)
      .then(({ data }) => {
        if (!cancelled) setTasks(data.tasks || [])
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message)
          setTasks(ensureArray(calendarList))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [calendarList, workspaceId])

  useEffect(() => {
    const handleTasksUpdate = () => {
      fetchTasks()
    }
    tasksChannel.on('tasks-updated', handleTasksUpdate)
    return () => tasksChannel.off('tasks-updated', handleTasksUpdate)
  }, [tasksChannel, fetchTasks])

  useEffect(() => {
    const timers = tasks
      .map((task) => {
        const trigger = getReminderTriggerTime(task)
        if (!trigger || trigger.getTime() <= Date.now() || task.completed || task.status === 'completed') return null
        const delay = trigger.getTime() - Date.now()
        return window.setTimeout(() => {
          const message = `${task.title} is due ${task.startTime ? `at ${task.startTime}` : `on ${formatDate(task.date)}`}`
          toast(message, { icon: '⏰', duration: 8000 })
          addWorkspaceNotification({
            type: 'task_reminder',
            message,
            workspaceId,
            taskId: task.id || task._id,
            taskTitle: task.title
          })
          // Browser notification — task + meeting reminder prefs both accepted
          if (typeof Notification !== 'undefined') {
            const prefsOk =
              canShowBrowserNotification('task_reminder') || canShowBrowserNotification('meeting_reminder')
            const fire = () => {
              if (prefsOk || Notification.permission === 'granted') {
                try {
                  new Notification('Teamora task reminder', { body: message })
                } catch {
                  // ignore
                }
              }
            }
            if (Notification.permission === 'granted') fire()
            else if (Notification.permission === 'default') {
              Notification.requestPermission().then((perm) => {
                if (perm === 'granted') fire()
              })
            }
          }
        }, delay)
      })
      .filter(Boolean)

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [tasks, workspaceId])

  const cells = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    const previousMonthDays = new Date(year, month, 0).getDate()
    const nextCells = []

    for (let index = firstDay - 1; index >= 0; index -= 1) {
      const date = new Date(year, month - 1, previousMonthDays - index)
      nextCells.push({ date, inMonth: false, day: date.getDate(), key: toDateKey(date) })
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day)
      nextCells.push({ date, inMonth: true, day, key: toDateKey(date) })
    }

    while (nextCells.length < 42) {
      const date = new Date(year, month + 1, nextCells.length - firstDay - totalDays + 1)
      nextCells.push({ date, inMonth: false, day: date.getDate(), key: toDateKey(date) })
    }

    return nextCells.map((cell) => ({
      ...cell,
      tasks: tasks.filter((task) => task.date === cell.key)
    }))
  }, [currentDate, tasks])

  const visibleTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase()
    const filtered = tasks.filter((task) => {
      const matchesSearch =
        !query ||
        [task.title, task.description, task.assignee, task.workspaceName].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(query)
        )
      const matchesStatus =
        taskFilter === 'all' ||
        task.status === taskFilter ||
        (taskFilter === 'completed' && (task.completed || task.status === 'completed'))
      const matchesPriority = taskPriorityFilter === 'all' || task.priority === taskPriorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })

    return filtered.sort((left, right) => {
      if (taskSort === 'priority') {
        const priorityOrder = { Urgent: 4, High: 3, Medium: 2, Low: 1 }
        return (priorityOrder[right.priority] || 0) - (priorityOrder[left.priority] || 0)
      }

      if (taskSort === 'oldest') {
        return new Date(left.createdAt || left.updatedAt || 0) - new Date(right.createdAt || right.updatedAt || 0)
      }

      return new Date(right.createdAt || right.updatedAt || 0) - new Date(left.createdAt || left.updatedAt || 0)
    })
  }, [taskFilter, taskPriorityFilter, taskSearch, taskSort, tasks])

  const handleInsertAiTasks = useCallback(
    async (newTasks) => {
      if (!canEdit || !newTasks || newTasks.length === 0) return

      const results = await Promise.allSettled(
        newTasks.map(async (task) => {
          const payload = {
            title: task.title || 'AI Task',
            description: task.description || '',
            date: task.dueDate || new Date().toISOString().slice(0, 10),
            priority: task.priority || 'Medium',
            startTime: '',
            endTime: '',
            reminder: '',
            workspaceName: ''
          }
          const { data } = await api.post(`/api/v1/workspaces/${workspaceId}/tasks`, payload)
          return data.task
        })
      )

      const saved = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)

      if (saved.length > 0) {
        setTasks((prev) => [...prev, ...saved])
        tasksChannel.emit('tasks-updated', {})
      }

      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) {
        toast.error(`${failed} task(s) failed to save.`)
      }
    },
    [canEdit, workspaceId, tasksChannel]
  )

  const openCreateModal = useCallback(
    (dateKey) => {
      if (!canEdit) return
      setActiveDate(dateKey)
      setEditingTask(null)
      setTitle('')
      setDescription('')
      setDateInput(formatDateInput(dateKey))
      setStartTime('')
      setEndTime('')
      setPriority('')
      setReminder('')
      setReminderEnabled(false)
      setReminderEmail('')
      setReminderGapMinutes(0)
      setReminderLimit(1)
      setWorkspaceName('')
      setSubmitted(false)
      setModalMode('create')
    },
    [canEdit]
  )

  const openEditModal = (task) => {
    if (!canEdit) return
    setActiveDate(task.date)
    setEditingTask(task)
    setTitle(task.title || '')
    setDescription(task.description || '')
    setDateInput(formatDateInput(task.date || activeDate))
    setStartTime(task.startTime || '')
    setEndTime(task.endTime || '')
    setPriority(task.priority || '')
    setReminder(task.reminder || '')
    setReminderEnabled(task.reminderEnabled || false)
    setReminderEmail(task.reminderEmail || '')
    setReminderGapMinutes(task.reminderGapMinutes || 0)
    setReminderLimit(task.reminderLimit || 1)
    setWorkspaceName(task.workspaceName || '')
    setSubmitted(false)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingTask(null)
    setSubmitted(false)
    setSaving(false)
    setActiveDate('')
  }

  const closeDatePanel = useCallback(() => {
    setActiveDate('')
  }, [])

  useEffect(() => {
    if (!activeDate || modalMode) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeDatePanel()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeDate, modalMode, closeDatePanel])

  const openDatePicker = () => {
    datePickerRef.current?.showPicker?.()
    datePickerRef.current?.click()
  }

  const saveTask = async () => {
    setSubmitted(true)
    const normalizedDate = parseDateInput(dateInput)
    if (!title.trim() || !priority || !normalizedDate) return

    if (typeof Notification !== 'undefined' && Notification.permission === 'default' && reminder) {
      Notification.requestPermission().catch(() => {})
    }

    setSaving(true)
    const payload = {
      title: title.trim(),
      description: description.trim(),
      date: normalizedDate,
      priority,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      reminder: reminder.trim(),
      reminderEnabled,
      reminderEmail: reminderEmail.trim(),
      reminderGapMinutes: Number(reminderGapMinutes) || 0,
      reminderLimit: Number(reminderLimit) || 1,
      workspaceName: workspaceName.trim()
    }

    try {
      if (modalMode === 'edit' && editingTask) {
        const { data } = await api.patch(`/api/v1/workspaces/${workspaceId}/tasks/${getTaskId(editingTask)}`, payload)
        setTasks((current) => current.map((task) => (getTaskId(task) === getTaskId(editingTask) ? data.task : task)))
        toast.success('Task updated')
      } else {
        const { data } = await api.post(`/api/v1/workspaces/${workspaceId}/tasks`, payload)
        setTasks((current) => [...current, data.task])
        toast.success('Task created')
      }
      tasksChannel.emit('tasks-updated', {})
      closeModal()
      if (onOpenTasksPage) {
        onOpenTasksPage()
      }
    } catch (requestError) {
      toast.error(requestError.message)
      setSaving(false)
    }
  }

  const deleteTask = async (task) => {
    if (!canEdit) return
    const taskId = getTaskId(task)
    try {
      await api.delete(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`)
      setTasks((current) => current.filter((item) => getTaskId(item) !== taskId))
      tasksChannel.emit('tasks-updated', {})
      toast.success('Task deleted')
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }

  const toggleComplete = async (task) => {
    if (!canEdit) return
    const taskId = getTaskId(task)
    const nextCompleted = !task.completed
    const nextStatus = nextCompleted ? 'completed' : 'todo'

    try {
      const { data } = await api.patch(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`, {
        completed: nextCompleted,
        status: nextStatus
      })
      setTasks((current) => current.map((item) => (getTaskId(item) === taskId ? data.task : item)))
      tasksChannel.emit('tasks-updated', {})
      toast.success('Task updated')
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }

  const changeMonth = (direction) => {
    setMonthPulse((value) => value + 1)
    setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() + direction, 1))
  }

  if (taskViewerPage) {
    return (
      <section className="flex h-full min-h-[620px] flex-col rounded-card border border-border bg-card shadow-modal">
        <div className="flex shrink-0 flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-subtle text-primary">
              <Search className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-text">All Tasks</h1>
              <p className="text-sm text-muted">
                {loading ? 'Loading tasks...' : error || `${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-border bg-background p-4 md:grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr]">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Search</span>
            <input
              value={taskSearch}
              onChange={(event) => setTaskSearch(event.target.value)}
              placeholder="Title, description, assignee..."
              className="h-11 w-full rounded-button border border-border bg-card px-3 text-sm text-text outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Status</span>
            <select
              value={taskFilter}
              onChange={(event) => setTaskFilter(event.target.value)}
              className="h-11 w-full rounded-button border border-border bg-card px-3 text-sm text-text outline-none focus:border-primary"
            >
              <option value="all">All</option>
              <option value="todo">Todo</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Priority
            </span>
            <select
              value={taskPriorityFilter}
              onChange={(event) => setTaskPriorityFilter(event.target.value)}
              className="h-11 w-full rounded-button border border-border bg-card px-3 text-sm text-text outline-none focus:border-primary"
            >
              <option value="all">All</option>
              {priorities.map((priorityOption) => (
                <option key={priorityOption} value={priorityOption}>
                  {priorityOption}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Sort</span>
            <select
              value={taskSort}
              onChange={(event) => setTaskSort(event.target.value)}
              className="h-11 w-full rounded-button border border-border bg-card px-3 text-sm text-text outline-none focus:border-primary"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="priority">Priority</option>
            </select>
          </label>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {visibleTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
              No tasks match your current filters.
            </div>
          ) : (
            visibleTasks.map((task) => (
              <article key={getTaskId(task)} className="rounded-card border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`text-base font-semibold text-text ${task.completed ? 'line-through decoration-success' : ''}`}
                      >
                        {task.title}
                      </h4>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getTaskBadgeColor(task)}`}>
                        {task.priority || 'Medium'}
                      </span>
                      <span className="rounded-full bg-card-sunken px-2.5 py-1 text-[11px] font-semibold text-muted">
                        {task.status || (task.completed ? 'completed' : 'todo')}
                      </span>
                    </div>
                    {task.description && <p className="text-sm leading-6 text-muted">{task.description}</p>}
                    <div className="flex flex-wrap gap-3 text-sm text-muted">
                      <span>
                        <strong>Workspace:</strong> {task.workspaceName || 'Workspace'}
                      </span>
                      <span>
                        <strong>Assigned To:</strong> {task.assignee || 'Unassigned'}
                      </span>
                      <span>
                        <strong>Due Date:</strong> {task.date ? formatDate(task.date) : 'Not set'}
                      </span>
                      <span>
                        <strong>Reminder:</strong>{' '}
                        {task.reminder ? `${task.reminder} (${formatReminderTrigger(task)})` : 'None'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted">
                      <span>
                        <strong>Created By:</strong>{' '}
                        {task.creator?.fullName ||
                          task.creator?.username ||
                          task.creator?.email ||
                          userName ||
                          'Teamora user'}
                      </span>
                      <span>
                        <strong>Created:</strong>{' '}
                        {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Unknown'}
                      </span>
                      <span>
                        <strong>Updated:</strong>{' '}
                        {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleComplete(task)}
                        className="inline-flex h-10 items-center gap-2 rounded-control border border-success/30 px-3 text-sm font-semibold text-success transition hover:bg-success-subtle"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {task.completed ? 'Completed' : 'Mark Complete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(task)}
                        className="inline-flex h-10 items-center gap-2 rounded-control border border-border px-3 text-sm font-semibold text-text-secondary transition hover:bg-card-sunken"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(task)}
                        className="inline-flex h-10 items-center gap-2 rounded-control border border-danger/30 px-3 text-sm font-semibold text-danger transition hover:bg-danger-subtle"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        {modalMode && (
          <TaskEditorModal
            modalMode={modalMode}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            dateInput={dateInput}
            setDateInput={setDateInput}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
            priority={priority}
            setPriority={setPriority}
            reminder={reminder}
            setReminder={setReminder}
            workspaceName={workspaceName}
            setWorkspaceName={setWorkspaceName}
            submitted={submitted}
            saving={saving}
            datePickerRef={datePickerRef}
            openDatePicker={openDatePicker}
            closeModal={closeModal}
            saveTask={saveTask}
          />
        )}
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-[620px] flex-col rounded-card border border-border bg-card shadow-card xl:min-h-0">
      <div className="flex shrink-0 flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text">Calendar</h1>
            <p className="text-sm text-muted">{loading ? 'Loading tasks...' : error || monthLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAiModal(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 text-sm font-semibold text-white shadow-sm transition duration-normal hover:from-blue-600 hover:to-indigo-600 hover:scale-105"
          >
            <Sparkles className="h-4 w-4" />
            AI Extract Tasks
          </button>

          <button
            type="button"
            onClick={() => (onOpenTasksPage ? onOpenTasksPage() : setTaskViewerOpen(true))}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-text transition duration-normal hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <Search className="h-4 w-4" />
            View All Tasks
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-4 px-5 py-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition duration-normal hover:border-primary hover:bg-primary/10 hover:text-primary"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2
          key={monthPulse}
          className="min-w-40 animate-[teamora-content-fade_180ms_ease-out_both] text-center text-lg font-semibold text-text"
        >
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition duration-normal hover:border-primary hover:bg-primary/10 hover:text-primary"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid shrink-0 grid-cols-7 border-y border-border bg-card-sunken text-center text-[11px] font-bold uppercase tracking-[0.08em] text-muted/65">
        {weekdays.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div
        key={`grid-${monthPulse}`}
        className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1.5 overflow-hidden bg-card-sunken p-1.5 animate-[teamora-content-fade_180ms_ease-out_both]"
      >
        {cells.map((cell) => {
          const visible = cell.tasks.slice(0, 3)
          const hiddenCount = Math.max(0, cell.tasks.length - visible.length)
          const isToday = cell.key === todayKey

          return (
            <div
              key={cell.key}
              onDoubleClick={() => {
                if (cell.tasks.length === 0) openCreateModal(cell.key)
              }}
              className={`group relative flex min-h-0 cursor-pointer flex-col rounded-card border bg-card p-2.5 text-left transition duration-normal hover:-translate-y-0.5 hover:border-primary hover:shadow-card ${
                cell.inMonth ? 'border-border text-text' : 'border-border/40 text-muted/65'
              } ${isToday ? 'outline outline-2 outline-offset-[-3px] outline-primary' : ''}`}
            >
              <span className="text-sm font-semibold">{cell.day}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openCreateModal(cell.key)
                  }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-card text-primary opacity-0 shadow-card transition duration-normal hover:bg-primary hover:text-on-primary group-hover:opacity-100"
                  aria-label={`Create task for ${formatDate(cell.key)}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}

              <div className="mt-auto flex min-h-5 items-center gap-1.5 pt-2">
                {visible.map((task) => (
                  <span
                    key={getTaskId(task)}
                    className={`h-2.5 w-2.5 rounded-full ${task.completed ? 'bg-success' : 'bg-primary'}`}
                    title="Task indicator"
                  />
                ))}
                {hiddenCount > 0 && <span className="text-xs font-semibold text-primary">+{hiddenCount}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {taskViewerOpen && (
        <div className="fixed inset-0 z-toast flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-modal">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-text">All Tasks</h3>
                <p className="mt-1 text-sm text-muted">
                  Search, filter, sort, and manage every task in this workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTaskViewerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-card-sunken hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 border-b border-border bg-background p-4 md:grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Search
                </span>
                <input
                  value={taskSearch}
                  onChange={(event) => setTaskSearch(event.target.value)}
                  placeholder="Title, description, assignee..."
                  className="h-11 w-full rounded-button border border-border bg-card px-3 text-sm text-text outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Status
                </span>
                <select
                  value={taskFilter}
                  onChange={(event) => setTaskFilter(event.target.value)}
                  className="h-11 w-full rounded-button border border-border bg-card px-3 text-sm text-text outline-none focus:border-primary"
                >
                  <option value="all">All</option>
                  <option value="todo">Todo</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Priority
                </span>
                <select
                  value={taskPriorityFilter}
                  onChange={(event) => setTaskPriorityFilter(event.target.value)}
                  className="h-11 w-full rounded-button border border-border bg-card px-3 text-sm text-text outline-none focus:border-primary"
                >
                  <option value="all">All</option>
                  {priorities.map((priorityOption) => (
                    <option key={priorityOption} value={priorityOption}>
                      {priorityOption}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Sort
                </span>
                <select
                  value={taskSort}
                  onChange={(event) => setTaskSort(event.target.value)}
                  className="h-11 w-full rounded-button border border-border bg-card px-3 text-sm text-text outline-none focus:border-primary"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="priority">Priority</option>
                </select>
              </label>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {visibleTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
                  No tasks match your current filters.
                </div>
              ) : (
                visibleTasks.map((task) => (
                  <article key={getTaskId(task)} className="rounded-card border border-border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className={`text-base font-semibold text-text ${task.completed ? 'line-through decoration-success' : ''}`}
                          >
                            {task.title}
                          </h4>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getTaskBadgeColor(task)}`}
                          >
                            {task.priority || 'Medium'}
                          </span>
                          <span className="rounded-full bg-card-sunken px-2.5 py-1 text-[11px] font-semibold text-muted">
                            {task.status || (task.completed ? 'completed' : 'todo')}
                          </span>
                        </div>
                        {task.description && <p className="text-sm leading-6 text-muted">{task.description}</p>}
                        <div className="flex flex-wrap gap-3 text-sm text-muted">
                          <span>
                            <strong>Workspace:</strong> {task.workspaceName || 'Workspace'}
                          </span>
                          <span>
                            <strong>Assigned To:</strong> {task.assignee || 'Unassigned'}
                          </span>
                          <span>
                            <strong>Due Date:</strong> {task.date ? formatDate(task.date) : 'Not set'}
                          </span>
                          <span>
                            <strong>Reminder:</strong>{' '}
                            {task.reminder ? `${task.reminder} (${formatReminderTrigger(task)})` : 'None'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted">
                          <span>
                            <strong>Created By:</strong>{' '}
                            {task.creator?.fullName ||
                              task.creator?.username ||
                              task.creator?.email ||
                              userName ||
                              'Teamora user'}
                          </span>
                          <span>
                            <strong>Created:</strong>{' '}
                            {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Unknown'}
                          </span>
                          <span>
                            <strong>Updated:</strong>{' '}
                            {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleComplete(task)}
                          className="inline-flex h-10 items-center gap-2 rounded-control border border-success/30 px-3 text-sm font-semibold text-success transition hover:bg-success-subtle"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {task.completed ? 'Completed' : 'Mark Complete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTaskViewerOpen(false)
                            openEditModal(task)
                          }}
                          className="inline-flex h-10 items-center gap-2 rounded-control border border-border px-3 text-sm font-semibold text-text-secondary transition hover:bg-card-sunken"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask(task)}
                          className="inline-flex h-10 items-center gap-2 rounded-control border border-danger/30 px-3 text-sm font-semibold text-danger transition hover:bg-danger-subtle"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 z-toast flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-modal animate-[teamora-content-fade_180ms_ease-out_both]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-text">
                  {modalMode === 'edit' ? 'Edit Task' : 'New Task'}
                </h3>
                <p className="mt-1 text-sm text-muted">Fill in the details below and save the task to your calendar.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-card-sunken hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-text-secondary">Title *</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={`mt-2 h-12 w-full rounded-input border bg-card px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 ${submitted && !title.trim() ? 'border-danger' : 'border-border'}`}
                  placeholder="Task title"
                />
                {submitted && !title.trim() && (
                  <p className="mt-2 text-xs font-semibold text-danger">Title is required.</p>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-text-secondary">
                  Description <span className="font-normal text-muted">(Optional)</span>
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-input border border-border bg-card px-4 py-3 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="Add details"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-text-secondary">Date *</span>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={dateInput}
                      onChange={(event) => setDateInput(event.target.value)}
                      placeholder="DD/MM/YYYY"
                      className={`h-12 flex-1 rounded-input border bg-card px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 ${submitted && !parseDateInput(dateInput) ? 'border-danger' : 'border-border'}`}
                    />
                    <input
                      ref={datePickerRef}
                      type="date"
                      value={parseDateInput(dateInput) || ''}
                      onChange={(event) => setDateInput(formatDateInput(event.target.value))}
                      className="sr-only"
                    />
                    <button
                      type="button"
                      onClick={openDatePicker}
                      className="h-12 rounded-input border border-border px-3 text-sm font-semibold text-text-secondary transition hover:bg-background"
                    >
                      Pick
                    </button>
                  </div>
                  {submitted && !parseDateInput(dateInput) && (
                    <p className="mt-2 text-xs font-semibold text-danger">A valid date is required.</p>
                  )}
                </label>

                <div className="rounded-input border border-border p-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(event) => setReminderEnabled(event.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-text-secondary">Enable Email Reminders</span>
                  </label>

                  {reminderEnabled && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block col-span-2">
                        <span className="text-xs font-semibold text-text-secondary">Email Address</span>
                        <input
                          type="email"
                          value={reminderEmail}
                          onChange={(event) => setReminderEmail(event.target.value)}
                          className="mt-1 h-10 w-full rounded-input border border-border bg-card px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                          placeholder="Email to receive reminders"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-text-secondary">Interval (minutes)</span>
                        <input
                          type="number"
                          min="1"
                          value={reminderGapMinutes}
                          onChange={(event) => setReminderGapMinutes(event.target.value)}
                          className="mt-1 h-10 w-full rounded-input border border-border bg-card px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-text-secondary">Max Reminders</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={reminderLimit}
                          onChange={(event) => setReminderLimit(event.target.value)}
                          className="mt-1 h-10 w-full rounded-input border border-border bg-card px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-text-secondary">Start Time</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="mt-2 h-12 w-full rounded-input border border-border bg-card px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-text-secondary">End Time</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="mt-2 h-12 w-full rounded-input border border-border bg-card px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="text-sm font-semibold text-text-secondary">Priority *</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2">
                    {priorities.map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => setPriority(item)}
                        className={`h-11 rounded-button border text-sm font-semibold transition duration-normal ${priority === item ? 'border-primary bg-primary-subtle text-primary' : 'border-border text-muted hover:border-primary-muted hover:bg-primary-subtle hover:text-primary'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  {submitted && !priority && (
                    <p className="mt-2 text-xs font-semibold text-danger">Priority is required.</p>
                  )}
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-text-secondary">Workspace</span>
                  <input
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    className="mt-2 h-12 w-full rounded-input border border-border bg-card px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Workspace name"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
              <button
                type="button"
                onClick={closeModal}
                className="h-11 rounded-input border border-border px-5 text-sm font-semibold text-text-secondary transition hover:bg-card-sunken"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveTask}
                className="h-11 rounded-input bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:opacity-60"
              >
                {saving ? 'Saving...' : modalMode === 'edit' ? 'Save Event' : 'Save Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AiTaskModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onInsertTasks={handleInsertAiTasks}
        workspaceId={workspaceId}
      />
    </section>
  )
}

function TaskEditorModal({
  modalMode,
  title,
  setTitle,
  description,
  setDescription,
  dateInput,
  setDateInput,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  priority,
  setPriority,
  reminder,
  setReminder,
  workspaceName,
  setWorkspaceName,
  submitted,
  saving,
  datePickerRef,
  openDatePicker,
  closeModal,
  saveTask
}) {
  return (
    <div className="fixed inset-0 z-toast flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-modal animate-[teamora-content-fade_180ms_ease-out_both]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-text">
              {modalMode === 'edit' ? 'Edit Task' : 'New Task'}
            </h3>
            <p className="mt-1 text-sm text-muted">Fill in the details below and save the task to your calendar.</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-card-sunken hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-text-secondary">Title *</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={`mt-2 h-12 w-full rounded-input border bg-card px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 ${submitted && !title.trim() ? 'border-danger' : 'border-border'}`}
              placeholder="Task title"
            />
            {submitted && !title.trim() && <p className="mt-2 text-xs font-semibold text-danger">Title is required.</p>}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-text-secondary">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-input border border-border bg-card px-4 py-3 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              placeholder="Add details"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-text-secondary">Date *</span>
              <div className="mt-2 flex gap-2">
                <input
                  value={dateInput}
                  onChange={(event) => setDateInput(event.target.value)}
                  placeholder="DD/MM/YYYY"
                  className={`h-12 flex-1 rounded-input border bg-card px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 ${submitted && !parseDateInput(dateInput) ? 'border-danger' : 'border-border'}`}
                />
                <input
                  ref={datePickerRef}
                  type="date"
                  value={parseDateInput(dateInput) || ''}
                  onChange={(event) => setDateInput(formatDateInput(event.target.value))}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={openDatePicker}
                  className="h-12 rounded-input border border-border px-3 text-sm font-semibold text-text-secondary transition hover:bg-background"
                >
                  Pick
                </button>
              </div>
              {submitted && !parseDateInput(dateInput) && (
                <p className="mt-2 text-xs font-semibold text-danger">A valid date is required.</p>
              )}
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-text-secondary">Reminder</span>
              <select
                value={reminder}
                onChange={(event) => setReminder(event.target.value)}
                className="mt-2 h-12 w-full rounded-input border border-border bg-card px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <option value="">None</option>
                <option value="At time of event">At time of event</option>
                <option value="15 min">15 min before</option>
                <option value="30 min">30 min before</option>
                <option value="1 hour">1 hour before</option>
                <option value="1 day">1 day before</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-text-secondary">Start Time</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-2 h-12 w-full rounded-input border border-border bg-card px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-text-secondary">End Time</span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-2 h-12 w-full rounded-input border border-border bg-card px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <span className="text-sm font-semibold text-text-secondary">Priority *</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {priorities.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setPriority(item)}
                    className={`h-11 rounded-button border text-sm font-semibold transition duration-normal ${priority === item ? 'border-primary bg-primary-subtle text-primary' : 'border-border text-muted hover:border-primary-muted hover:bg-primary-subtle hover:text-primary'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {submitted && !priority && (
                <p className="mt-2 text-xs font-semibold text-danger">Priority is required.</p>
              )}
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-text-secondary">Workspace</span>
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                className="mt-2 h-12 w-full rounded-input border border-border bg-card px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="Workspace name"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={closeModal}
            className="h-11 rounded-input border border-border px-5 text-sm font-semibold text-text-secondary transition hover:bg-card-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={saveTask}
            className="h-11 rounded-input bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
