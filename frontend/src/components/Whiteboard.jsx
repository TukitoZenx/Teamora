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
  PenTool,
  Grid3X3,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Whiteboard({
  canvasRef,
  startDrawing,
  draw,
  stopDrawing,
  myColor,
  setMyColor,
  handleClearBoard,
  whiteboardTool,
  setWhiteboardTool,
  whiteboardSize,
  setWhiteboardSize,
  whiteboardCursors = {}
}) {
  const [showGrid, setShowGrid] = React.useState(false);
  const [zoom, setZoom] = React.useState(100);

  const colors = [
    '#000000', '#ef4444', '#3b82f6', '#10b981', 
    '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff',
  ];

  const selectTool = (tool) => {
    setWhiteboardTool(tool);
    if (tool === 'eraser') {
      setWhiteboardSize(16);
      toast('Eraser active', { icon: '🧹' });
    } else if (tool === 'marker') {
      setMyColor(myColor === '#ffffff' || myColor === 'eraser' ? '#3b82f6' : myColor);
      setWhiteboardSize(8);
      toast('Marker active', { icon: '🖍️' });
    } else {
      setMyColor(myColor === '#ffffff' || myColor === 'eraser' ? '#3b82f6' : myColor);
      setWhiteboardSize(3);
    }
  };

  const selectColor = (color) => {
    setMyColor(color);
    if (whiteboardTool === 'eraser') {
      setWhiteboardTool('pen');
      setWhiteboardSize(3);
    }
  };

  const exportAsPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    toast.success('Whiteboard exported as PNG!');
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden h-full relative select-none">
      {/* Top Toolbar */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-500 shrink-0">
            <Paintbrush className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Whiteboard</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              showGrid 
                ? 'bg-indigo-500/10 text-indigo-500' 
                : 'text-slate-500 hover:text-indigo-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => toast('Undo (local only)', { icon: '↩️' })}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => toast('Redo (local only)', { icon: '↪️' })}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5"></div>
          <button 
            onClick={exportAsPNG}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
            title="Export as PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
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
      <div className="absolute left-4 top-16 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-xl flex flex-col gap-1 z-20 backdrop-blur-md transition-colors mt-2">
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
          const isActive = whiteboardTool === tool.id;
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
              <tool.icon className="w-4 h-4" />
              <span className="absolute left-12 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-30 shadow-md">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating Color & Size Picker */}
      <div className="absolute right-4 top-16 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xl flex flex-col gap-3 z-20 backdrop-blur-md transition-colors mt-2">
        {/* Colors */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Color</span>
          <div className="grid grid-cols-2 gap-1.5">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => selectColor(color)}
                style={{ backgroundColor: color }}
                className={`w-5 h-5 rounded-full border cursor-pointer transition-transform hover:scale-110 relative ${
                  color === '#ffffff' ? 'border-slate-300 dark:border-slate-600' : 'border-white dark:border-slate-950'
                } ${
                  myColor === color ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''
                }`}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Size</span>
          <input 
            type="range" 
            min="1" 
            max="40" 
            value={whiteboardSize}
            onChange={(e) => setWhiteboardSize(parseInt(e.target.value))}
            className="w-12 accent-indigo-600 cursor-pointer h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
          />
          <span className="text-[10px] font-mono text-center text-slate-400">{whiteboardSize}px</span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden flex items-center justify-center relative bg-white dark:bg-slate-950 transition-colors">
        {/* Grid Overlay */}
        {showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none z-10 opacity-20"
            style={{
              backgroundImage: 'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />
        )}

        <div className="relative border border-slate-200/50 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden" style={{ transform: `scale(${zoom / 100})`, width: 1200, height: 800, minWidth: 1200, minHeight: 800 }}>
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            className="cursor-crosshair w-full h-full"
          />

          {/* Floating Live Cursors layer */}
          {Object.entries(whiteboardCursors).map(([id, cursor]) => (
            <div 
              key={id} 
              className="absolute pointer-events-none transition-all duration-75 ease-out z-30" 
              style={{ left: cursor.x, top: cursor.y }}
            >
              {/* Pointer Icon */}
              <svg 
                className="w-5 h-5 filter drop-shadow-sm select-none" 
                viewBox="0 0 24 24" 
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
              >
                <path d="M5.653 1.34A1 1 0 0 0 4 2.185v18.63a1 1 0 0 0 1.653.765l6.58-5.639h7.452a1 1 0 0 0 .765-1.653L5.653 1.34Z" />
              </svg>
              {/* User Name Badge */}
              <div 
                className="absolute left-3 top-3 text-[10px] text-white px-2 py-0.5 rounded-full font-bold shadow-md whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.user}
              </div>
            </div>
          ))}
        </div>

        {/* Floating Zoom Controls (Bottom Center) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full shadow-xl flex items-center gap-3 z-20 backdrop-blur-md transition-colors">
          <button onClick={handleZoomOut} className="text-slate-500 hover:text-indigo-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-10 text-center">{zoom}%</span>
          <button onClick={handleZoomIn} className="text-slate-500 hover:text-indigo-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
