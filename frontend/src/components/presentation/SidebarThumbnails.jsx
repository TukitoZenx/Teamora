import { Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react'

export default function SidebarThumbnails({
  slides,
  activeSlide,
  setActiveSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onToggleVisibility,
  onDragStart,
  onDragOver,
  onDrop,
  theme
}) {
  return (
    <div className="w-48 xl:w-56 bg-card border-r border-border flex flex-col shrink-0 h-full">
      <div className="p-3 border-b border-border flex items-center justify-between shadow-sm z-10">
        <h2 className="text-xs font-bold text-text uppercase tracking-wider">Slides</h2>
        <button
          onClick={onAddSlide}
          className="p-1 hover:bg-primary hover:text-white rounded text-primary transition-colors cursor-pointer shadow-sm"
          title="New Slide"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {slides.length === 0 && (
          <div className="text-center text-muted text-xs p-4 border border-dashed border-border rounded">
            No slides yet.
          </div>
        )}
        {slides.map((s, i) => {
          const isActive = activeSlide === i
          const isHidden = s?.hidden

          return (
            <div
              key={i}
              draggable
              onDragStart={(e) => onDragStart(e, i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={(e) => onDrop(e, i)}
              className="relative group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold ${isActive ? 'text-primary' : 'text-muted'}`}>
                  {i + 1}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(i) }} className="p-0.5 text-muted hover:text-primary transition-colors" title={isHidden ? "Show" : "Hide"}>
                    {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDuplicateSlide(i) }} className="p-0.5 text-muted hover:text-primary transition-colors" title="Duplicate">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteSlide(i) }} className="p-0.5 text-muted hover:text-red-500 transition-colors" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div
                onClick={() => setActiveSlide(i)}
                className={`relative aspect-[16/9] w-full rounded-md border-2 overflow-hidden transition-all duration-200 ${
                  isActive ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-border/60 hover:border-border hover:shadow-sm'
                } ${isHidden ? 'opacity-40 grayscale' : 'opacity-100'}`}
              >
                <div className={`w-full h-full bg-gradient-to-br ${theme.gradient} flex flex-col items-center justify-center p-1 pointer-events-none`}>
                   <div className="text-[6px] font-bold text-slate-800 dark:text-slate-200 truncate w-full text-center px-1">
                     {s?.title || 'Untitled'}
                   </div>
                   <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${theme.accent}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
