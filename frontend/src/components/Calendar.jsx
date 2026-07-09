import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { ensureArray } from './utils/arrayUtils'

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
  if (reminder === '15 min') return 15
  if (reminder === '30 min') return 30
  if (reminder === '1 hour') return 60
  if (reminder === '1 day') return 1440
  return 0
}

const getReminderTriggerTime = (task) => {
  const minutes = getReminderMinutes(task?.reminder)
  if (!minutes || !task?.date) return null
  const dueTime = task.startTime || task.endTime || '09:00'
  const dueDate = new Date(`${task.date}T${dueTime}`)
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
  const [workspaceName, setWorkspaceName] = useState('')
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
    const timers = tasks
      .map((task) => {
        const trigger = getReminderTriggerTime(task)
        if (!trigger || trigger.getTime() <= Date.now() || task.completed || task.status === 'completed') return null
        const delay = trigger.getTime() - Date.now()
        return window.setTimeout(() => {
          const message = `${task.title} is due ${task.startTime ? `at ${task.startTime}` : `on ${formatDate(task.date)}`}`
          toast(message)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Teamora task reminder', { body: message })
          }
        }, delay)
      })
      .filter(Boolean)

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [tasks])

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

  const selectedTasks = useMemo(
    () => (activeDate ? tasks.filter((task) => task.date === activeDate) : []),
    [activeDate, tasks]
  )

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

  const openCreateModal = (dateKey) => {
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
    setWorkspaceName('')
    setSubmitted(false)
    setModalMode('create')
  }

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
    setWorkspaceName(task.workspaceName || '')
    setSubmitted(false)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingTask(null)
    setSubmitted(false)
    setSaving(false)
  }

  const openDatePicker = () => {
    datePickerRef.current?.showPicker?.()
    datePickerRef.current?.click()
  }

  const saveTask = async () => {
    setSubmitted(true)
    const normalizedDate = parseDateInput(dateInput)
    if (!title.trim() || !priority || !normalizedDate) return

    setSaving(true)
    const payload = {
      title: title.trim(),
      description: description.trim(),
      date: normalizedDate,
      priority,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      reminder: reminder.trim(),
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
      setActiveDate(normalizedDate)
      closeModal()
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
      <section className="flex h-[calc(100vh-120px)] min-h-[620px] flex-col rounded-[20px] border border-[#E5E7EB] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="flex shrink-0 flex-col gap-4 border-b border-[#E5E7EB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F5F3FF] text-[#7C3AED]">
              <Search className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">All Tasks</h1>
              <p className="text-sm text-[#6B7280]">
                {loading ? 'Loading tasks...' : error || `${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-[#E5E7EB] bg-[#FAFAFB] p-4 md:grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr]">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
              Search
            </span>
            <input
              value={taskSearch}
              onChange={(event) => setTaskSearch(event.target.value)}
              placeholder="Title, description, assignee..."
              className="h-11 w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#7C3AED]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
              Status
            </span>
            <select
              value={taskFilter}
              onChange={(event) => setTaskFilter(event.target.value)}
              className="h-11 w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#7C3AED]"
            >
              <option value="all">All</option>
              <option value="todo">Todo</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
              Priority
            </span>
            <select
              value={taskPriorityFilter}
              onChange={(event) => setTaskPriorityFilter(event.target.value)}
              className="h-11 w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#7C3AED]"
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
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
              Sort
            </span>
            <select
              value={taskSort}
              onChange={(event) => setTaskSort(event.target.value)}
              className="h-11 w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#7C3AED]"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="priority">Priority</option>
            </select>
          </label>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {visibleTasks.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[#E5E7EB] p-8 text-center text-sm text-[#6B7280]">
              No tasks match your current filters.
            </div>
          ) : (
            visibleTasks.map((task) => (
              <article key={getTaskId(task)} className="rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`text-base font-semibold text-[#111827] ${task.completed ? 'line-through decoration-[#10B981]' : ''}`}
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
                    {task.description && <p className="text-sm leading-6 text-[#6B7280]">{task.description}</p>}
                    <div className="flex flex-wrap gap-3 text-sm text-[#6B7280]">
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
                    <div className="flex flex-wrap gap-3 text-xs text-[#9CA3AF]">
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
                        className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#D1FAE5] px-3 text-sm font-semibold text-[#059669] transition hover:bg-[#ECFDF5]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {task.completed ? 'Completed' : 'Mark Complete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(task)}
                        className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#E5E7EB] px-3 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(task)}
                        className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#FEE2E2] px-3 text-sm font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2]"
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
    <section className="flex h-[calc(100vh-120px)] min-h-[620px] flex-col rounded-card border border-border bg-card shadow-card xl:min-h-0">
      <div className="flex shrink-0 flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text">Calendar</h1>
            <p className="text-sm text-muted">{loading ? 'Loading tasks...' : error || monthLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => (onOpenTasksPage ? onOpenTasksPage() : setTaskViewerOpen(true))}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-text transition duration-200 hover:border-primary hover:bg-primary/10 hover:text-primary"
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition duration-200 hover:border-primary hover:bg-primary/10 hover:text-primary"
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition duration-200 hover:border-primary hover:bg-primary/10 hover:text-primary"
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
              onClick={() => setActiveDate(cell.key)}
              onDoubleClick={() => {
                if (cell.tasks.length === 0) openCreateModal(cell.key)
              }}
              className={`group relative flex min-h-0 cursor-pointer flex-col rounded-card border bg-card p-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-card ${
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
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-card text-primary opacity-0 shadow-card transition duration-200 hover:bg-primary hover:text-white group-hover:opacity-100"
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

      {activeDate && !modalMode && (
        <div className="fixed inset-y-0 right-0 z-[1250] flex w-full max-w-md flex-col border-l border-border bg-card p-5 shadow-card animate-[teamora-content-fade_180ms_ease-out_both]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Tasks</p>
              <h3 className="mt-1 text-xl font-semibold text-text">{formatDate(activeDate)}</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveDate('')}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-primary/10 hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateModal(activeDate)}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>

          <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
            {selectedTasks.length === 0 ? (
              <div className="rounded-card border border-dashed border-border p-5 text-sm text-muted">
                No tasks for this date.
              </div>
            ) : (
              selectedTasks.map((task) => (
                <article
                  key={getTaskId(task)}
                  className="rounded-card border border-border bg-card p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4
                        className={`text-sm font-semibold text-text ${task.completed ? 'line-through decoration-success' : ''}`}
                      >
                        {task.title}
                      </h4>
                      {task.description && <p className="mt-1 text-sm leading-5 text-muted">{task.description}</p>}
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {task.priority}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted/65">
                    Created by{' '}
                    {task.creator?.fullName ||
                      task.creator?.username ||
                      task.creator?.email ||
                      userName ||
                      'Teamora user'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleComplete(task)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#D1FAE5] px-3 text-xs font-semibold text-[#059669] transition hover:bg-[#ECFDF5]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {task.completed ? 'Completed' : 'Mark Complete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(task)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#E5E7EB] px-3 text-xs font-semibold text-[#374151] transition hover:bg-[#F3F4F6]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(task)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#FEE2E2] px-3 text-xs font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {taskViewerOpen && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#111827]/35 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-[#111827]">All Tasks</h3>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Search, filter, sort, and manage every task in this workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTaskViewerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 border-b border-[#E5E7EB] bg-[#FAFAFB] p-4 md:grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
                  Search
                </span>
                <input
                  value={taskSearch}
                  onChange={(event) => setTaskSearch(event.target.value)}
                  placeholder="Title, description, assignee..."
                  className="h-11 w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#7C3AED]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
                  Status
                </span>
                <select
                  value={taskFilter}
                  onChange={(event) => setTaskFilter(event.target.value)}
                  className="h-11 w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#7C3AED]"
                >
                  <option value="all">All</option>
                  <option value="todo">Todo</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
                  Priority
                </span>
                <select
                  value={taskPriorityFilter}
                  onChange={(event) => setTaskPriorityFilter(event.target.value)}
                  className="h-11 w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#7C3AED]"
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
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
                  Sort
                </span>
                <select
                  value={taskSort}
                  onChange={(event) => setTaskSort(event.target.value)}
                  className="h-11 w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#7C3AED]"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="priority">Priority</option>
                </select>
              </label>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {visibleTasks.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[#E5E7EB] p-8 text-center text-sm text-[#6B7280]">
                  No tasks match your current filters.
                </div>
              ) : (
                visibleTasks.map((task) => (
                  <article
                    key={getTaskId(task)}
                    className="rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className={`text-base font-semibold text-[#111827] ${task.completed ? 'line-through decoration-[#10B981]' : ''}`}
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
                        {task.description && <p className="text-sm leading-6 text-[#6B7280]">{task.description}</p>}
                        <div className="flex flex-wrap gap-3 text-sm text-[#6B7280]">
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
                        <div className="flex flex-wrap gap-3 text-xs text-[#9CA3AF]">
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
                          className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#D1FAE5] px-3 text-sm font-semibold text-[#059669] transition hover:bg-[#ECFDF5]"
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
                          className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#E5E7EB] px-3 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask(task)}
                          className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#FEE2E2] px-3 text-sm font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2]"
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
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#111827]/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] animate-[teamora-content-fade_180ms_ease-out_both]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-[#111827]">
                  {modalMode === 'edit' ? 'Edit Task' : 'New Task'}
                </h3>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Fill in the details below and save the task to your calendar.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-[#374151]">Title *</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={`mt-2 h-12 w-full rounded-[16px] border bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 ${submitted && !title.trim() ? 'border-[#EF4444]' : 'border-[#E5E7EB]'}`}
                  placeholder="Task title"
                />
                {submitted && !title.trim() && (
                  <p className="mt-2 text-xs font-semibold text-[#EF4444]">Title is required.</p>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-[#374151]">
                  Description <span className="font-normal text-[#9CA3AF]">(Optional)</span>
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-[16px] border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                  placeholder="Add details"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-[#374151]">Date *</span>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={dateInput}
                      onChange={(event) => setDateInput(event.target.value)}
                      placeholder="DD/MM/YYYY"
                      className={`h-12 flex-1 rounded-[16px] border bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 ${submitted && !parseDateInput(dateInput) ? 'border-[#EF4444]' : 'border-[#E5E7EB]'}`}
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
                      className="h-12 rounded-[16px] border border-[#E5E7EB] px-3 text-sm font-semibold text-[#374151] transition hover:bg-[#F8FAFC]"
                    >
                      Pick
                    </button>
                  </div>
                  {submitted && !parseDateInput(dateInput) && (
                    <p className="mt-2 text-xs font-semibold text-[#EF4444]">A valid date is required.</p>
                  )}
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-[#374151]">Reminder</span>
                  <select
                    value={reminder}
                    onChange={(event) => setReminder(event.target.value)}
                    className="mt-2 h-12 w-full rounded-[16px] border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                  >
                    <option value="">None</option>
                    <option value="15 min">15 min before</option>
                    <option value="30 min">30 min before</option>
                    <option value="1 hour">1 hour before</option>
                    <option value="1 day">1 day before</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-[#374151]">Start Time</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="mt-2 h-12 w-full rounded-[16px] border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[#374151]">End Time</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="mt-2 h-12 w-full rounded-[16px] border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <span className="text-sm font-semibold text-[#374151]">Priority *</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2">
                    {priorities.map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => setPriority(item)}
                        className={`h-11 rounded-[14px] border text-sm font-semibold transition duration-200 ${priority === item ? 'border-[#7C3AED] bg-[#F5F3FF] text-[#7C3AED]' : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#DDD6FE] hover:bg-[#F8F5FF] hover:text-[#7C3AED]'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  {submitted && !priority && (
                    <p className="mt-2 text-xs font-semibold text-[#EF4444]">Priority is required.</p>
                  )}
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-[#374151]">Workspace</span>
                  <input
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    className="mt-2 h-12 w-full rounded-[16px] border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                    placeholder="Workspace name"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E5E7EB] pt-5">
              <button
                type="button"
                onClick={closeModal}
                className="h-11 rounded-[16px] border border-[#E5E7EB] px-5 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveTask}
                className="h-11 rounded-[16px] bg-[#7C3AED] px-5 text-sm font-semibold text-white transition hover:bg-[#6D28D9] disabled:opacity-60"
              >
                {saving ? 'Saving...' : modalMode === 'edit' ? 'Save Event' : 'Save Event'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#111827]/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] animate-[teamora-content-fade_180ms_ease-out_both]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-[#111827]">
              {modalMode === 'edit' ? 'Edit Task' : 'New Task'}
            </h3>
            <p className="mt-1 text-sm text-[#6B7280]">Fill in the details below and save the task to your calendar.</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-[#374151]">Title *</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={`mt-2 h-12 w-full rounded-[16px] border bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 ${submitted && !title.trim() ? 'border-[#EF4444]' : 'border-[#E5E7EB]'}`}
              placeholder="Task title"
            />
            {submitted && !title.trim() && (
              <p className="mt-2 text-xs font-semibold text-[#EF4444]">Title is required.</p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[#374151]">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-[16px] border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
              placeholder="Add details"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">Date *</span>
              <div className="mt-2 flex gap-2">
                <input
                  value={dateInput}
                  onChange={(event) => setDateInput(event.target.value)}
                  placeholder="DD/MM/YYYY"
                  className={`h-12 flex-1 rounded-[16px] border bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 ${submitted && !parseDateInput(dateInput) ? 'border-[#EF4444]' : 'border-[#E5E7EB]'}`}
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
                  className="h-12 rounded-[16px] border border-[#E5E7EB] px-3 text-sm font-semibold text-[#374151] transition hover:bg-[#F8FAFC]"
                >
                  Pick
                </button>
              </div>
              {submitted && !parseDateInput(dateInput) && (
                <p className="mt-2 text-xs font-semibold text-[#EF4444]">A valid date is required.</p>
              )}
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">Reminder</span>
              <select
                value={reminder}
                onChange={(event) => setReminder(event.target.value)}
                className="mt-2 h-12 w-full rounded-[16px] border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
              >
                <option value="">None</option>
                <option value="15 min">15 min before</option>
                <option value="30 min">30 min before</option>
                <option value="1 hour">1 hour before</option>
                <option value="1 day">1 day before</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">Start Time</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-2 h-12 w-full rounded-[16px] border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">End Time</span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-2 h-12 w-full rounded-[16px] border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <span className="text-sm font-semibold text-[#374151]">Priority *</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {priorities.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setPriority(item)}
                    className={`h-11 rounded-[14px] border text-sm font-semibold transition duration-200 ${priority === item ? 'border-[#7C3AED] bg-[#F5F3FF] text-[#7C3AED]' : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#DDD6FE] hover:bg-[#F8F5FF] hover:text-[#7C3AED]'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {submitted && !priority && (
                <p className="mt-2 text-xs font-semibold text-[#EF4444]">Priority is required.</p>
              )}
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">Workspace</span>
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                className="mt-2 h-12 w-full rounded-[16px] border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                placeholder="Workspace name"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E5E7EB] pt-5">
          <button
            type="button"
            onClick={closeModal}
            className="h-11 rounded-[16px] border border-[#E5E7EB] px-5 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={saveTask}
            className="h-11 rounded-[16px] bg-[#7C3AED] px-5 text-sm font-semibold text-white transition hover:bg-[#6D28D9] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
