import React from 'react';
import { 
  Paintbrush, 
  Eraser, 
  Trash2, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Square, 
  Circle, 
  Minus, 
  ArrowUpRight, 
  Type, 
  Hand,
  PenTool
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Whiteboard({
  canvasRef,
  startDrawing,
  draw,
  stopDrawing,
  myColor,
  setMyColor,
  handleClearBoard
}) {
  const [activeTool, setActiveTool] = React.useState('pen'); // 'pen', 'marker', 'eraser', 'rect', 'circle', 'line', 'arrow', 'text', 'pan'
  const [brushSize, setBrushSize] = React.useState(3);

  const colors = [
    '#000000', // Black
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
    '#ec4899', // Pink
  ];

  const selectTool = (tool) => {
    setActiveTool(tool);
    if (tool === 'eraser') {
      setMyColor('#ffffff'); // Erase with white
      setBrushSize(16);
      toast('Eraser active', { icon: '🧹' });
    } else if (tool === 'marker') {
      setMyColor(myColor === '#ffffff' ? '#3b82f6' : myColor);
      setBrushSize(8);
      toast('Marker active', { icon: '🖍️' });
    } else {
      setMyColor(myColor === '#ffffff' ? '#3b82f6' : myColor);
      setBrushSize(3);
      toast(`${tool.charAt(0).toUpperCase() + tool.slice(1)} active`, { icon: '✏️' });
    }
  };

  const selectColor = (color) => {
    setMyColor(color);
    if (activeTool === 'eraser') {
      setActiveTool('pen');
      setBrushSize(3);
    }
    toast('Color updated', { icon: '🎨' });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden h-full relative select-none">
      {/* Top Toolbar */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-500 shrink-0">
            <Paintbrush className="w-4.5 h-4.5" />
          </div>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Brainstorm Board</span>
        </div>

        {/* Action Buttons: Undo, Redo, Clear */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => toast('Undo (local only)', { icon: '↩️' })}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => toast('Redo (local only)', { icon: '↪️' })}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1"></div>
          <button 
            onClick={handleClearBoard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer border border-rose-500/20"
            title="Clear Board"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Floating Drawing Tools Panel */}
      <div className="absolute left-6 top-20 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-xl flex flex-col gap-1.5 z-20 backdrop-blur-md transition-colors">
        {[
          { id: 'pen', icon: PenTool, label: 'Pen' },
          { id: 'marker', icon: Paintbrush, label: 'Marker' },
          { id: 'eraser', icon: Eraser, label: 'Eraser' },
          { id: 'rect', icon: Square, label: 'Rectangle' },
          { id: 'circle', icon: Circle, label: 'Circle' },
          { id: 'line', icon: Minus, label: 'Line' },
          { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
          { id: 'text', icon: Type, label: 'Text' },
          { id: 'pan', icon: Hand, label: 'Pan' },
        ].map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => selectTool(tool.id)}
              className={`p-2 rounded-xl transition-all relative group cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title={tool.label}
            >
              <tool.icon className="w-4.5 h-4.5" />
              <span className="absolute left-14 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-30 shadow-md">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating Color & Size Picker */}
      <div className="absolute right-6 top-20 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xl flex flex-col gap-3.5 z-20 backdrop-blur-md transition-colors">
        {/* Colors Grid */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Color</span>
          <div className="grid grid-cols-2 gap-1.5">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => selectColor(color)}
                style={{ backgroundColor: color }}
                className={`w-5 h-5 rounded-full border border-white dark:border-slate-950 shadow-sm cursor-pointer transition-transform hover:scale-110 relative ${
                  myColor === color ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''
                }`}
              />
            ))}
          </div>
        </div>

        {/* Brush Size Slider */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Size</span>
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-12 accent-indigo-600 cursor-pointer h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
          />
          <span className="text-[10px] font-mono text-center text-slate-400">{brushSize}px</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden flex items-center justify-center relative bg-white dark:bg-slate-950 transition-colors">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          className="cursor-crosshair shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 max-w-full max-h-full transition-colors duration-300"
        />

        {/* Floating Zoom & Pan Controls (Bottom Center) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full shadow-xl flex items-center gap-3.5 z-20 backdrop-blur-md transition-colors">
          <button className="text-slate-500 hover:text-indigo-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">100%</span>
          <button className="text-slate-500 hover:text-indigo-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
