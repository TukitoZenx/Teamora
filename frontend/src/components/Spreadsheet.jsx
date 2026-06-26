import React from 'react';
import { 
  TableProperties, 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Sparkles,
  RefreshCw,
  Copy,
  ClipboardPaste,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import toast from 'react-hot-toast';

// Basic formula evaluator
function evaluateFormula(formula, grid) {
  try {
    const upper = formula.toUpperCase().trim();
    
    // SUM(A1:B3) pattern
    const sumMatch = upper.match(/^=SUM\(([A-Z])(\d+):([A-Z])(\d+)\)$/);
    if (sumMatch) {
      const [, c1, r1, c2, r2] = sumMatch;
      let sum = 0;
      for (let r = parseInt(r1) - 1; r <= parseInt(r2) - 1; r++) {
        for (let c = c1.charCodeAt(0) - 65; c <= c2.charCodeAt(0) - 65; c++) {
          const val = parseFloat(grid[r]?.[c]);
          if (!isNaN(val)) sum += val;
        }
      }
      return sum;
    }

    // AVERAGE(A1:B3) pattern
    const avgMatch = upper.match(/^=AVERAGE\(([A-Z])(\d+):([A-Z])(\d+)\)$/);
    if (avgMatch) {
      const [, c1, r1, c2, r2] = avgMatch;
      let sum = 0, count = 0;
      for (let r = parseInt(r1) - 1; r <= parseInt(r2) - 1; r++) {
        for (let c = c1.charCodeAt(0) - 65; c <= c2.charCodeAt(0) - 65; c++) {
          const val = parseFloat(grid[r]?.[c]);
          if (!isNaN(val)) { sum += val; count++; }
        }
      }
      return count > 0 ? (sum / count).toFixed(2) : 0;
    }

    // COUNT(A1:B3) pattern
    const countMatch = upper.match(/^=COUNT\(([A-Z])(\d+):([A-Z])(\d+)\)$/);
    if (countMatch) {
      const [, c1, r1, c2, r2] = countMatch;
      let count = 0;
      for (let r = parseInt(r1) - 1; r <= parseInt(r2) - 1; r++) {
        for (let c = c1.charCodeAt(0) - 65; c <= c2.charCodeAt(0) - 65; c++) {
          const val = parseFloat(grid[r]?.[c]);
          if (!isNaN(val)) count++;
        }
      }
      return count;
    }

    // Simple cell reference: =A1
    const refMatch = upper.match(/^=([A-Z])(\d+)$/);
    if (refMatch) {
      const [, col, row] = refMatch;
      return grid[parseInt(row) - 1]?.[col.charCodeAt(0) - 65] || '';
    }

    return null; // Not a recognized formula
  } catch {
    return '#ERR';
  }
}

export default function Spreadsheet({
  grid,
  activeCell,
  setActiveCell,
  handleCellChange,
  spreadsheetCells = {}
}) {
  const [formulaValue, setFormulaValue] = React.useState('');
  const cellRefs = React.useRef({});

  React.useEffect(() => {
    if (activeCell) {
      setFormulaValue(grid[activeCell.r]?.[activeCell.c] || '');
    } else {
      setFormulaValue('');
    }
  }, [activeCell, grid]);

  const onFormulaChange = (e) => {
    const value = e.target.value;
    setFormulaValue(value);
    if (activeCell) {
      handleCellChange(activeCell.r, activeCell.c, value);
    }
  };

  const getCellLabel = () => {
    if (!activeCell) return '';
    const colName = String.fromCharCode(65 + activeCell.c);
    const rowName = activeCell.r + 1;
    return `${colName}${rowName}`;
  };

  const getCellDisplay = (cellValue) => {
    if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
      const result = evaluateFormula(cellValue, grid);
      return result !== null ? String(result) : cellValue;
    }
    return cellValue;
  };

  // Keyboard navigation
  const handleCellKeyDown = (e, rIdx, cIdx) => {
    const maxRow = grid.length - 1;
    const maxCol = grid[0]?.length - 1 || 0;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          const newC = cIdx > 0 ? cIdx - 1 : maxCol;
          const newR = cIdx > 0 ? rIdx : Math.max(0, rIdx - 1);
          setActiveCell({ r: newR, c: newC });
          cellRefs.current[`${newR}-${newC}`]?.focus();
        } else {
          const newC = cIdx < maxCol ? cIdx + 1 : 0;
          const newR = cIdx < maxCol ? rIdx : Math.min(maxRow, rIdx + 1);
          setActiveCell({ r: newR, c: newC });
          cellRefs.current[`${newR}-${newC}`]?.focus();
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (rIdx < maxRow) {
          setActiveCell({ r: rIdx + 1, c: cIdx });
          cellRefs.current[`${rIdx + 1}-${cIdx}`]?.focus();
        }
        break;
      case 'ArrowUp':
        if (rIdx > 0) {
          e.preventDefault();
          setActiveCell({ r: rIdx - 1, c: cIdx });
          cellRefs.current[`${rIdx - 1}-${cIdx}`]?.focus();
        }
        break;
      case 'ArrowDown':
        if (rIdx < maxRow) {
          e.preventDefault();
          setActiveCell({ r: rIdx + 1, c: cIdx });
          cellRefs.current[`${rIdx + 1}-${cIdx}`]?.focus();
        }
        break;
      case 'Escape':
        e.target.blur();
        break;
    }
  };

  const handleCopyCell = () => {
    if (!activeCell) return;
    const val = grid[activeCell.r]?.[activeCell.c] || '';
    navigator.clipboard.writeText(val);
    toast.success('Cell copied!');
  };

  const handlePasteCell = async () => {
    if (!activeCell) return;
    try {
      const text = await navigator.clipboard.readText();
      handleCellChange(activeCell.r, activeCell.c, text);
      toast.success('Cell pasted!');
    } catch {
      toast.error('Clipboard access denied.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden h-full">
      {/* Spreadsheet Header */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 shrink-0">
            <TableProperties className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Spreadsheet</span>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
          <button 
            onClick={() => toast('Bold (UI only)', { icon: '🅱️' })}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => toast('Italic (UI only)', { icon: '🇮' })}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
          <button onClick={() => toast('Left align (UI only)')} className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer" title="Left">
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => toast('Center align (UI only)')} className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer" title="Center">
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => toast('Right align (UI only)')} className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer" title="Right">
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
          <button onClick={handleCopyCell} className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer" title="Copy Cell">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={handlePasteCell} className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer" title="Paste Cell">
            <ClipboardPaste className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
          <button 
            onClick={() => toast('Smart insights coming soon!', { icon: '✨' })}
            className="flex items-center gap-1 px-2 py-1 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all text-xs font-semibold cursor-pointer"
            title="AI Insights"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Fill</span>
          </button>
        </div>

        <button 
          onClick={() => toast('Sheet synchronized.', { icon: '🔄' })}
          className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Force Sync"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Formula Bar */}
      <div className="h-9 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 px-4 flex items-center gap-3 shrink-0 transition-colors">
        <div className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-300/30 w-12 text-center select-none">
          {getCellLabel() || '—'}
        </div>
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 select-none italic">fx</div>
        <input
          type="text"
          value={formulaValue}
          onChange={onFormulaChange}
          placeholder="Enter value or formula (=SUM, =AVERAGE, =COUNT)..."
          disabled={!activeCell}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-all"
        />
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 transition-colors no-scrollbar">
        <table className="border-collapse w-max min-w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 select-none">
              <th className="w-10 h-7 border border-slate-200 dark:border-slate-800/80 sticky top-0 left-0 bg-slate-100 dark:bg-slate-900 z-30"></th>
              {grid[0]?.map((_, cIdx) => (
                <th 
                  key={cIdx} 
                  className="w-28 border border-slate-200 dark:border-slate-800/80 text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-wider sticky top-0 bg-slate-50 dark:bg-slate-900/80 backdrop-blur-sm z-20"
                >
                  {String.fromCharCode(65 + cIdx)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/20 dark:hover:bg-slate-900/20">
                <td className="w-10 h-7 border border-slate-200 dark:border-slate-800/80 text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center bg-slate-50 dark:bg-slate-900 sticky left-0 z-20 select-none">
                  {rIdx + 1}
                </td>
                {row.map((cell, cIdx) => {
                  const isActive = activeCell?.r === rIdx && activeCell?.c === cIdx;
                  const otherUsersOnCell = Object.values(spreadsheetCells).filter(
                    (c) => c.row === rIdx && c.col === cIdx
                  );
                  const hasOtherUsers = otherUsersOnCell.length > 0;
                  const primaryOtherUser = otherUsersOnCell[0];

                  return (
                    <td 
                      key={cIdx} 
                      className={`w-28 h-7 border border-slate-200 dark:border-slate-800/80 p-0 relative transition-all ${
                        isActive 
                          ? 'ring-2 ring-indigo-500 ring-inset z-10 bg-indigo-500/5' 
                          : hasOtherUsers
                            ? 'z-10 shadow-inner'
                            : ''
                      }`}
                      style={!isActive && hasOtherUsers ? { boxShadow: `inset 0 0 0 2px ${primaryOtherUser.color}` } : {}}
                    >
                      <input
                        ref={(el) => { cellRefs.current[`${rIdx}-${cIdx}`] = el; }}
                        type="text"
                        value={isActive ? cell : getCellDisplay(cell)}
                        onFocus={() => setActiveCell({ r: rIdx, c: cIdx })}
                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, rIdx, cIdx)}
                        className="w-full h-full bg-transparent border-none outline-none px-2 text-xs text-slate-800 dark:text-slate-200 font-mono focus:ring-0"
                      />
                      {/* Name badge indicator */}
                      {!isActive && hasOtherUsers && (
                        <div 
                          className="absolute -top-3.5 left-0 text-[8px] text-white px-1.5 py-0.5 rounded-t-md font-bold z-30 select-none pointer-events-none whitespace-nowrap"
                          style={{ backgroundColor: primaryOtherUser.color }}
                        >
                          {primaryOtherUser.user}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
