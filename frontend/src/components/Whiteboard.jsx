import React, { useState, useEffect, useRef } from 'react';
import { ensureArray } from '../utils/arrayUtils';
import { 
  Paintbrush, Eraser, Trash2, Undo2, Redo2, ZoomIn, ZoomOut, 
  Square, Circle, Minus, ArrowUpRight, Type, Hand, PenTool, 
  Grid3X3, Download, StickyNote, Zap, Sparkles, LayoutGrid,
  Lock, Unlock, Copy, ArrowUp, ArrowDown, Image as ImageIcon, Triangle
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
  userName,
  activeFileId,
  filesList = []
}) {
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const [elements, setElements] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Freehand drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [brushOpacity, setBrushOpacity] = useState(1.0);

  // Selection states
  const [selectedElementId, setSelectedElementId] = useState(null);

  const containerRef = useRef(null);
  const elementsRef = useRef(elements);

  // Load elements from active file content
  useEffect(() => {
    if (activeFileId && filesList && filesList.length > 0) {
      const file = filesList.find(f => f.id === activeFileId);
      if (file && file.content) {
        if (Array.isArray(file.content)) {
          setElements(file.content);
        } else {
          console.warn('Warning: loaded whiteboard content is not an array:', file.content);
          setElements([]);
        }
      } else {
        setElements([]);
      }
    }
  }, [activeFileId, filesList]);

  // Sync elements changes to the active file content
  useEffect(() => {
    if (activeFileId && Array.isArray(elements) && elements.length > 0) {
      const timeout = setTimeout(() => {
        socket.emit('file-content-update', { roomId, fileId: activeFileId, content: elements });
      }, 500); // Throttled updates to reduce socket traffic
      return () => clearTimeout(timeout);
    }
  }, [elements, activeFileId, roomId, socket]);

  useEffect(() => {
    elementsRef.current = Array.isArray(elements) ? elements : [];
  }, [elements]);

  const colors = [
    '#000000', '#ef4444', '#3b82f6', '#10b981', 
    '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff',
  ];

  // Sync elements with database / socket cache
  useEffect(() => {
    socket.on('receive-clear-board', () => {
      setElements([]);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      }
      toast.error('Board was cleared by a collaborator');
    });

    socket.on('receive-draw-line', ({ startX, startY, endX, endY, color, size, isLaser, opacity }) => {
      drawStrokeOnCanvas(startX, startY, endX, endY, color, size, opacity);
    });

    socket.on('receive-whiteboard-elements', (elementsList) => {
      if (Array.isArray(elementsList)) {
        setElements(elementsList);
      } else {
        console.warn('Warning: received whiteboard elements is not an array:', elementsList);
        setElements([]);
      }
    });

    return () => {
      socket.off('receive-clear-board');
      socket.off('receive-draw-line');
      socket.off('receive-whiteboard-elements');
    };
  }, [socket, canvasRef]);

  const drawStrokeOnCanvas = (startX, startY, endX, endY, color, size, opacity = 1.0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const isEraser = color === 'eraser';
    
    ctx.save();
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size || 16;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = size || 3;
      ctx.globalAlpha = opacity;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Adjust mouse coordinate to represent virtual 3000x2000 canvas matching zoom/pan
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const x = rawX * (canvas.width / rect.width);
    const y = rawY * (canvas.height / rect.height);

    if (whiteboardTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (whiteboardTool === 'select') {
      // Clear selection when clicking canvas background
      setSelectedElementId(null);
      return;
    }

    if (whiteboardTool === 'sticky') {
      const newSticky = {
        id: 'sticky-' + Math.random().toString(36).substring(7),
        type: 'sticky',
        x: x - 60,
        y: y - 60,
        width: 130,
        height: 130,
        color: myColor === '#000000' || myColor === 'eraser' ? '#fbf3ab' : `${myColor}30`,
        borderColor: myColor === '#000000' || myColor === 'eraser' ? '#f59e0b' : myColor,
        text: 'New Sticky Note',
        locked: false
      };
      saveElementsState([...(Array.isArray(elements) ? elements : []), newSticky]);
      setWhiteboardTool('select');
      setSelectedElementId(newSticky.id);
      return;
    }

    if (['rect', 'circle', 'triangle', 'arrow', 'line', 'text', 'image'].includes(whiteboardTool)) {
      let textVal = '';
      let imgVal = '';
      if (whiteboardTool === 'text') {
        textVal = 'Type text here...';
      } else if (whiteboardTool === 'image') {
        imgVal = prompt('Enter Image URL:', 'https://picsum.photos/300/200');
        if (!imgVal) return;
      }

      const newElem = {
        id: 'elem-' + Math.random().toString(36).substring(7),
        type: whiteboardTool,
        x: x - 60,
        y: y - 60,
        width: whiteboardTool === 'text' ? 180 : 120,
        height: whiteboardTool === 'text' ? 50 : 120,
        color: myColor === 'eraser' ? '#3b82f6' : myColor,
        text: textVal,
        src: imgVal,
        locked: false
      };
      saveElementsState([...(Array.isArray(elements) ? elements : []), newElem]);
      setWhiteboardTool('select');
      setSelectedElementId(newElem.id);
      return;
    }

    // Drawing lines (Pen, Marker, Pencil, Highlighter)
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
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const isLaser = whiteboardTool === 'laser';
    const drawColor = whiteboardTool === 'eraser' ? 'eraser' : myColor;

    // Apply custom opacity per tool
    let activeOpacity = brushOpacity;
    if (whiteboardTool === 'highlighter') {
      activeOpacity = 0.35;
    } else if (whiteboardTool === 'pencil') {
      activeOpacity = 0.6;
    }

    drawStrokeOnCanvas(lastPos.x, lastPos.y, x, y, drawColor, whiteboardSize, activeOpacity);
    socket.emit('draw-line', { 
      roomId, 
      startX: lastPos.x, 
      startY: lastPos.y, 
      endX: x, 
      endY: y, 
      color: drawColor, 
      size: whiteboardSize, 
      isLaser,
      opacity: activeOpacity 
    });

    setLastPos({ x, y });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
  };

  const saveElementsState = (newElements) => {
    const verifiedNew = Array.isArray(newElements) ? newElements : [];
    const currentElements = Array.isArray(elements) ? elements : [];
    setUndoStack(prev => [...prev, currentElements]);
    setRedoStack([]);
    setElements(verifiedNew);
    socket.emit('update-whiteboard-elements', { roomId, elements: verifiedNew });
  };

  const handleClear = () => {
    setElements([]);
    setSelectedElementId(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
    socket.emit('clear-board', roomId);
    toast.success('Brainstorm board cleared!');
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const verifiedPrev = Array.isArray(previous) ? previous : [];
    const currentElements = Array.isArray(elements) ? elements : [];
    setRedoStack(prev => [...prev, currentElements]);
    setElements(verifiedPrev);
    setUndoStack(prev => prev.slice(0, -1));
    socket.emit('update-whiteboard-elements', { roomId, elements: verifiedPrev });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const verifiedNext = Array.isArray(next) ? next : [];
    const currentElements = Array.isArray(elements) ? elements : [];
    setUndoStack(prev => [...prev, currentElements]);
    setElements(verifiedNext);
    setRedoStack(prev => prev.slice(0, -1));
    socket.emit('update-whiteboard-elements', { roomId, elements: verifiedNext });
  };

  const handleElementTextChange = (elemId, newText) => {
    const safeElements = Array.isArray(elements) ? elements : [];
    const updated = safeElements.map((el) => el.id === elemId ? { ...el, text: newText } : el);
    setElements(updated);
    socket.emit('update-whiteboard-elements', { roomId, elements: updated });
  };

  // Element actions: lock, duplicate, layers
  const toggleLockElement = (elemId) => {
    const safeElements = Array.isArray(elements) ? elements : [];
    const updated = safeElements.map(el => el.id === elemId ? { ...el, locked: !el.locked } : el);
    saveElementsState(updated);
  };

  const duplicateElement = (elem) => {
    const newElem = {
      ...elem,
      id: 'elem-' + Math.random().toString(36).substring(7),
      x: elem.x + 20,
      y: elem.y + 20,
      locked: false
    };
    const safeElements = Array.isArray(elements) ? elements : [];
    saveElementsState([...safeElements, newElem]);
    setSelectedElementId(newElem.id);
  };

  const deleteElement = (elemId) => {
    const safeElements = Array.isArray(elements) ? elements : [];
    const updated = safeElements.filter(el => el.id !== elemId);
    saveElementsState(updated);
    setSelectedElementId(null);
  };

  const moveLayer = (elemId, direction) => {
    const safeElements = Array.isArray(elements) ? elements : [];
    const index = safeElements.findIndex(el => el.id === elemId);
    if (index === -1) return;
    const updated = [...safeElements];
    const [item] = updated.splice(index, 1);
    
    if (direction === 'front') {
      updated.push(item);
    } else {
      updated.unshift(item);
    }
    saveElementsState(updated);
  };

  const handleElementMouseDown = (e, elem) => {
    if (whiteboardTool !== 'select' || elem.locked) return;
    e.stopPropagation();
    setSelectedElementId(elem.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startElemX = elem.x;
    const startElemY = elem.y;

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / (zoom / 100);
      const dy = (moveEvent.clientY - startY) / (zoom / 100);
      setElements(prev => prev.map(el => el.id === elem.id ? { ...el, x: startElemX + dx, y: startElemY + dy } : el));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      socket.emit('update-whiteboard-elements', { roomId, elements: elementsRef.current });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeMouseDown = (e, elem) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = elem.width;
    const startH = elem.height;

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / (zoom / 100);
      const dy = (moveEvent.clientY - startY) / (zoom / 100);
      setElements(prev => prev.map(el => el.id === elem.id ? { 
        ...el, 
        width: Math.max(50, startW + dx), 
        height: Math.max(50, startH + dy) 
      } : el));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      socket.emit('update-whiteboard-elements', { roomId, elements: elementsRef.current });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const applyTemplate = (templateName) => {
    let templateElements = [];
    if (templateName === 'retro') {
      templateElements = [
        { id: 'ret-1', type: 'sticky', x: 200, y: 150, width: 180, height: 180, color: '#d1fae5', borderColor: '#10b981', text: 'What went well?' },
        { id: 'ret-2', type: 'sticky', x: 450, y: 150, width: 180, height: 180, color: '#fee2e2', borderColor: '#ef4444', text: 'What went wrong?' },
        { id: 'ret-3', type: 'sticky', x: 700, y: 150, width: 180, height: 180, color: '#fef3c7', borderColor: '#f59e0b', text: 'Action Items' }
      ];
    } else if (templateName === 'brainstorm') {
      templateElements = [
        { id: 'bs-1', type: 'sticky', x: 450, y: 80, width: 180, height: 180, color: '#e0e7ff', borderColor: '#3b82f6', text: 'Core Goal' },
        { id: 'bs-2', type: 'sticky', x: 200, y: 350, width: 160, height: 160, color: '#f5f3ff', borderColor: '#8b5cf6', text: 'Idea A' },
        { id: 'bs-3', type: 'sticky', x: 700, y: 350, width: 160, height: 160, color: '#fdf2f8', borderColor: '#ec4899', text: 'Idea B' }
      ];
    }
    const safeElements = Array.isArray(elements) ? elements : [];
    const updated = [...safeElements, ...templateElements];
    saveElementsState(updated);
    toast.success(`Template applied!`);
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

        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-all cursor-pointer ${showGrid ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500'}`}
            title="Toggle Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleUndo} 
            disabled={undoStack.length === 0} 
            className="p-2 text-slate-500 disabled:opacity-40"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={redoStack.length === 0} 
            className="p-2 text-slate-500 disabled:opacity-40"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Templates Menu */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Templates</span>
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 min-w-[150px] hidden group-hover:block z-50">
              <button onClick={() => applyTemplate('retro')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Retro Board</button>
              <button onClick={() => applyTemplate('brainstorm')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Brainstorm Grid</button>
            </div>
          </div>

          <button 
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-500 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-rose-500/20"
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
          { id: 'select', icon: Hand, label: 'Select' },
          { id: 'pen', icon: PenTool, label: 'Pen' },
          { id: 'marker', icon: Paintbrush, label: 'Marker' },
          { id: 'pencil', icon: Minus, label: 'Pencil' },
          { id: 'highlighter', icon: Sparkles, label: 'Highlighter' },
          { id: 'eraser', icon: Eraser, label: 'Eraser' },
          { id: 'sticky', icon: StickyNote, label: 'Sticky Note' },
          { id: 'rect', icon: Square, label: 'Rectangle' },
          { id: 'circle', icon: Circle, label: 'Circle' },
          { id: 'triangle', icon: Triangle, label: 'Triangle' },
          { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
          { id: 'line', icon: Minus, label: 'Line' },
          { id: 'text', icon: Type, label: 'Text Block' },
          { id: 'image', icon: ImageIcon, label: 'Image URL' },
          { id: 'pan', icon: Hand, label: 'Pan Screen' },
        ].map((tool) => {
          const isActive = whiteboardTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setWhiteboardTool(tool.id);
                if (tool.id === 'eraser') {
                  setWhiteboardSize(24);
                } else if (tool.id === 'marker') {
                  setWhiteboardSize(10);
                } else if (tool.id === 'highlighter') {
                  setWhiteboardSize(20);
                } else {
                  setWhiteboardSize(3);
                }
              }}
              className={`p-2 rounded-xl transition-all relative group cursor-pointer ${
                isActive 
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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

      {/* Floating Color & Size & Opacity Picker */}
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
                  color === '#ffffff' ? 'border-slate-300' : 'border-white'
                } ${myColor === color ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Size</span>
          <input 
            type="range" min="1" max="40" 
            value={whiteboardSize}
            onChange={(e) => setWhiteboardSize(parseInt(e.target.value))}
            className="w-12 accent-indigo-600 cursor-pointer h-1"
          />
          <span className="text-[9px] font-mono text-center text-slate-400">{whiteboardSize}px</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Opacity</span>
          <input 
            type="range" min="0.1" max="1" step="0.05"
            value={brushOpacity}
            onChange={(e) => setBrushOpacity(parseFloat(e.target.value))}
            className="w-12 accent-indigo-600 cursor-pointer h-1"
          />
          <span className="text-[9px] font-mono text-center text-slate-400">{Math.round(brushOpacity * 100)}%</span>
        </div>
      </div>

      {/* Infinite Canvas Container */}
      <div className="flex-1 overflow-hidden flex items-center justify-center relative bg-white dark:bg-slate-950 transition-colors">
        {showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none z-10 opacity-20"
            style={{
              backgroundImage: 'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              transform: `translate(${pan.x}px, ${pan.y}px)`
            }}
          />
        )}

        {/* Scaled Canvas Container (Huge 3000x2000 size for Infinite Canvas feel) */}
        <div 
          className="relative border border-slate-200/50 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden" 
          style={{ 
            transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`, 
            width: 3000, 
            height: 2000, 
            minWidth: 3000, 
            minHeight: 2000,
            transition: isPanning ? 'none' : 'transform 0.15s ease-out'
          }}
        >
          <canvas
            ref={canvasRef}
            width={3000}
            height={2000}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-crosshair w-full h-full absolute inset-0"
          />

          {/* Interactive Elements Layer */}
          {ensureArray(elements).map((elem) => {
            const isSelected = selectedElementId === elem.id;
            const isSticky = elem.type === 'sticky';
            const isText = elem.type === 'text';
            const isImage = elem.type === 'image';
            
            return (
              <div
                key={elem.id}
                onMouseDown={(e) => handleElementMouseDown(e, elem)}
                style={{
                  position: 'absolute',
                  left: elem.x,
                  top: elem.y,
                  width: elem.width,
                  height: elem.height,
                  backgroundColor: isSticky ? elem.color : 'transparent',
                  color: isSticky ? '#1e293b' : 'inherit',
                  borderColor: isSelected ? '#6366f1' : isSticky ? elem.borderColor : elem.color,
                  borderWidth: isSelected ? '2px' : isSticky || isText || isImage ? '1px' : '2px',
                  borderRadius: elem.type === 'circle' ? '50%' : isSticky ? '12px' : '4px',
                  cursor: elem.locked ? 'not-allowed' : 'move',
                  zIndex: isSelected ? 40 : 10
                }}
                className={`flex flex-col items-center justify-center p-2 group shadow-sm transition-all ${
                  isSticky ? 'shadow-md font-sans text-center' : ''
                }`}
              >
                {/* Drag Control Overlay for Selected Element */}
                {isSelected && !elem.locked && (
                  <div className="absolute -top-10 left-0 bg-slate-900 text-white rounded-lg flex items-center p-1.5 gap-1.5 shadow-xl pointer-events-auto">
                    <button onClick={(e) => { e.stopPropagation(); toggleLockElement(elem.id); }} className="hover:text-indigo-400 p-0.5"><Lock className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); duplicateElement(elem); }} className="hover:text-indigo-400 p-0.5"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(elem.id, 'front'); }} className="hover:text-indigo-400 p-0.5" title="Bring to Front"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayer(elem.id, 'back'); }} className="hover:text-indigo-400 p-0.5" title="Send to Back"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteElement(elem.id); }} className="hover:text-rose-400 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}

                {isSelected && elem.locked && (
                  <div className="absolute -top-10 left-0 bg-slate-900 text-white rounded-lg flex items-center p-1.5 gap-1 shadow-xl pointer-events-auto">
                    <button onClick={(e) => { e.stopPropagation(); toggleLockElement(elem.id); }} className="text-rose-400 hover:text-white p-0.5"><Unlock className="w-3.5 h-3.5" /></button>
                    <span className="text-[10px] px-1 font-bold">Locked</span>
                  </div>
                )}

                {/* Resize Handle */}
                {isSelected && !elem.locked && (
                  <div 
                    onMouseDown={(e) => handleResizeMouseDown(e, elem)}
                    className="absolute bottom-0 right-0 w-3 h-3 bg-indigo-600 rounded-bl cursor-se-resize z-50 border border-white"
                  />
                )}

                {(isSticky || isText) ? (
                  <textarea
                    value={elem.text}
                    disabled={elem.locked}
                    onChange={(e) => handleElementTextChange(elem.id, e.target.value)}
                    className="w-full h-full bg-transparent border-none outline-none resize-none text-xs text-center font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-0 no-scrollbar"
                    placeholder="Type..."
                  />
                ) : isImage ? (
                  <img src={elem.src} className="w-full h-full object-cover rounded pointer-events-none" alt="board-insert" />
                ) : elem.type === 'rect' ? (
                  <div className="w-full h-full rounded border-2 border-indigo-500 bg-indigo-500/10 pointer-events-none" />
                ) : elem.type === 'circle' ? (
                  <div className="w-full h-full rounded-full border-2 border-emerald-500 bg-emerald-500/10 pointer-events-none" />
                ) : elem.type === 'triangle' ? (
                  <div className="w-0 h-0 border-l-[40px] border-r-[40px] border-b-[80px] border-l-transparent border-r-transparent border-b-indigo-500/30 relative pointer-events-none">
                    <div className="absolute -bottom-[-2px] -left-[38px] w-0 h-0 border-l-[38px] border-r-[38px] border-b-[76px] border-l-transparent border-r-transparent border-b-indigo-600" />
                  </div>
                ) : elem.type === 'arrow' ? (
                  <div className="w-full h-2 bg-indigo-500 relative pointer-events-none">
                    <div className="absolute -right-1.5 -top-1 border-l-8 border-l-indigo-600 border-t-4 border-t-transparent border-b-4 border-b-transparent" />
                  </div>
                ) : (
                  <div className="w-full h-0.5 bg-slate-400 pointer-events-none" />
                )}
              </div>
            );
          })}

          {/* Interactive cursors */}
          {Object.entries(whiteboardCursors).map(([id, cursor]) => (
            <div 
              key={id} 
              className="absolute pointer-events-none z-30" 
              style={{ left: cursor.x, top: cursor.y }}
            >
              <svg className="w-5 h-5 filter drop-shadow-sm select-none" viewBox="0 0 24 24" fill={cursor.color} stroke="white" strokeWidth="1.5">
                <path d="M5.653 1.34A1 1 0 0 0 4 2.185v18.63a1 1 0 0 0 1.653.765l6.58-5.639h7.452a1 1 0 0 0 .765-1.653L5.653 1.34Z" />
              </svg>
              <div 
                className="absolute left-3 top-3 text-[10px] text-white px-2 py-0.5 rounded-full font-bold shadow-md"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.user}
              </div>
            </div>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full shadow-xl flex items-center gap-3.5 z-20 backdrop-blur-md">
          <button onClick={() => setZoom(prev => Math.max(prev - 25, 50))} className="text-slate-500 hover:text-indigo-500 p-1 cursor-pointer">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-10 text-center">{zoom}%</span>
          <button onClick={() => setZoom(prev => Math.min(prev + 25, 200))} className="text-slate-500 hover:text-indigo-500 p-1 cursor-pointer">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
