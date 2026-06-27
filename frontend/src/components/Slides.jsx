import React, { useState, useEffect } from 'react';
import { 
  Presentation, 
  Play, 
  Plus, 
  Copy, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  X,
  Palette,
  StickyNote,
  Tv,
  ArrowRight,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const SLIDE_THEMES = [
  { id: 'default', label: 'Clean', gradient: 'from-white to-white dark:from-slate-900 dark:to-slate-900', accent: 'from-amber-500 to-orange-500' },
  { id: 'ocean', label: 'Ocean', gradient: 'from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950', accent: 'from-blue-500 to-cyan-500' },
  { id: 'sunset', label: 'Sunset', gradient: 'from-rose-50 to-amber-50 dark:from-rose-950 dark:to-amber-950', accent: 'from-rose-500 to-amber-500' },
  { id: 'forest', label: 'Forest', gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950', accent: 'from-emerald-500 to-teal-500' },
  { id: 'purple', label: 'Cosmos', gradient: 'from-violet-50 to-indigo-50 dark:from-violet-950 dark:to-indigo-950', accent: 'from-violet-500 to-indigo-500' },
];

export default function Slides({
  slides,
  activeSlide,
  setActiveSlide,
  isPresenting,
  setIsPresenting,
  addSlide,
  handleSlideUpdate,
  roomId,
  socket,
  activeUsers = [],
  setSlides
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false); // presenter split screen

  const theme = SLIDE_THEMES.find(t => t.id === selectedTheme) || SLIDE_THEMES[0];

  // Keyboard navigation for presentation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPresenting) {
        if (e.key === 'Escape') {
          setIsPresenting(false);
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
  }, [isPresenting, setIsPresenting, activeSlide, slides.length, roomId, socket, setActiveSlide]);

  const handleDuplicateSlide = () => {
    const slideToDuplicate = slides[activeSlide];
    if (!slideToDuplicate) return;
    const newSlides = [...slides];
    newSlides.splice(activeSlide + 1, 0, { 
      title: slideToDuplicate.title, 
      content: slideToDuplicate.content, 
      notes: slideToDuplicate.notes || '' 
    });
    setSlides(newSlides);
    setActiveSlide(activeSlide + 1);
    socket.emit('update-slides-list', { roomId, slides: newSlides });
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
    socket.emit('update-slides-list', { roomId, slides: newSlides });
    socket.emit('change-slide', { roomId, slideIndex: newActive });
    toast.success('Slide deleted');
  };

  // PPTX Exporter (download text outline)
  const handleExportDeckOutline = () => {
    try {
      let outlineText = `PRESENTATION OUTLINE: ${roomId.toUpperCase()}\n`;
      slides.forEach((slide, idx) => {
        outlineText += `\n--- SLIDE ${idx + 1} ---\nTitle: ${slide.title || 'Untitled'}\nBody: ${slide.content || ''}\nNotes: ${slide.notes || ''}\n`;
      });
      const element = document.createElement('a');
      const file = new Blob([outlineText], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = 'presentation-deck-outline.txt';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success('Presentation outline exported!');
    } catch {
      toast.error('Outline export failed.');
    }
  };

  // Find users currently looking at slide index `slideIdx`
  const getUsersOnSlide = (slideIdx) => {
    return activeUsers.filter(u => u.activeApp === 'slides' && u.activeSlide === slideIdx);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden h-full relative">
      {/* Fullscreen Presentation Mode */}
      {isPresenting && (
        <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col items-center justify-center">
          <button 
            onClick={() => {
              setIsPresenting(false);
              setPresenterMode(false);
            }} 
            className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer z-50"
            title="Exit Slideshow (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Dual Screen: Presenter Mode controls */}
          {presenterMode ? (
            <div className="w-[90vw] h-[85vh] flex gap-6">
              {/* Left: Current Slide preview */}
              <div className="flex-1 bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Live Slide View</span>
                <div className={`aspect-[16/9] w-full bg-gradient-to-br ${theme.gradient} rounded-xl p-8 flex flex-col justify-center text-center relative border border-white/5`}>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    {slides[activeSlide]?.title || 'Untitled Slide'}
                  </h1>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    {slides[activeSlide]?.content || ''}
                  </p>
                </div>
                <div className="text-xs text-white/50">Slide {activeSlide + 1} of {slides.length}</div>
              </div>

              {/* Right: Notes & Next Slide preview */}
              <div className="w-96 bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-3">Speaker Notes</span>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-h-[150px] text-xs text-slate-200 leading-relaxed overflow-y-auto">
                    {slides[activeSlide]?.notes || 'No notes added to this slide.'}
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
            /* Standard Fullscreen Deck view with Framer Motion slide-in transitions */
            <div className="relative w-[85vw] max-w-5xl aspect-[16/9] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  initial={{ opacity: 0, x: 80 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -80 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className={`w-full h-full bg-gradient-to-br ${theme.gradient} rounded-2xl p-12 md:p-20 shadow-2xl flex flex-col justify-center items-center text-center relative border border-white/5`}
                >
                  <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${theme.accent} rounded-t-2xl`} />
                  <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight select-none">
                    {slides[activeSlide]?.title || 'Untitled Slide'}
                  </h1>
                  <p className="text-lg md:text-2xl text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed select-none">
                    {slides[activeSlide]?.content || 'Slide body content goes here...'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Toggle Dual/Single Monitor screen view */}
          <div className="absolute bottom-8 flex items-center gap-4 bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 z-50">
            <button 
              onClick={() => {
                const prevIndex = Math.max(0, activeSlide - 1);
                setActiveSlide(prevIndex);
                socket.emit('change-slide', { roomId, slideIndex: prevIndex });
              }} 
              disabled={activeSlide === 0}
              className="p-2 bg-white/5 hover:bg-white/15 disabled:opacity-35 text-white rounded-full transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white select-none">
              {activeSlide + 1} / {slides.length}
            </span>
            <button 
              onClick={() => {
                const nextIndex = Math.min(slides.length - 1, activeSlide + 1);
                setActiveSlide(nextIndex);
                socket.emit('change-slide', { roomId, slideIndex: nextIndex });
              }} 
              disabled={activeSlide === slides.length - 1}
              className="p-2 bg-white/5 hover:bg-white/15 disabled:opacity-35 text-white rounded-full transition-all cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="w-px h-5 bg-white/10"></div>

            <button 
              onClick={() => setPresenterMode(!presenterMode)}
              className={`flex items-center gap-1 text-[10px] uppercase font-bold text-white px-2.5 py-1 rounded-md border ${
                presenterMode ? 'bg-indigo-600 border-indigo-500' : 'bg-transparent border-white/10 hover:bg-white/5'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Presenter Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Topbar */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 shrink-0">
            <Presentation className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Pitch Deck</span>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={addSlide}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer border border-slate-200/50 dark:border-slate-700/50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Slide</span>
          </button>
          <button 
            onClick={handleDuplicateSlide}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button 
            onClick={handleDeleteSlide}
            className="p-2 text-slate-500 hover:text-rose-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5"></div>
          
          {/* Theme Picker Toggle */}
          <div className="relative">
            <button 
              onClick={() => setShowThemePicker(!showThemePicker)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                showThemePicker ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500 hover:text-indigo-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Theme Color"
            >
              <Palette className="w-4 h-4" />
            </button>

            {showThemePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowThemePicker(false)} />
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-3 min-w-[200px]">
                  <span className="text-xs font-semibold text-slate-400 mb-2 block">Slide Theme</span>
                  <div className="space-y-1.5">
                    {SLIDE_THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTheme(t.id); setShowThemePicker(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          selectedTheme === t.id 
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
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

          {/* Speaker Notes Toggle */}
          <button 
            onClick={() => setShowNotes(!showNotes)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              showNotes ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500 hover:text-indigo-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Speaker Notes"
          >
            <StickyNote className="w-4 h-4" />
          </button>

          <button 
            onClick={handleExportDeckOutline}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Export Slide Outline"
          >
            <Download className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5"></div>
          
          <button 
            onClick={() => {
              setIsPresenting(true);
              toast('Slideshow active — Use ←→ or Space to navigate', { icon: '🎬' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-amber-500/10 cursor-pointer transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Present</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Slide Thumbnails */}
        <div className="w-52 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 transition-colors">
          <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
            {slides.map((s, i) => {
              const isActive = activeSlide === i;
              const usersHere = getUsersOnSlide(i);
              return (
                <div key={i} className="flex gap-2 items-start group relative">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 mt-2 w-4 text-right select-none">{i + 1}</span>
                  <button
                    onClick={() => {
                      setActiveSlide(i);
                      socket.emit('change-slide', { roomId, slideIndex: i });
                    }}
                    className={`flex-1 aspect-[16/9] bg-gradient-to-br ${theme.gradient} rounded-xl p-3 text-left border cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                      isActive 
                        ? 'border-amber-500 ring-2 ring-amber-500/20' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r ${theme.accent}`} />
                    <div className="text-[9px] font-bold text-slate-800 dark:text-slate-100 truncate w-full">{s.title || 'Untitled'}</div>
                    <div className="text-[7px] text-slate-400 dark:text-slate-500 line-clamp-2 mt-1 leading-snug">{s.content}</div>
                    
                    {/* Collaborative Users Badges */}
                    {usersHere.length > 0 && (
                      <div className="absolute bottom-1 right-1 flex -space-x-1.5 overflow-hidden z-10 p-0.5">
                        {usersHere.map((u, uIdx) => (
                          <img
                            key={uIdx}
                            className="inline-block h-4 w-4 rounded-full border bg-white object-cover"
                            src={u.imageUrl || 'https://www.gravatar.com/avatar/?d=mp'}
                            alt={u.user}
                            title={u.user}
                            style={{ borderColor: u.color || '#6366f1' }}
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

        {/* Right: Active Slide Editor + Notes */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 w-full h-full p-6 md:p-10 flex flex-col items-center justify-center no-scrollbar overflow-hidden">
            <div className={`w-full max-w-4xl aspect-[16/9] bg-gradient-to-br ${theme.gradient} border border-slate-200/60 dark:border-slate-800 shadow-2xl rounded-3xl p-10 md:p-14 flex flex-col justify-center transition-all relative`}>
              <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${theme.accent} rounded-t-3xl`} />
              
              <input
                type="text"
                value={slides[activeSlide]?.title || ''}
                onChange={(e) => handleSlideUpdate('title', e.target.value)}
                className="text-3xl md:text-4xl font-bold text-slate-950 dark:text-white border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800/80 focus:border-indigo-500 focus:outline-none py-2 text-center transition-all bg-transparent font-sans"
                placeholder="Click to add title"
              />
              
              <textarea
                value={slides[activeSlide]?.content || ''}
                onChange={(e) => handleSlideUpdate('content', e.target.value)}
                className="flex-1 text-base md:text-lg text-slate-500 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-800/80 focus:border-indigo-500 focus:outline-none rounded-xl p-4 mt-6 resize-none text-center bg-transparent transition-all leading-relaxed"
                placeholder="Click to add slide body content..."
              />
            </div>
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-3 select-none">
              Slide {activeSlide + 1} of {slides.length}
            </div>
          </div>

          {/* Speaker Notes Area */}
          {showNotes && (
            <div className="h-32 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Speaker Notes</span>
              </div>
              <textarea
                value={slides[activeSlide]?.notes || ''}
                onChange={(e) => handleSlideUpdate('notes', e.target.value)}
                placeholder="Add notes for this slide (only visible to presenter)..."
                className="w-full h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
