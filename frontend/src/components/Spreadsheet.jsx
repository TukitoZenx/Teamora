import React from 'react';
import { 
  TableProperties, 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Type, 
  Sparkles,
  RefreshCw,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Spreadsheet({
  grid,
  activeCell,
  setActiveCell,
  handleCellChange
}) {
  const [formulaValue, setFormulaValue] = React.useState('');

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

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden h-full">
      {/* Spreadsheet Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 shrink-0">
            <TableProperties className="w-4.5 h-4.5" />
          </div>
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Financial Ledger</span>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
          <button 
            onClick={() => toast('Applied bold formatting (UI only)', { icon: '🇧' })}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button 
            onClick={() => toast('Applied italic formatting (UI only)', { icon: '🇮' })}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          <button 
            onClick={() => toast('Left alignment (UI only)')}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => toast('Center alignment (UI only)')}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button 
            onClick={() => toast('Right alignment (UI only)')}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          <button 
            onClick={() => toast('Smart insights coming soon!', { icon: '✨' })}
            className="flex items-center gap-1 px-2.5 py-1 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all text-xs font-semibold cursor-pointer"
            title="AI Insights"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Fill</span>
          </button>
        </div>

        <button 
          onClick={() => toast('Sheet fully synchronized.', { icon: '🔄' })}
          className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Force Sync"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Formula Bar */}
      <div className="h-10 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 px-6 flex items-center gap-3 shrink-0 transition-colors">
        <div className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-300/30 w-12 text-center select-none">
          {getCellLabel() || 'Select'}
        </div>
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 select-none">fx</div>
        <input
          type="text"
          value={formulaValue}
          onChange={onFormulaChange}
          placeholder="Enter formula or cell value..."
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
                  return (
                    <td 
                      key={cIdx} 
                      className={`w-28 h-7 border border-slate-200 dark:border-slate-800/80 p-0 relative transition-all ${
                        isActive ? 'ring-2 ring-indigo-500 ring-inset z-10 bg-indigo-500/5' : ''
                      }`}
                    >
                      <input
                        type="text"
                        value={cell}
                        onFocus={() => setActiveCell({ r: rIdx, c: cIdx })}
                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                        className="w-full h-full bg-transparent border-none outline-none px-2 text-xs text-slate-800 dark:text-slate-200 font-mono focus:ring-0"
                      />
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
