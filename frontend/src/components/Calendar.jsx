import { useEffect, useMemo, useState } from 'react'
import { Calendar as CalendarIcon, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { ensureArray } from '../utils/arrayUtils'

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

const getTaskId = (task) => task?._id || task?.id

export default function Calendar({
  calendarList = [],
  userName,
  workspaceId,
  currentUserRole = 'editor'
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
  const [priority, setPriority] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [monthPulse, setMonthPulse] = useState(0)

  const canEdit = currentUserRole !== 'viewer' && currentUserRole !== 'commenter'
  const todayKey = toDateKey(new Date())

  const monthLabel = useMemo(() => (
    currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  ), [currentDate])

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

    api.get(`/api/v1/workspaces/${workspaceId}/tasks`)
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

  const selectedTasks = useMemo(() => (
    activeDate ? tasks.filter((task) => task.date === activeDate) : []
  ), [activeDate, tasks])

  const openCreateModal = (dateKey) => {
    if (!canEdit) return
    setActiveDate(dateKey)
    setEditingTask(null)
    setTitle('')
    setDescription('')
    setPriority('')
    setSubmitted(false)
    setModalMode('create')
  }

  const openEditModal = (task) => {
    if (!canEdit) return
    setActiveDate(task.date)
    setEditingTask(task)
    setTitle(task.title || '')
    setDescription(task.description || '')
    setPriority(task.priority || '')
    setSubmitted(false)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingTask(null)
    setSubmitted(false)
    setSaving(false)
  }

  const saveTask = async () => {
    setSubmitted(true)
    if (!title.trim() || !priority) return

    setSaving(true)
    const payload = {
      title: title.trim(),
      description: description.trim(),
      date: activeDate,
      priority
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
    try {
      const { data } = await api.patch(`/api/v1/workspaces/${workspaceId}/tasks/${taskId}`, {
        completed: !task.completed
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

  const selectMonth = (month) => {
    setMonthPulse((value) => value + 1)
    setCurrentDate((date) => new Date(date.getFullYear(), Number(month), 1))
  }

  return (
    <section className="flex h-[calc(100vh-120px)] min-h-[620px] flex-col rounded-[20px] border border-[#E5E7EB] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] xl:min-h-0">
      <div className="flex shrink-0 flex-col gap-4 border-b border-[#E5E7EB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#F5F3FF] text-[#7C3AED]">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Calendar</h1>
            <p className="text-sm text-[#6B7280]">{loading ? 'Loading tasks...' : error || monthLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openCreateModal(toDateKey(new Date()))}
            className="inline-flex h-11 items-center gap-2 rounded-[16px] bg-[#7C3AED] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(124,58,237,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#6D28D9]"
          >
            <Plus className="h-4 w-4" />
            New Event
          </button>
          <label className="relative inline-flex h-11 items-center rounded-[16px] border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#374151] transition duration-200 hover:border-[#DDD6FE] hover:bg-[#F8F5FF] hover:text-[#7C3AED]">
            <select
              value={currentDate.getMonth()}
              onChange={(event) => selectMonth(event.target.value)}
              className="appearance-none bg-transparent pr-7 outline-none"
              aria-label="Select calendar month"
            >
              {Array.from({ length: 12 }).map((_, index) => (
                <option key={index} value={index}>
                  {new Date(2026, index, 1).toLocaleDateString(undefined, { month: 'long' })}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4" />
          </label>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-4 px-5 py-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] text-[#6B7280] transition duration-200 hover:border-[#C4B5FD] hover:bg-[#F5F3FF] hover:text-[#7C3AED]"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 key={monthPulse} className="min-w-40 animate-[teamora-content-fade_180ms_ease-out_both] text-center text-lg font-semibold text-[#111827]">
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] text-[#6B7280] transition duration-200 hover:border-[#C4B5FD] hover:bg-[#F5F3FF] hover:text-[#7C3AED]"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid shrink-0 grid-cols-7 border-y border-[#E5E7EB] bg-[#FAFAFB] text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
        {weekdays.map((day) => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>

      <div key={`grid-${monthPulse}`} className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1.5 overflow-hidden bg-[#FAFAFB] p-1.5 animate-[teamora-content-fade_180ms_ease-out_both]">
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
              className={`group relative flex min-h-0 cursor-pointer flex-col rounded-[18px] border bg-white p-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#7C3AED] hover:shadow-[0_16px_30px_rgba(124,58,237,0.14)] ${
                cell.inMonth ? 'border-[#ECEEF3] text-[#111827]' : 'border-[#F1F2F5] text-[#C4C7CF]'
              } ${isToday ? 'outline outline-2 outline-offset-[-3px] outline-[#7C3AED]' : ''}`}
            >
              <span className="text-sm font-semibold">{cell.day}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openCreateModal(cell.key)
                  }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-[#DDD6FE] bg-white text-[#7C3AED] opacity-0 shadow-sm transition duration-200 hover:bg-[#7C3AED] hover:text-white group-hover:opacity-100"
                  aria-label={`Create task for ${formatDate(cell.key)}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}

              <div className="mt-auto flex min-h-5 items-center gap-1.5 pt-2">
                {visible.map((task) => (
                  <span
                    key={getTaskId(task)}
                    className={`h-2.5 w-2.5 rounded-full ${task.completed ? 'bg-[#10B981]' : 'bg-[#7C3AED]'}`}
                    title="Task indicator"
                  />
                ))}
                {hiddenCount > 0 && (
                  <span className="text-xs font-semibold text-[#7C3AED]">+{hiddenCount}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {activeDate && !modalMode && (
        <div className="fixed inset-y-0 right-0 z-[1250] flex w-full max-w-md flex-col border-l border-[#E5E7EB] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)] animate-[teamora-content-fade_180ms_ease-out_both]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#7C3AED]">Tasks</p>
              <h3 className="mt-1 text-xl font-semibold text-[#111827]">{formatDate(activeDate)}</h3>
            </div>
            <button type="button" onClick={() => setActiveDate('')} className="flex h-9 w-9 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#F3F4F6]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateModal(activeDate)}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[#7C3AED] px-4 text-sm font-semibold text-white transition hover:bg-[#6D28D9]"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>

          <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
            {selectedTasks.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#E5E7EB] p-5 text-sm text-[#6B7280]">
                No tasks for this date.
              </div>
            ) : (
              selectedTasks.map((task) => (
                <article key={getTaskId(task)} className="rounded-[18px] border border-[#E5E7EB] bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className={`text-sm font-semibold text-[#111827] ${task.completed ? 'line-through decoration-[#10B981]' : ''}`}>{task.title}</h4>
                      {task.description && <p className="mt-1 text-sm leading-5 text-[#6B7280]">{task.description}</p>}
                    </div>
                    <span className="rounded-full bg-[#F5F3FF] px-2.5 py-1 text-xs font-semibold text-[#7C3AED]">{task.priority}</span>
                  </div>
                  <p className="mt-3 text-xs text-[#9CA3AF]">Created by {task.creator?.fullName || task.creator?.username || task.creator?.email || userName || 'Teamora user'}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => toggleComplete(task)} className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#D1FAE5] px-3 text-xs font-semibold text-[#059669] transition hover:bg-[#ECFDF5]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {task.completed ? 'Completed' : 'Mark Complete'}
                    </button>
                    <button type="button" onClick={() => openEditModal(task)} className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#E5E7EB] px-3 text-xs font-semibold text-[#374151] transition hover:bg-[#F3F4F6]">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteTask(task)} className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-[#FEE2E2] px-3 text-xs font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2]">
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

      {modalMode && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#111827]/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] animate-[teamora-content-fade_180ms_ease-out_both]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-[#111827]">{modalMode === 'edit' ? 'Edit Task' : 'Create Task'}</h3>
                <p className="mt-1 text-sm text-[#6B7280]">{formatDate(activeDate)}</p>
              </div>
              <button type="button" onClick={closeModal} className="flex h-9 w-9 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-[#374151]">Title *</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={`mt-2 h-12 w-full rounded-[16px] border bg-white px-4 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10 ${
                    submitted && !title.trim() ? 'border-[#EF4444]' : 'border-[#E5E7EB]'
                  }`}
                  placeholder="Task title"
                />
                {submitted && !title.trim() && <p className="mt-2 text-xs font-semibold text-[#EF4444]">Title is required.</p>}
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-[#374151]">Description <span className="font-normal text-[#9CA3AF]">(Optional)</span></span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-[16px] border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                  placeholder="Add details"
                />
              </label>

              <div>
                <span className="text-sm font-semibold text-[#374151]">Date</span>
                <div className="mt-2 rounded-[16px] border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm font-medium text-[#6B7280]">
                  {formatDate(activeDate)}
                </div>
              </div>

              <div>
                <span className="text-sm font-semibold text-[#374151]">Priority *</span>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {priorities.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setPriority(item)}
                      className={`h-11 rounded-[14px] border text-sm font-semibold transition duration-200 ${
                        priority === item
                          ? 'border-[#7C3AED] bg-[#F5F3FF] text-[#7C3AED]'
                          : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#DDD6FE] hover:bg-[#F8F5FF] hover:text-[#7C3AED]'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {submitted && !priority && <p className="mt-2 text-xs font-semibold text-[#EF4444]">Priority is required.</p>}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#E5E7EB] pt-5">
              <button type="button" onClick={closeModal} className="h-11 rounded-[14px] border border-[#E5E7EB] px-5 text-sm font-semibold text-[#374151] transition hover:bg-[#F3F4F6]">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={saveTask} className="h-11 rounded-[14px] bg-[#7C3AED] px-5 text-sm font-semibold text-white transition hover:bg-[#6D28D9] disabled:opacity-60">
                {saving ? 'Saving...' : modalMode === 'edit' ? 'Save Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
