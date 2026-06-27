import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Download,
  StickyNote,
  Zap,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Whiteboard({
  canvasRef,
  myColor,
  setMyColor,
  whiteboardTool,
  setWhiteboardTool,
  whiteboardSize,
  setWhiteboardSize,
  whiteboardCursors = {},
  socket,
  roomId,
  userName
}) {
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Board elements (sticky notes, shapes, text blocks)
  const [elements, setElements] = useState([]);
  // Undo/Redo queues
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Freehand drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [laserLines, setLaserLines] = useState([]); // laser points that fade

  const containerRef = useRef(null);

  const colors = [
    '#000000', '#ef4444', '#3b82f6', '#10b981', 
    '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff',
  ];

  // Load and sync board items
  useEffect(() => {
    socket.on('receive-clear-board', () => {
      setElements([]);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      }
      toast.error('Board was cleared by a collaborator');
    });

    socket.on('receive-draw-line', ({ startX, startY, endX, endY, color, size, isLaser }) => {
      if (isLaser) {
        // Laser line visual effect
        drawLaserLine(startX, startY, endX, endY, color, size);
      } else {
        drawStrokeOnCanvas(startX, startY, endX, endY, color, size);
      }
    });

    socket.on('receive-whiteboard-elements', (elementsList) => {
      setElements(elementsList);
    });

    return () => {
      socket.off('receive-clear-board');
      socket.off('receive-draw-line');
      socket.off('receive-whiteboard-elements');
    };
  }, [socket, canvasRef]);

  const drawStrokeOnCanvas = (startX, startY, endX, endY, color, size) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const isEraser = color === 'eraser';
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size || 16;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = size || 3;
    }
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  const drawLaserLine = (startX, startY, endX, endY, color, size) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#f43f5e'; // red laser glow
    ctx.lineWidth = size || 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Fade laser stroke away after 1 second
    setTimeout(() => {
      redrawCanvasFreehand();
    }, 1000);
  };

  const redrawCanvasFreehand = () => {
    // Canvas only has laser and temporary strokes since elements are HTML layer
    // For standard whiteboard strokes, we can clear and redraw if we kept a log, or we keep it canvas-native
  };

  // Canvas interaction
  const handleMouseDown = (e) => {
    if (whiteboardTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (1200 / rect.width);
    const y = (e.clientY - rect.top) * (800 / rect.height);

    if (whiteboardTool === 'sticky') {
      // Create Sticky Note
      const newSticky = {
        id: 'sticky-' + Math.random().toString(36).substring(7),
        type: 'sticky',
        x: x - 60,
        y: y - 60,
        width: 120,
        height: 120,
        color: myColor === '#000000' || myColor === 'eraser' ? '#f59e0b' : myColor,
        text: 'Idea text...'
      };
      const updated = [...elements, newSticky];
      setElements(updated);
      setUndoStack(prev => [...prev, elements]);
      socket.emit('update-whiteboard-elements', { roomId, elements: updated });
      toast.success('Sticky Note created!');
      return;
    }

    if (whiteboardTool === 'rect' || whiteboardTool === 'circle' || whiteboardTool === 'text') {
      const newElem = {
        id: 'elem-' + Math.random().toString(36).substring(7),
        type: whiteboardTool,
        x: x - 50,
        y: y - 50,
        width: whiteboardTool === 'text' ? 180 : 100,
        height: whiteboardTool === 'text' ? 40 : 100,
        color: myColor === 'eraser' ? '#3b82f6' : myColor,
        text: whiteboardTool === 'text' ? 'Double click to edit text' : ''
      };
      const updated = [...elements, newElem];
      setElements(updated);
      setUndoStack(prev => [...prev, elements]);
      socket.emit('update-whiteboard-elements', { roomId, elements: updated });
      toast.success(`Created ${whiteboardTool}`);
      return;
    }

    // Freehand Pen/Marker/Laser
    setIsDrawing(true);
    setLastPos({ x, y });
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (1200 / rect.width);
    const y = (e.clientY - rect.top) * (800 / rect.height);

    const isLaser = whiteboardTool === 'laser';
    const drawColor = whiteboardTool === 'eraser' ? 'eraser' : myColor;

    drawStrokeOnCanvas(lastPos.x, lastPos.y, x, y, drawColor, whiteboardSize);
    socket.emit('draw-line', { roomId, startX: lastPos.x, startY: lastPos.y, endX: x, endY: y, color: drawColor, size: whiteboardSize, isLaser });

    setLastPos({ x, y });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
  };

  const handleClear = () => {
    setElements([]);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
    socket.emit('clear-board', roomId);
    toast.success('Brainstorm board cleared!');
  };

  // Undo / Redo Actions
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, elements]);
    setElements(previous);
    setUndoStack(prev => prev.slice(0, -1));
    socket.emit('update-whiteboard-elements', { roomId, elements: previous });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, elements]);
    setElements(next);
    setRedoStack(prev => prev.slice(0, -1));
    socket.emit('update-whiteboard-elements', { roomId, elements: next });
  };

  // Element text editing
  const handleElementTextChange = (elemId, newText) => {
    const updated = elements.map((el) => {
      if (el.id === elemId) return { ...el, text: newText };
      return el;
    });
    setElements(updated);
    socket.emit('update-whiteboard-elements', { roomId, elements: updated });
  };

  const handleDragElement = (e, elemId) => {
    // Simple drag delta updates
    // In a fully loaded UI we track clientOffset, here we simulate basic card moving
  };

  // Templates
  const applyTemplate = (templateName) => {
    let templateElements = [];
    if (templateName === 'retro') {
      templateElements = [
        { id: 'ret-1', type: 'sticky', x: 200, y: 250, width: 130, height: 130, color: '#10b981', text: 'What went well?' },
        { id: 'ret-2', type: 'sticky', x: 500, y: 250, width: 130, height: 130, color: '#ef4444', text: 'What went wrong?' },
        { id: 'ret-3', type: 'sticky', x: 800, y: 250, width: 130, height: 130, color: '#f59e0b', text: 'Action Items' }
      ];
    } else if (templateName === 'brainstorm') {
      templateElements = [
        { id: 'bs-1', type: 'sticky', x: 300, y: 200, width: 120, height: 120, color: '#3b82f6', text: 'Core Goal' },
        { id: 'bs-2', type: 'sticky', x: 150, y: 400, width: 120, height: 120, color: '#8b5cf6', text: 'Idea A' },
        { id: 'bs-3', type: 'sticky', x: 450, y: 400, width: 120, height: 120, color: '#ec4899', text: 'Idea B' }
      ];
    } else if (templateName === 'kanban') {
      templateElements = [
        { id: 'kb-1', type: 'sticky', x: 150, y: 150, width: 110, height: 110, color: '#f59e0b', text: 'To Do Item' },
        { id: 'kb-2', type: 'sticky', x: 450, y: 150, width: 110, height: 110, color: '#3b82f6', text: 'In Progress Item' },
        { id: 'kb-3', type: 'sticky', x: 750, y: 150, width: 110, height: 110, color: '#10b981', text: 'Done Item' }
      ];
    }

    const updated = [...elements, ...templateElements];
    setElements(updated);
    socket.emit('update-whiteboard-elements', { roomId, elements: updated });
    toast.success(`Template "${templateName}" applied!`);
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden h-full relative select-none"
    >
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
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-40"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-40"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5"></div>

          {/* Templates Menu */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Templates</span>
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 min-w-[150px] hidden group-hover:block z-50">
              <button onClick={() => applyTemplate('retro')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Retro Board</button>
              <button onClick={() => applyTemplate('brainstorm')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Brainstorm Grid</button>
              <button onClick={() => applyTemplate('kanban')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Kanban Lane</button>
            </div>
          </div>

          <button 
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-507 hover:bg-rose-600 hover:text-white text-rose-500 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-rose-500/20"
            title="Clear Board"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Floating Drawing Tools Panel */}
      <div className="absolute left-4 top-16 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-xl flex flex-col gap-1.5 z-20 backdrop-blur-md transition-colors mt-2">
        {[
          { id: 'pen', icon: PenTool, label: 'Pen' },
          { id: 'marker', icon: Paintbrush, label: 'Marker' },
          { id: 'eraser', icon: Eraser, label: 'Eraser' },
          { id: 'laser', icon: Zap, label: 'Laser Pointer' },
          { id: 'sticky', icon: StickyNote, label: 'Sticky Note' },
          { id: 'rect', icon: Square, label: 'Rectangle' },
          { id: 'circle', icon: Circle, label: 'Circle' },
          { id: 'text', icon: Type, label: 'Text Block' },
          { id: 'pan', icon: Hand, label: 'Pan' },
        ].map((tool) => {
          const isActive = whiteboardTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setWhiteboardTool(tool.id);
                if (tool.id === 'eraser') {
                  setWhiteboardSize(18);
                } else if (tool.id === 'marker') {
                  setWhiteboardSize(10);
                } else if (tool.id === 'laser') {
                  setWhiteboardSize(4);
                } else {
                  setWhiteboardSize(3);
                }
              }}
              className={`p-2 rounded-xl transition-all relative group cursor-pointer ${
                isActive 
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
              <span className="absolute left-12 bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-30 shadow-md">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating Color & Size Picker */}
      <div className="absolute right-4 top-16 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xl flex flex-col gap-3.5 z-20 backdrop-blur-md transition-colors mt-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Color</span>
          <div className="grid grid-cols-2 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setMyColor(color)}
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

        {/* Bounded Canvas Container */}
        <div 
          className="relative border border-slate-200/50 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden" 
          style={{ 
            transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`, 
            width: 1200, 
            height: 800, 
            minWidth: 1200, 
            minHeight: 800,
            transition: isPanning ? 'none' : 'transform 0.15s ease-out'
          }}
        >
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-crosshair w-full h-full"
          />

          {/* Render Sticky Notes & Interactive Elements Layer */}
          {elements.map((elem) => {
            const isSticky = elem.type === 'sticky';
            const isText = elem.type === 'text';
            
            return (
              <div
                key={elem.id}
                style={{
                  position: 'absolute',
                  left: elem.x,
                  top: elem.y,
                  width: elem.width,
                  height: elem.height,
                  backgroundColor: isSticky ? elem.color : 'transparent',
                  color: isSticky ? '#000' : 'inherit',
                  borderColor: isSticky ? 'transparent' : elem.color,
                  borderWidth: isSticky || isText ? '0' : '2px',
                  borderRadius: elem.type === 'circle' ? '50%' : isSticky ? '4px' : '0'
                }}
                className={`flex items-center justify-center p-3 select-text shadow-sm ${
                  isSticky ? 'shadow-md shadow-black/10 text-center font-medium font-sans' : ''
                }`}
              >
                {(isSticky || isText) ? (
                  <textarea
                    value={elem.text}
                    onChange={(e) => handleElementTextChange(elem.id, e.target.value)}
                    className="w-full h-full bg-transparent border-none outline-none resize-none text-xs text-center font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 no-scrollbar focus:ring-0"
                    placeholder="Write..."
                  />
                ) : (
                  /* Renders shape outlines */
                  <div className="w-full h-full border-dashed" style={{ borderColor: elem.color }} />
                )}
              </div>
            );
          })}

          {/* Floating Cursors */}
          {Object.entries(whiteboardCursors).map(([id, cursor]) => (
            <div 
              key={id} 
              className="absolute pointer-events-none z-30" 
              style={{ left: cursor.x, top: cursor.y }}
            >
              <svg 
                className="w-5 h-5 filter drop-shadow-sm select-none" 
                viewBox="0 0 24 24" 
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
              >
                <path d="M5.653 1.34A1 1 0 0 0 4 2.185v18.63a1 1 0 0 0 1.653.765l6.58-5.639h7.452a1 1 0 0 0 .765-1.653L5.653 1.34Z" />
              </svg>
              <div 
                className="absolute left-3 top-3 text-[10px] text-white px-2 py-0.5 rounded-full font-bold shadow-md whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.user}
              </div>
            </div>
          ))}
        </div>

        {/* Zoom & Navigation (Bottom Center) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full shadow-xl flex items-center gap-3.5 z-20 backdrop-blur-md transition-colors">
          <button onClick={() => setZoom(prev => Math.max(prev - 25, 50))} className="text-slate-500 hover:text-indigo-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-10 text-center">{zoom}%</span>
          <button onClick={() => setZoom(prev => Math.min(prev + 25, 200))} className="text-slate-500 hover:text-indigo-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
