import React, { useState, useMemo } from 'react';
import { ensureArray } from '../utils/arrayUtils';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, MapPin, AlignLeft, Users, Tag, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Calendar({
  calendarList = [],
  socket,
  roomId,
  userName,
  activeUsers = [],
  currentUserRole = 'editor'
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCategory, setEventCategory] = useState('meeting'); // 'meeting', 'deadline', 'workshops', 'social', 'reminder', 'task', 'event'
  const [eventRecurrence, setEventRecurrence] = useState('none'); // 'none', 'daily', 'weekly', 'monthly'
  const [selectedAttendees, setSelectedAttendees] = useState([]);

  const canEdit = currentUserRole !== 'viewer' && currentUserRole !== 'commenter';

  const monthYear = useMemo(() => {
    return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Days in month calculation
  const daysInMonthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // Index of starting day (0 = Sun, 6 = Sat)
    const totalDays = new Date(year, month + 1, 0).getDate(); // Days in month
    return { firstDayIndex, totalDays };
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleCreateEvent = () => {
    if (!eventTitle.trim() || !eventStart || !eventEnd) {
      toast.error('Please fill in the title, start, and end times.');
      return;
    }

    const baseEvent = {
      id: 'event-' + Math.random().toString(36).substring(7),
      title: eventTitle,
      start: eventStart,
      end: eventEnd,
      description: eventDesc,
      category: eventCategory,
      recurring: eventRecurrence,
      attendees: selectedAttendees,
      createdBy: userName,
      createdAt: new Date().toISOString()
    };

    const newEvents = [baseEvent];

    // Generate recurring events instances (up to 5 occurrences to display in grid)
    if (eventRecurrence !== 'none') {
      const startD = new Date(eventStart);
      const endD = new Date(eventEnd);
      for (let i = 1; i <= 5; i++) {
        const nextStart = new Date(startD);
        const nextEnd = new Date(endD);
        
        if (eventRecurrence === 'daily') {
          nextStart.setDate(startD.getDate() + i);
          nextEnd.setDate(endD.getDate() + i);
        } else if (eventRecurrence === 'weekly') {
          nextStart.setDate(startD.getDate() + i * 7);
          nextEnd.setDate(endD.getDate() + i * 7);
        } else if (eventRecurrence === 'monthly') {
          nextStart.setMonth(startD.getMonth() + i);
          nextEnd.setMonth(endD.getMonth() + i);
        }

        newEvents.push({
          ...baseEvent,
          id: 'event-' + Math.random().toString(36).substring(7) + `-rec-${i}`,
          start: nextStart.toISOString().slice(0, 16),
          end: nextEnd.toISOString().slice(0, 16)
        });
      }
    }

    const updated = [...ensureArray(calendarList), ...newEvents];
    socket.emit('update-calendar', { roomId, calendar: updated });
    
    // Reset Form
    setEventTitle('');
    setEventStart('');
    setEventEnd('');
    setEventDesc('');
    setEventCategory('meeting');
    setEventRecurrence('none');
    setSelectedAttendees([]);
    setShowEventModal(false);
    toast.success('Event scheduled!');
  };

  const handleDeleteEvent = (eventId, e) => {
    e.stopPropagation();
    const updated = ensureArray(calendarList).filter((ev) => ev.id !== eventId);
    socket.emit('update-calendar', { roomId, calendar: updated });
    toast.success('Event cancelled.');
  };

  const toggleAttendee = (name) => {
    setSelectedAttendees(prev => 
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const getEventsForDay = (dayNum) => {
    if (!dayNum) return [];
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    const datePattern = `${year}-${month}-${dayStr}`;

    return ensureArray(calendarList).filter((e) => e && e.start && typeof e.start === 'string' && e.start.startsWith(datePattern));
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'deadline': return 'bg-rose-500 text-white';
      case 'workshops': return 'bg-amber-500 text-white';
      case 'social': return 'bg-emerald-500 text-white';
      case 'reminder': return 'bg-blue-500 text-white';
      case 'task': return 'bg-purple-500 text-white';
      default: return 'bg-indigo-500 text-white'; // meeting / event
    }
  };

  const cells = useMemo(() => {
    const tempCells = [];
    const { firstDayIndex, totalDays } = daysInMonthData;

    // Empty cells
    for (let i = 0; i < firstDayIndex; i++) {
      tempCells.push({ day: null, events: [] });
    }

    // Days cells
    for (let d = 1; d <= totalDays; d++) {
      const dayEvents = getEventsForDay(d);
      tempCells.push({ day: d, events: dayEvents });
    }

    return tempCells;
  }, [daysInMonthData, calendarList]);

  return (
    <div className="flex-1 flex bg-slate-50 dark:bg-slate-950 overflow-hidden h-full">
      {/* Expanded Grid (Occupies 100% width) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
        {/* Navigation Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500 shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{monthYear}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/50">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-550 rounded-lg hover:bg-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 text-slate-550 rounded-lg hover:bg-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 text-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none shrink-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Calendar grid cells */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6 auto-rows-fr overflow-hidden bg-slate-100/30 dark:bg-slate-950/20">
          {cells.map((cell, idx) => {
            const hasEvents = cell.events && cell.events.length > 0;
            return (
              <div
                key={idx}
                className={`border-b border-r border-slate-200/50 dark:border-slate-800/50 p-1.5 flex flex-col cursor-pointer select-none transition-all relative group ${
                  cell.day ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/40' : 'bg-slate-50/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold ${cell.day ? 'text-slate-650 dark:text-slate-300' : 'text-slate-300'}`}>
                    {cell.day}
                  </span>
                  
                  {/* Hover Cell Plus Button */}
                  {cell.day && canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const year = currentDate.getFullYear();
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const day = String(cell.day).padStart(2, '0');
                        setEventStart(`${year}-${month}-${day}T09:00`);
                        setEventEnd(`${year}-${month}-${day}T10:00`);
                        setShowEventModal(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-md cursor-pointer transition-all border border-indigo-200/20"
                      title="Add Item"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Render events inside cell directly */}
                {cell.day && ensureArray(cell.events).length > 0 && (
                  <div className="flex-1 overflow-y-auto space-y-1 mt-1 no-scrollbar max-h-[8vh]">
                    {ensureArray(cell.events).map((e) => (
                      <div 
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (canEdit && window.confirm(`Cancel scheduled item: "${e.title}"?`)) {
                            handleDeleteEvent(e.id, ev);
                          }
                        }}
                        className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate leading-tight select-none border border-black/5 hover:opacity-80 flex items-center justify-between ${getCategoryColor(e.category)}`}
                        title={`${e.title} (${e.start.split('T')[1]} - ${e.end.split('T')[1]})`}
                      >
                        <span className="truncate">{e.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full flex flex-col max-h-[85vh] overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 shrink-0 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              <span>Schedule New Event</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Event Title</label>
                <input
                  type="text"
                  placeholder="Sync alignment / Workshop"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Starts At</label>
                  <input
                    type="datetime-local"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ends At</label>
                  <input
                    type="datetime-local"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  placeholder="Details..."
                  value={eventDesc}
                  rows={2}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['meeting', 'reminder', 'task', 'event'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setEventCategory(cat)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border capitalize transition-all cursor-pointer ${
                        eventCategory === cat
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600'
                          : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recurrence</label>
                <select
                  value={eventRecurrence}
                  onChange={(e) => setEventRecurrence(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="none">One-time Event</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Attendees</label>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-28 overflow-y-auto space-y-2">
                  {ensureArray(activeUsers).map((member, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedAttendees.includes(member.user)}
                        onChange={() => toggleAttendee(member.user)}
                        className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>{member.user}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
              <button 
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateEvent}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
