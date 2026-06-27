import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, MapPin, AlignLeft, Users, Tag, Trash2 } from 'lucide-react';
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
  const [selectedDay, setSelectedDay] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCategory, setEventCategory] = useState('meeting'); // 'meeting', 'deadline', 'workshops', 'social'
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

    const newEvent = {
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

    const updated = [...calendarList, newEvent];
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

  const handleDeleteEvent = (eventId) => {
    const updated = calendarList.filter((e) => e.id !== eventId);
    socket.emit('update-calendar', { roomId, calendar: updated });
    toast.success('Event cancelled.');
  };

  const toggleAttendee = (name) => {
    setSelectedAttendees(prev => 
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  // Resolve matching events for a specific day
  const getEventsForDay = (dayNum) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dayNum).padStart(2, '0');
    const datePattern = `${year}-${month}-${dayStr}`;

    return calendarList.filter((e) => e.start.startsWith(datePattern));
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'deadline': return 'bg-rose-500 text-white';
      case 'workshops': return 'bg-amber-500 text-white';
      case 'social': return 'bg-emerald-500 text-white';
      default: return 'bg-indigo-500 text-white'; // meeting
    }
  };

  const getCategoryLabelColor = (category) => {
    switch (category) {
      case 'deadline': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
      case 'workshops': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'social': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      default: return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'; // meeting
    }
  };

  // Calendar cells generation
  const cells = useMemo(() => {
    const tempCells = [];
    const { firstDayIndex, totalDays } = daysInMonthData;

    // Empty cells for alignment
    for (let i = 0; i < firstDayIndex; i++) {
      tempCells.push({ day: null });
    }

    // Days numbers
    for (let d = 1; d <= totalDays; d++) {
      const events = getEventsForDay(d);
      tempCells.push({ day: d, events });
    }

    return tempCells;
  }, [daysInMonthData, calendarList]);

  // Handle cell click
  const handleCellClick = (cell) => {
    if (!cell.day) return;
    setSelectedDay(cell.day);
  };

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return getEventsForDay(selectedDay);
  }, [selectedDay, calendarList]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 overflow-hidden h-full">
      {/* Left: Monthly grid (70% width) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
        {/* Calendar Navigation Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500 shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{monthYear}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <button 
                onClick={handlePrevMonth}
                className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {canEdit && (
              <button
                onClick={() => setShowEventModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-indigo-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event</span>
              </button>
            )}
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10 text-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none shrink-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Calendar Monthly Grid Cells */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6 auto-rows-fr overflow-hidden bg-slate-100/30 dark:bg-slate-950/20">
          {cells.map((cell, idx) => {
            const hasEvents = cell.events && cell.events.length > 0;
            const isSelected = selectedDay === cell.day;
            
            return (
              <div
                key={idx}
                onClick={() => handleCellClick(cell)}
                className={`border-b border-r border-slate-200/50 dark:border-slate-800/50 p-2 flex flex-col justify-between cursor-pointer select-none transition-all ${
                  cell.day ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'bg-slate-50/30 dark:bg-slate-900/10'
                } ${isSelected ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-500/5 dark:bg-indigo-950/10 z-10' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${cell.day ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300'}`}>
                    {cell.day}
                  </span>
                  {hasEvents && (
                    <div className="flex gap-0.5">
                      {cell.events.slice(0, 3).map((e) => (
                        <div 
                          key={e.id} 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: e.category === 'deadline' ? '#f43f5e' : e.category === 'workshops' ? '#f59e0b' : e.category === 'social' ? '#10b981' : '#6366f1' }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline text summary of top event */}
                {cell.day && hasEvents && (
                  <div className="hidden sm:block text-[9px] font-bold truncate text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/20 mt-1">
                    {cell.events[0].title}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Upcoming Deadlines & Selected day Details (30% width) */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950/40 text-xs">
        {/* Selected Day Details Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>Schedule for {selectedDay ? `${monthYear.split(' ')[0]} ${selectedDay}` : 'Selected Day'}</span>
          </h3>
        </div>

        {/* Selected Day Events List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {!selectedDay ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2 animate-bounce" />
              <p className="text-slate-400">Select a day on the grid to inspect details and scheduled meetings.</p>
            </div>
          ) : selectedDayEvents.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/50 dark:border-slate-800/80">
              <span className="font-medium">No events scheduled</span>
              {canEdit && (
                <button 
                  onClick={() => {
                    const year = currentDate.getFullYear();
                    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDay).padStart(2, '0');
                    setEventStart(`${year}-${month}-${day}T09:00`);
                    setEventEnd(`${year}-${month}-${day}T10:00`);
                    setShowEventModal(true);
                  }}
                  className="mt-3 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-indigo-100/50 dark:border-indigo-900/30"
                >
                  Quick Schedule
                </button>
              )}
            </div>
          ) : (
            selectedDayEvents.map((event) => (
              <div 
                key={event.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-4 flex flex-col gap-2.5 shadow-xs relative group"
              >
                {/* Delete Button overlay */}
                {canEdit && (
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="absolute top-3 right-3 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-300 hover:text-rose-500 rounded-md cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getCategoryLabelColor(event.category)}`}>
                    {event.category}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium">
                    {event.start.split('T')[1]} - {event.end.split('T')[1]}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 pr-6">{event.title}</h4>
                  {event.description && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed mt-1">{event.description}</p>
                  )}
                </div>

                {event.attendees && event.attendees.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    <Users className="w-3 h-3 text-slate-400" />
                    <div className="flex flex-wrap gap-1">
                      {event.attendees.map((attendee, i) => (
                        <span key={i} className="text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md">
                          {attendee}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full flex flex-col max-h-[85vh] overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 shrink-0 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              <span>Schedule New Event</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Event Title */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Event Title</label>
                <input
                  type="text"
                  placeholder="Marketing Sync / Product Alignment"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Starts At</label>
                  <input
                    type="datetime-local"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Ends At</label>
                  <input
                    type="datetime-local"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Event Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Description</label>
                <textarea
                  placeholder="Outline topics or details for the invitees..."
                  value={eventDesc}
                  rows={2}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
                />
              </div>

              {/* Tag / Category Selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Category Tag</label>
                <div className="grid grid-cols-4 gap-2">
                  {['meeting', 'deadline', 'workshops', 'social'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setEventCategory(cat)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border capitalize transition-all cursor-pointer ${
                        eventCategory === cat
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Recurrence */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Recurrence</label>
                <select
                  value={eventRecurrence}
                  onChange={(e) => setEventRecurrence(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="none">One-time Event</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Invite Attendees Checklist */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Invite Members</label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/20 max-h-28 overflow-y-auto space-y-2">
                  {activeUsers.length === 0 ? (
                    <p className="italic text-slate-400 text-center py-2">No active users in room</p>
                  ) : (
                    activeUsers.map((member, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAttendees.includes(member.user)}
                          onChange={() => toggleAttendee(member.user)}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-slate-700 dark:text-slate-300">{member.user}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button 
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateEvent}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Schedule Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
