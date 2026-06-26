import React from 'react';
import { 
  Presentation, 
  Play, 
  Plus, 
  Copy, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Slides({
  slides,
  activeSlide,
  setActiveSlide,
  isPresenting,
  setIsPresenting,
  addSlide,
  handleSlideUpdate,
  roomId,
  socket
}) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Esc key logic
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPresenting) {
        setIsPresenting(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, setIsPresenting]);

  const handleDuplicateSlide = () => {
    // We can simulate duplicate by adding a slide with activeSlide's content
    const active = slides[activeSlide];
    toast('Slide duplicated (UI placeholder)', { icon: '📋' });
  };

  const handleDeleteSlide = () => {
    toast('Delete slide (UI placeholder)', { icon: '🗑️' });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden h-full relative">
      {/* Fullscreen Presentation Mode */}
      {isPresenting && (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center">
          <button 
            onClick={() => setIsPresenting(false)} 
            className="absolute top-6 right-6 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer flex items-center justify-center"
            title="Exit Slideshow (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-[85vw] max-w-5xl aspect-[16/9] bg-white dark:bg-slate-900 rounded-2xl p-12 md:p-20 shadow-2xl flex flex-col justify-center items-center text-center relative border border-slate-200/10 transition-colors">
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight select-none">
              {slides[activeSlide]?.title || 'Untitled Slide'}
            </h1>
            <p className="text-lg md:text-2xl text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed select-none">
              {slides[activeSlide]?.content || 'Slide body content goes here...'}
            </p>
          </div>

          <div className="absolute bottom-10 flex items-center gap-4 bg-white/10 dark:bg-slate-900/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10">
            <button 
              onClick={() => {
                const prevIndex = Math.max(0, activeSlide - 1);
                setActiveSlide(prevIndex);
                socket.emit('change-slide', { roomId, slideIndex: prevIndex });
              }} 
              disabled={activeSlide === 0}
              className="p-2 bg-white/5 hover:bg-white/15 disabled:opacity-35 text-white rounded-full transition-all shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white select-none">
              Slide {activeSlide + 1} of {slides.length}
            </span>
            <button 
              onClick={() => {
                const nextIndex = Math.min(slides.length - 1, activeSlide + 1);
                setActiveSlide(nextIndex);
                socket.emit('change-slide', { roomId, slideIndex: nextIndex });
              }} 
              disabled={activeSlide === slides.length - 1}
              className="p-2 bg-white/5 hover:bg-white/15 disabled:opacity-35 text-white rounded-full transition-all shrink-0 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Editor Topbar */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 shrink-0">
            <Presentation className="w-4.5 h-4.5" />
          </div>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Pitch Deck</span>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={addSlide}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer border border-slate-200/50 dark:border-slate-700/50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Slide</span>
          </button>
          <button 
            onClick={handleDuplicateSlide}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Duplicate Slide"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button 
            onClick={handleDeleteSlide}
            className="p-2 text-slate-500 hover:text-rose-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Delete Slide"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1"></div>
          
          <button 
            onClick={() => {
              setIsPresenting(true);
              toast('Slideshow active', { icon: '🎬' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-amber-500/10 cursor-pointer transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Present</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area (Side thumbnails + Main Editor Canvas) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Slide Thumbnails Panel */}
        <div className="w-56 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 transition-colors">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {slides.map((s, i) => {
              const isActive = activeSlide === i;
              return (
                <div key={i} className="flex gap-2 items-start group">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 mt-2 w-4 text-right select-none">{i + 1}</span>
                  <button
                    onClick={() => {
                      setActiveSlide(i);
                      socket.emit('change-slide', { roomId, slideIndex: i });
                    }}
                    className={`flex-1 aspect-[16/9] bg-slate-50 dark:bg-slate-950/40 rounded-xl p-3 text-left border cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                      isActive 
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/[0.02]' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[9px] font-bold text-slate-800 dark:text-slate-100 truncate w-full">{s.title || 'Untitled'}</div>
                    <div className="text-[7px] text-slate-400 dark:text-slate-500 line-clamp-2 mt-1 leading-snug">{s.content}</div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Slide Editor Canvas */}
        <div className="flex-1 w-full h-full p-8 md:p-12 flex flex-col items-center justify-center no-scrollbar overflow-hidden">
          <div className="w-full max-w-4xl aspect-[16/9] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 shadow-2xl rounded-3xl p-10 md:p-14 flex flex-col justify-center transition-all relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-3xl" />
            
            <input
              type="text"
              value={slides[activeSlide]?.title || ''}
              onChange={(e) => handleSlideUpdate('title', e.target.value)}
              className="text-3xl md:text-4xl font-bold text-slate-950 dark:text-white border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800/80 focus:border-indigo-500 focus:outline-none py-2 text-center transition-all"
              placeholder="Click to add title"
            />
            
            <textarea
              value={slides[activeSlide]?.content || ''}
              onChange={(e) => handleSlideUpdate('content', e.target.value)}
              className="flex-1 text-base md:text-lg text-slate-500 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-800/80 focus:border-indigo-500 focus:outline-none rounded-xl p-4 mt-6 resize-none text-center bg-transparent transition-all leading-relaxed"
              placeholder="Click to add slide body content..."
            />
          </div>
          <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-4 select-none">
            Slide {activeSlide + 1} of {slides.length}
          </div>
        </div>
      </div>
    </div>
  );
}
