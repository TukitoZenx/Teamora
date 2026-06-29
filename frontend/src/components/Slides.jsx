import React, { useState, useEffect } from 'react';
import { ensureArray } from '../utils/arrayUtils';
import { 
  Presentation, Play, Plus, Copy, Trash2, ChevronLeft, ChevronRight,
  X, Palette, StickyNote, Tv, Download, Image as ImageIcon, Video,
  LayoutGrid, ArrowUp, ArrowDown, Type, Table2, BarChart3, Shapes
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const SLIDE_THEMES = [
  { id: 'default', label: 'Clean', gradient: 'from-white to-slate-50 dark:from-slate-900 dark:to-slate-900', accent: 'from-amber-500 to-orange-500' },
  { id: 'ocean', label: 'Ocean', gradient: 'from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950', accent: 'from-blue-500 to-cyan-500' },
  { id: 'sunset', label: 'Sunset', gradient: 'from-rose-50 to-amber-50 dark:from-rose-950 dark:to-amber-950', accent: 'from-rose-500 to-amber-500' },
  { id: 'forest', label: 'Forest', gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950', accent: 'from-emerald-500 to-teal-500' },
  { id: 'purple', label: 'Cosmos', gradient: 'from-violet-50 to-indigo-50 dark:from-violet-950 dark:to-indigo-950', accent: 'from-violet-500 to-indigo-500' },
];

export default function Slides({
  slides = [],
  activeSlide,
  setActiveSlide,
  isPresenting,
  setIsPresenting,
  addSlide,
  handleSlideUpdate,
  roomId,
  socket,
  activeUsers = [],
  setSlides,
  activeFileId,
  filesList = []
}) {
  const [showNotes, setShowNotes] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false); 
  const [transitionEffect, setTransitionEffect] = useState('fade'); // 'fade', 'slide', 'zoom'
  
  // Elements toolbar / states
  const [selectedElemId, setSelectedElemId] = useState(null);

  const theme = SLIDE_THEMES.find(t => t.id === selectedTheme) || SLIDE_THEMES[0];

  // Dynamic slides load from active file content
  useEffect(() => {
    if (activeFileId && filesList && filesList.length > 0) {
      const file = filesList.find(f => f.id === activeFileId);
      if (file && file.content) {
        if (Array.isArray(file.content)) {
          setSlides(file.content);
        } else {
          console.warn('Warning: loaded slide content is not an array:', file.content);
          setSlides([{ title: 'Click to add title', content: 'Click to add text', notes: '', elements: [], layout: 'title' }]);
        }
      } else {
        setSlides([{ title: 'Click to add title', content: 'Click to add text', notes: '', elements: [], layout: 'title' }]);
      }
    }
  }, [activeFileId, filesList, setSlides]);

  // Sync event listener for custom slide lists
  useEffect(() => {
    socket.on('receive-slides-list', (syncedSlides) => {
      if (syncedSlides) {
        if (Array.isArray(syncedSlides)) {
          setSlides(syncedSlides);
        } else {
          console.warn('Warning: received slides list is not an array:', syncedSlides);
          setSlides([]);
        }
      }
    });
    return () => {
      socket.off('receive-slides-list');
    };
  }, [socket]);

  // Keyboard navigation for presentation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPresenting) {
        if (e.key === 'Escape') {
          setIsPresenting(false);
          setPresenterMode(false);
        } else if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          const nextIndex = Math.min(slides.length - 1, activeSlide + 1);
          setActiveSlide(nextIndex);
          socket.emit('change-slide', { roomId, slideIndex: nextIndex });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIndex = Math.max(0, activeSlide - 1);
          setActiveSlide(prevIndex);
          socket.emit('change-slide', { roomId, slideIndex: prevIndex });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, activeSlide, slides.length, roomId, socket]);

  const activeSlideData = slides[activeSlide] || slides[0] || { title: '', content: '', notes: '', elements: [], layout: 'title' };
  const slideElements = activeSlideData.elements || [];

  const handleDuplicateSlide = () => {
    const slideToDuplicate = activeSlideData;
    const newSlides = [...slides];
    newSlides.splice(activeSlide + 1, 0, { 
      title: slideToDuplicate.title, 
      content: slideToDuplicate.content, 
      notes: slideToDuplicate.notes || '',
      layout: slideToDuplicate.layout || 'title',
      elements: slideToDuplicate.elements ? [...slideToDuplicate.elements] : []
    });
    setSlides(newSlides);
    setActiveSlide(activeSlide + 1);
    
    if (activeFileId) {
      socket.emit('file-content-update', { roomId, fileId: activeFileId, content: newSlides });
    } else {
      socket.emit('update-slides-list', { roomId, slides: newSlides });
    }
    socket.emit('change-slide', { roomId, slideIndex: activeSlide + 1 });
    toast.success('Slide duplicated');
  };

  const handleDeleteSlide = () => {
    if (slides.length <= 1) {
      toast.error('Cannot delete the last slide');
      return;
    }
    const newSlides = slides.filter((_, i) => i !== activeSlide);
    const newActive = Math.max(0, activeSlide - 1);
    setSlides(newSlides);
    setActiveSlide(newActive);
    
    if (activeFileId) {
      socket.emit('file-content-update', { roomId, fileId: activeFileId, content: newSlides });
    } else {
      socket.emit('update-slides-list', { roomId, slides: newSlides });
    }
    socket.emit('change-slide', { roomId, slideIndex: newActive });
    toast.success('Slide deleted');
  };

  const handleMoveSlide = (currentIndex, direction) => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    
    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(currentIndex, 1);
    newSlides.splice(targetIndex, 0, movedSlide);
    setSlides(newSlides);
    setActiveSlide(targetIndex);
    
    if (activeFileId) {
      socket.emit('file-content-update', { roomId, fileId: activeFileId, content: newSlides });
    } else {
      socket.emit('update-slides-list', { roomId, slides: newSlides });
    }
    socket.emit('change-slide', { roomId, slideIndex: targetIndex });
  };

  // Slides Inserts
  const addElementToSlide = (type) => {
    let sourceVal = '';
    if (type === 'image') {
      sourceVal = prompt('Enter Image URL:', 'https://picsum.photos/400/300');
      if (!sourceVal) return;
    } else if (type === 'video') {
      sourceVal = prompt('Enter Video link (YouTube embed URL):', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
      if (!sourceVal) return;
    }

    const newElement = {
      id: 'elem-' + Math.random().toString(36).substring(7),
      type,
      x: 100,
      y: 150,
      width: type === 'image' || type === 'video' ? 320 : type === 'table' ? 300 : 150,
      height: type === 'image' || type === 'video' ? 180 : type === 'table' ? 120 : 100,
      src: sourceVal,
      color: '#6366f1'
    };

    const currentElems = activeSlideData.elements || [];
    handleSlideUpdate('elements', [...currentElems, newElement]);
    setSelectedElemId(newElement.id);
    toast.success(`Inserted ${type} element!`);
  };

  const deleteElement = (elemId) => {
    const currentElems = activeSlideData.elements || [];
    const updated = currentElems.filter(el => el.id !== elemId);
    handleSlideUpdate('elements', updated);
    setSelectedElemId(null);
  };

  const handleElementDrag = (e, elem) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startElemX = elem.x;
    const startElemY = elem.y;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const currentElems = activeSlideData.elements || [];
      const updated = currentElems.map(el => el.id === elem.id ? { ...el, x: startElemX + dx, y: startElemY + dy } : el);
      // Inline visual update, sync on release
      handleSlideUpdate('elements', updated);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleExportDeckOutline = () => {
    try {
      let outlineText = `PRESENTATION: ${roomId.toUpperCase()}\n`;
      ensureArray(slides).forEach((slide, idx) => {
        outlineText += `\n--- SLIDE ${idx + 1} ---\nTitle: ${slide.title || 'Untitled'}\nBody: ${slide.content || ''}\nNotes: ${slide.notes || ''}\n`;
      });
      const blob = new Blob([outlineText], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'presentation-outline.txt';
      link.click();
      toast.success('Outline text exported!');
    } catch {
      toast.error('Outline export failed.');
    }
  };

  const getUsersOnSlide = (slideIdx) => {
    return activeUsers.filter(u => u.activeApp === 'slides' && u.activeSlide === slideIdx);
  };

  // Motion variants for slide transition
  const getSlideTransition = () => {
    if (transitionEffect === 'slide') {
      return {
        initial: { opacity: 0, x: 150 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -150 }
      };
    } else if (transitionEffect === 'zoom') {
      return {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.1 }
      };
    }
    // Default fade
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    };
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden h-full relative">
      {/* Presentation Fullscreen */}
      {isPresenting && (
        <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col items-center justify-center">
          <button 
            onClick={() => { setIsPresenting(false); setPresenterMode(false); }} 
            className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer z-50"
            title="Exit Slideshow (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {presenterMode ? (
            <div className="w-[90vw] h-[85vh] flex gap-6">
              {/* Presenter Split Screen View */}
              <div className="flex-1 bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Current Slide</span>
                <div className={`aspect-[16/9] w-full bg-gradient-to-br ${theme.gradient} rounded-xl p-8 flex flex-col justify-center text-center relative border border-white/5 overflow-hidden`}>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    {activeSlideData.title || 'Untitled Slide'}
                  </h1>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-450 leading-relaxed max-w-md mx-auto">
                    {activeSlideData.content}
                  </p>
                </div>
                <div className="text-xs text-white/50">Slide {activeSlide + 1} of {slides.length}</div>
              </div>

              <div className="w-96 bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-3">Speaker Notes</span>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-h-[150px] text-xs text-slate-200 leading-relaxed overflow-y-auto">
                    {activeSlideData.notes || 'No notes added to this slide.'}
                  </div>
                </div>

                <div className="flex-1 border-t border-white/10 pt-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Up Next</span>
                  {slides[activeSlide + 1] ? (
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-left">
                      <p className="font-bold text-xs text-white">{slides[activeSlide+1].title}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-1">{slides[activeSlide+1].content}</p>
                    </div>
                  ) : (
                    <p className="italic text-[10px] text-slate-500 text-center py-4">End of Slide Presentation</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-[85vw] max-w-5xl aspect-[16/9] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  {...getSlideTransition()}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className={`w-full h-full bg-gradient-to-br ${theme.gradient} rounded-2xl p-12 md:p-20 shadow-2xl flex flex-col justify-center items-center text-center relative border border-white/5 overflow-hidden`}
                >
                  <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${theme.accent} rounded-t-2xl`} />
                  <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight select-none">
                    {activeSlideData.title || 'Untitled Slide'}
                  </h1>
                  <p className="text-lg md:text-2xl text-slate-550 dark:text-slate-400 max-w-2xl leading-relaxed select-none">
                    {activeSlideData.content}
                  </p>

                  {/* Render absolute slide elements in presentation */}
                  {ensureArray(slideElements).map((el) => (
                    <div 
                      key={el.id}
                      style={{ position: 'absolute', left: `${(el.x / 800) * 100}%`, top: `${(el.y / 500) * 100}%`, width: el.width, height: el.height }}
                      className="pointer-events-none"
                    >
                      {el.type === 'image' ? (
                        <img src={el.src} className="w-full h-full object-cover rounded shadow" alt="present-insert" />
                      ) : el.type === 'video' ? (
                        <iframe src={el.src} className="w-full h-full rounded shadow" title="present-video" frameBorder="0" allowFullScreen />
                      ) : el.type === 'shape' ? (
                        <div className="w-full h-full bg-indigo-500 rounded-full" />
                      ) : el.type === 'table' ? (
                        <table className="w-full h-full border border-slate-300 text-slate-800 text-[10px] bg-white">
                          <tbody>
                            <tr><td className="border p-1">Row</td><td className="border p-1">Row</td></tr>
                          </tbody>
                        </table>
                      ) : (
                        <div className="w-full h-full border border-dashed border-slate-300" />
                      )}
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          <div className="absolute bottom-8 flex items-center gap-4 bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 z-50">
            <button 
              onClick={() => {
                const prevIndex = Math.max(0, activeSlide - 1);
                setActiveSlide(prevIndex);
                socket.emit('change-slide', { roomId, slideIndex: prevIndex });
              }} 
              disabled={activeSlide === 0}
              className="p-2 bg-white/5 hover:bg-white/15 disabled:opacity-35 text-white rounded-full cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white select-none">{activeSlide + 1} / {slides.length}</span>
            <button 
              onClick={() => {
                const nextIndex = Math.min(slides.length - 1, activeSlide + 1);
                setActiveSlide(nextIndex);
                socket.emit('change-slide', { roomId, slideIndex: nextIndex });
              }} 
              disabled={activeSlide === slides.length - 1}
              className="p-2 bg-white/5 hover:bg-white/15 disabled:opacity-35 text-white rounded-full cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="w-px h-5 bg-white/10" />

            <button 
              onClick={() => setPresenterMode(!presenterMode)}
              className={`flex items-center gap-1 text-[10px] uppercase font-bold text-white px-2.5 py-1 rounded-md border ${presenterMode ? 'bg-indigo-600 border-indigo-500' : 'bg-transparent border-white/10 hover:bg-white/5'}`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Presenter Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* Slide Editor Topbar */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 shrink-0">
            <Presentation className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Pitch Presentation</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={addSlide}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-white hover:bg-indigo-600 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200/50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Slide</span>
          </button>
          <button onClick={handleDuplicateSlide} className="p-2 text-slate-500 hover:text-indigo-500 rounded-lg hover:bg-slate-100 cursor-pointer" title="Duplicate"><Copy className="w-4 h-4" /></button>
          <button onClick={handleDeleteSlide} className="p-2 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-slate-100 cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />
          
          {/* Elements insertions */}
          <button onClick={() => addElementToSlide('image')} className="p-2 text-slate-500 hover:text-indigo-500 rounded-lg hover:bg-slate-100 cursor-pointer" title="Insert Image"><ImageIcon className="w-4 h-4" /></button>
          <button onClick={() => addElementToSlide('video')} className="p-2 text-slate-500 hover:text-indigo-500 rounded-lg hover:bg-slate-100 cursor-pointer" title="Insert Video"><Video className="w-4 h-4" /></button>
          <button onClick={() => addElementToSlide('shape')} className="p-2 text-slate-500 hover:text-indigo-500 rounded-lg hover:bg-slate-100 cursor-pointer" title="Insert Shape"><Shapes className="w-4 h-4" /></button>
          <button onClick={() => addElementToSlide('table')} className="p-2 text-slate-500 hover:text-indigo-500 rounded-lg hover:bg-slate-100 cursor-pointer" title="Insert Table"><Table2 className="w-4 h-4" /></button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Theme Picker */}
          <div className="relative">
            <button 
              onClick={() => setShowThemePicker(!showThemePicker)}
              className={`p-2 rounded-lg cursor-pointer ${showThemePicker ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500 hover:text-indigo-500'}`}
              title="Theme Color"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showThemePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowThemePicker(false)} />
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-3 min-w-[200px]">
                  <span className="text-xs font-semibold text-slate-450 mb-2 block">Slides Theme</span>
                  <div className="space-y-1.5">
                    {SLIDE_THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTheme(t.id); setShowThemePicker(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${selectedTheme === t.id ? 'bg-indigo-500/10 text-indigo-600' : 'text-slate-650 hover:bg-slate-50'}`}
                      >
                        <div className={`w-6 h-4 rounded bg-gradient-to-r ${t.accent}`} />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Transition settings */}
          <select 
            value={transitionEffect} 
            onChange={(e) => setTransitionEffect(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 cursor-pointer"
            title="Slide Transition Effect"
          >
            <option value="fade">Fade Transition</option>
            <option value="slide">Slide Transition</option>
            <option value="zoom">Zoom Transition</option>
          </select>

          <button onClick={() => setShowNotes(!showNotes)} className={`p-2 rounded-lg cursor-pointer ${showNotes ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500'}`} title="Speaker Notes"><StickyNote className="w-4 h-4" /></button>
          <button onClick={handleExportDeckOutline} className="p-2 text-slate-500 hover:text-indigo-500 rounded-lg cursor-pointer" title="Export PPTX Outline"><Download className="w-4 h-4" /></button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />
          
          <button 
            onClick={() => { setIsPresenting(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Present</span>
          </button>
        </div>
      </div>

      {/* Main slide layout shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnails Sidebar */}
        <div className="w-52 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
            {ensureArray(slides).map((s, i) => {
              const isActive = activeSlide === i;
              const usersHere = getUsersOnSlide(i);
              return (
                <div key={i} className="flex gap-2 items-start relative group">
                  <span className="text-[10px] font-bold text-slate-400 mt-2.5 w-4 text-right select-none">{i + 1}</span>
                  
                  {/* Reorder actions */}
                  <div className="absolute left-[-2px] top-6 flex flex-col gap-0.5 hidden group-hover:flex z-40 bg-slate-900 text-white rounded p-0.5">
                    <button disabled={i === 0} onClick={() => handleMoveSlide(i, 'up')} className="disabled:opacity-30 p-0.5 hover:text-indigo-400"><ArrowUp className="w-3 h-3" /></button>
                    <button disabled={i === slides.length - 1} onClick={() => handleMoveSlide(i, 'down')} className="disabled:opacity-30 p-0.5 hover:text-indigo-400"><ArrowDown className="w-3 h-3" /></button>
                  </div>

                  <button
                    onClick={() => { setActiveSlide(i); socket.emit('change-slide', { roomId, slideIndex: i }); }}
                    className={`flex-1 aspect-[16/9] bg-gradient-to-br ${theme.gradient} rounded-xl p-3 text-left border cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isActive ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r ${theme.accent}`} />
                    <div className="text-[9px] font-bold text-slate-800 truncate w-full">{s.title || 'Untitled'}</div>
                    <div className="text-[7px] text-slate-400 line-clamp-2 mt-1 leading-snug">{s.content}</div>
                    
                    {usersHere.length > 0 && (
                      <div className="absolute bottom-1 right-1 flex -space-x-1.5 overflow-hidden z-10 p-0.5">
                        {ensureArray(usersHere).map((u, uIdx) => (
                          <img
                            key={uIdx}
                            className="inline-block h-4 w-4 rounded-full border bg-white object-cover"
                            src={u.imageUrl || 'https://www.gravatar.com/avatar/?d=mp'}
                            alt={u.user}
                            title={u.user}
                            style={{ borderColor: u.color }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor Screen */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-905">
          {/* Layout type selector */}
          <div className="h-9 border-b border-slate-200 px-6 bg-white flex items-center gap-3 shrink-0 select-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Slide Layout:</span>
            {['title', 'split', 'image-left', 'normal'].map(l => (
              <button 
                key={l}
                onClick={() => handleSlideUpdate('layout', l)}
                className={`px-3 py-0.5 rounded-lg text-[10px] font-bold border capitalize cursor-pointer ${activeSlideData.layout === l ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-650'}`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Slide canvas area */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-hidden">
            <div 
              className={`w-full max-w-4xl aspect-[16/9] bg-gradient-to-br ${theme.gradient} border border-slate-200/60 shadow-2xl rounded-3xl p-10 flex flex-col justify-center relative overflow-hidden`}
            >
              <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${theme.accent} rounded-t-3xl`} />
              
              {/* Dynamic layout templates */}
              {activeSlideData.layout === 'title' ? (
                <div className="flex flex-col justify-center items-center h-full text-center">
                  <input
                    type="text"
                    value={activeSlideData.title || ''}
                    onChange={(e) => handleSlideUpdate('title', e.target.value)}
                    className="text-4xl font-bold text-slate-950 dark:text-white border-b border-transparent focus:border-indigo-500 outline-none w-full text-center bg-transparent py-2"
                    placeholder="Enter Title"
                  />
                  <textarea
                    value={activeSlideData.content || ''}
                    onChange={(e) => handleSlideUpdate('content', e.target.value)}
                    className="text-base text-slate-500 dark:text-slate-400 outline-none w-full text-center bg-transparent py-2 resize-none mt-4 h-24"
                    placeholder="Enter subtitle details..."
                  />
                </div>
              ) : activeSlideData.layout === 'split' ? (
                <div className="h-full flex flex-col">
                  <input
                    type="text"
                    value={activeSlideData.title || ''}
                    onChange={(e) => handleSlideUpdate('title', e.target.value)}
                    className="text-2xl font-bold text-slate-950 dark:text-white border-b border-transparent focus:border-indigo-500 outline-none bg-transparent py-1 w-full text-center"
                    placeholder="Enter Title"
                  />
                  <div className="grid grid-cols-2 gap-6 flex-1 mt-6">
                    <textarea
                      value={activeSlideData.content || ''}
                      onChange={(e) => handleSlideUpdate('content', e.target.value)}
                      className="border border-dashed border-slate-300 rounded-xl p-3 text-xs bg-transparent resize-none h-full outline-none focus:border-indigo-500"
                      placeholder="Column 1 text..."
                    />
                    <textarea
                      value={activeSlideData.splitContent2 || ''}
                      onChange={(e) => handleSlideUpdate('splitContent2', e.target.value)}
                      className="border border-dashed border-slate-300 rounded-xl p-3 text-xs bg-transparent resize-none h-full outline-none focus:border-indigo-500"
                      placeholder="Column 2 text..."
                    />
                  </div>
                </div>
              ) : activeSlideData.layout === 'image-left' ? (
                <div className="h-full flex gap-6 items-center">
                  <div className="w-1/2 aspect-[4/3] bg-slate-100 rounded-2xl flex flex-col items-center justify-center border border-dashed text-slate-400 text-xs">
                    {activeSlideData.elements?.some(el => el.type === 'image') ? (
                      <img src={activeSlideData.elements.find(el => el.type === 'image').src} className="w-full h-full object-cover rounded-2xl" alt="slide-left" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span>Insert Image element to preview</span>
                      </>
                    )}
                  </div>
                  <div className="w-1/2 flex flex-col justify-center gap-3">
                    <input
                      type="text"
                      value={activeSlideData.title || ''}
                      onChange={(e) => handleSlideUpdate('title', e.target.value)}
                      className="text-2xl font-bold text-slate-950 dark:text-white outline-none bg-transparent"
                      placeholder="Title"
                    />
                    <textarea
                      value={activeSlideData.content || ''}
                      onChange={(e) => handleSlideUpdate('content', e.target.value)}
                      className="text-xs text-slate-500 bg-transparent resize-none h-32 outline-none focus:border-indigo-500"
                      placeholder="Content text..."
                    />
                  </div>
                </div>
              ) : (
                // Normal layout
                <div className="h-full flex flex-col">
                  <input
                    type="text"
                    value={activeSlideData.title || ''}
                    onChange={(e) => handleSlideUpdate('title', e.target.value)}
                    className="text-2xl font-bold text-slate-950 dark:text-white border-b border-transparent focus:border-indigo-500 outline-none bg-transparent py-1 w-full"
                    placeholder="Click to add title"
                  />
                  <textarea
                    value={activeSlideData.content || ''}
                    onChange={(e) => handleSlideUpdate('content', e.target.value)}
                    className="flex-1 text-sm text-slate-500 dark:text-slate-400 bg-transparent resize-none mt-4 outline-none focus:border-indigo-500"
                    placeholder="Click to add body content..."
                  />
                </div>
              )}

              {/* Absolute elements rendering */}
              {ensureArray(slideElements).map((el) => {
                const isSelected = selectedElemId === el.id;
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementDrag(e, el)}
                    style={{ position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height, zIndex: isSelected ? 40 : 10 }}
                    className={`border relative select-none cursor-move ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-500/25' : 'border-transparent hover:border-slate-300'}`}
                  >
                    {isSelected && (
                      <button 
                        onMouseDown={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                        className="absolute -top-6 -right-6 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full z-50 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {el.type === 'image' ? (
                      <img src={el.src} className="w-full h-full object-cover rounded pointer-events-none" alt="deck-insert" />
                    ) : el.type === 'video' ? (
                      <iframe src={el.src} className="w-full h-full rounded pointer-events-none" title="deck-video" frameBorder="0" />
                    ) : el.type === 'shape' ? (
                      <div className="w-full h-full bg-indigo-500/35 rounded-full border-2 border-indigo-500 pointer-events-none" />
                    ) : el.type === 'table' ? (
                      <table className="w-full h-full border border-slate-300 text-slate-800 text-[10px] bg-white pointer-events-none">
                        <tbody>
                          <tr><td className="border p-1">Row Cell</td><td className="border p-1">Row Cell</td></tr>
                          <tr><td className="border p-1">Row Cell</td><td className="border p-1">Row Cell</td></tr>
                        </tbody>
                      </table>
                    ) : (
                      <div className="w-full h-full border border-dashed border-slate-300" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Speaker notes */}
          {showNotes && (
            <div className="h-32 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Speaker Notes</span>
              </div>
              <textarea
                value={activeSlideData.notes || ''}
                onChange={(e) => handleSlideUpdate('notes', e.target.value)}
                placeholder="Add private presenter notes for this slide..."
                className="w-full h-16 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
