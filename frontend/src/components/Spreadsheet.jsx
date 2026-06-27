import React, { useState, useMemo, useRef } from 'react';
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
  Download,
  Upload,
  BarChart3,
  ListFilter,
  Palette,
  LayoutGrid
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// Advanced formula evaluator supporting SUM, AVERAGE, COUNT, MIN, MAX, PRODUCT
function evaluateFormula(formula, grid) {
  try {
    const upper = formula.toUpperCase().trim();
    
    // Pattern matches sum, average, count, min, max, product
    const match = upper.match(/^=(SUM|AVERAGE|COUNT|MIN|MAX|PRODUCT)\(([A-Z])(\d+):([A-Z])(\d+)\)$/);
    if (match) {
      const [, op, c1, r1, c2, r2] = match;
      const values = [];
      for (let r = parseInt(r1) - 1; r <= parseInt(r2) - 1; r++) {
        for (let c = c1.charCodeAt(0) - 65; c <= c2.charCodeAt(0) - 65; c++) {
          const val = parseFloat(grid[r]?.[c]);
          if (!isNaN(val)) values.push(val);
        }
      }

      if (values.length === 0) return 0;

      switch(op) {
        case 'SUM': return values.reduce((sum, v) => sum + v, 0);
        case 'AVERAGE': return (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2);
        case 'COUNT': return values.length;
        case 'MIN': return Math.min(...values);
        case 'MAX': return Math.max(...values);
        case 'PRODUCT': return values.reduce((prod, v) => prod * v, 1);
        default: return 0;
      }
    }

    // Simple cell reference: =A1
    const refMatch = upper.match(/^=([A-Z])(\d+)$/);
    if (refMatch) {
      const [, col, row] = refMatch;
      return grid[parseInt(row) - 1]?.[col.charCodeAt(0) - 65] || '';
    }

    return null;
  } catch {
    return '#ERR';
  }
}

export default function Spreadsheet({
  grid,
  activeCell,
  setActiveCell,
  handleCellChange,
  spreadsheetCells = {},
  socket,
  roomId
}) {
  const [formulaValue, setFormulaValue] = useState('');
  const [conditionalFormattingRules, setConditionalFormattingRules] = useState([]); // [{ col: 0, val: 50, color: '#fee2e2' }]
  const [showFormattingModal, setShowFormattingModal] = useState(false);
  const [showPivotBuilder, setShowPivotBuilder] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  // Formatting rules fields
  const [ruleCol, setRuleCol] = useState(0);
  const [ruleValue, setRuleValue] = useState('');
  const [ruleColor, setRuleColor] = useState('#fee2e2'); // red highlight

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ col: null, direction: 'asc' });

  // Column filter state
  const [filterConfig, setFilterConfig] = useState({ col: null, term: '' });

  const cellRefs = useRef({});

  // Display cell value
  const getCellDisplay = (cellValue) => {
    if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
      const result = evaluateFormula(cellValue, grid);
      return result !== null ? String(result) : cellValue;
    }
    return cellValue;
  };

  const getCellLabel = () => {
    if (!activeCell) return '';
    return `${String.fromCharCode(65 + activeCell.c)}${activeCell.r + 1}`;
  };

  // Import XLSX (SheetJS)
  const handleImportXLSX = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // populate standard 15x8 grid
        for (let r = 0; r < 15; r++) {
          for (let c = 0; c < 8; c++) {
            const importedVal = data[r]?.[c] !== undefined ? String(data[r][c]) : '';
            if (importedVal !== grid[r][c]) {
              handleCellChange(r, c, importedVal);
            }
          }
        }
        toast.success('Spreadsheet imported successfully!');
      } catch (err) {
        console.error('Import error:', err);
        toast.error('Failed to parse XLSX file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export XLSX (SheetJS)
  const handleExportXLSX = () => {
    try {
      // Evaluate all cells before exporting
      const evaluatedGrid = grid.map((row) => 
        row.map((cell) => getCellDisplay(cell))
      );
      const ws = XLSX.utils.aoa_to_sheet(evaluatedGrid);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, 'teamora-spreadsheet.xlsx');
      toast.success('Spreadsheet exported as Excel!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Export failed.');
    }
  };

  // Sorting columns
  const handleSortColumn = (colIdx) => {
    const direction = sortConfig.col === colIdx && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ col: colIdx, direction });

    const sortedRows = [...grid].sort((a, b) => {
      const valA = parseFloat(a[colIdx]) || a[colIdx] || '';
      const valB = parseFloat(b[colIdx]) || b[colIdx] || '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'asc' ? valA - valB : valB - valA;
      }
      return direction === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    // Write back sorted rows cell-by-cell
    sortedRows.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val !== grid[r][c]) {
          handleCellChange(r, c, val);
        }
      });
    });
    toast.success(`Sorted column ${String.fromCharCode(65 + colIdx)} ${direction.toUpperCase()}`);
  };

  const handleCellKeyDown = (e, rIdx, cIdx) => {
    const maxRow = grid.length - 1;
    const maxCol = grid[0]?.length - 1 || 0;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        const newC = cIdx < maxCol ? cIdx + 1 : 0;
        const newR = cIdx < maxCol ? rIdx : Math.min(maxRow, rIdx + 1);
        setActiveCell({ r: newR, c: newC });
        cellRefs.current[`${newR}-${newC}`]?.focus();
        break;
      case 'Enter':
        e.preventDefault();
        if (rIdx < maxRow) {
          setActiveCell({ r: rIdx + 1, c: cIdx });
          cellRefs.current[`${rIdx + 1}-${cIdx}`]?.focus();
        }
        break;
    }
  };

  // Add conditional formatting
  const addFormattingRule = () => {
    if (!ruleValue.trim()) return;
    const rule = { col: parseInt(ruleCol), val: ruleValue, color: ruleColor };
    setConditionalFormattingRules(prev => [...prev, rule]);
    setShowFormattingModal(false);
    toast.success('Conditional formatting rule added!');
  };

  const getCellFormatStyle = (r, c, value) => {
    const activeRule = conditionalFormattingRules.find(rule => 
      rule.col === c && parseFloat(value) > parseFloat(rule.val)
    );
    return activeRule ? { backgroundColor: activeRule.color, color: '#ef4444', fontWeight: 'bold' } : {};
  };

  // SVG Charts computation (based on the active columns range)
  const chartData = useMemo(() => {
    const colIdx = activeCell ? activeCell.c : 0;
    const dataPoints = [];
    for (let r = 0; r < 10; r++) {
      const val = parseFloat(grid[r]?.[colIdx]);
      if (!isNaN(val)) {
        dataPoints.push({ label: `R${r+1}`, val });
      }
    }
    return dataPoints;
  }, [grid, activeCell]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden h-full">
      {/* Spreadsheet Header / Menu Actions */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 shrink-0">
            <TableProperties className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Spreadsheet</span>
        </div>

        {/* Toolbar formatting buttons */}
        <div className="flex items-center gap-2">
          {/* Chart selector */}
          <button 
            onClick={() => setShowCharts(!showCharts)}
            className={`p-2 rounded-xl transition-all cursor-pointer border ${
              showCharts 
                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' 
                : 'text-slate-500 hover:text-indigo-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800'
            }`}
            title="Toggle SVG Charts"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Conditional Formatting Toggle */}
          <button 
            onClick={() => setShowFormattingModal(true)}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer"
            title="Conditional Formatting"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Pivot Table Builder */}
          <button 
            onClick={() => setShowPivotBuilder(!showPivotBuilder)}
            className="p-2 text-slate-500 hover:text-indigo-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer"
            title="Pivot Table Builder"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5"></div>

          {/* Import/Export XLSX actions */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs cursor-pointer hover:bg-slate-50 transition-colors">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Import</span>
            <input type="file" onChange={handleImportXLSX} className="hidden" accept=".xlsx" />
          </label>
          <button 
            onClick={handleExportXLSX}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-indigo-500/10"
            title="Export Excel sheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="h-9 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 px-4 flex items-center gap-3 shrink-0">
        <div className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-300/30 w-12 text-center select-none">
          {getCellLabel() || '—'}
        </div>
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 select-none italic">fx</div>
        <input
          type="text"
          value={activeCell ? grid[activeCell.r]?.[activeCell.c] || '' : ''}
          onChange={(e) => activeCell && handleCellChange(activeCell.r, activeCell.c, e.target.value)}
          placeholder="Enter value or formula (=SUM(A1:A5), =AVERAGE(A1:B3), =MIN(A1:B3)...)"
          disabled={!activeCell}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-all font-mono"
        />
      </div>

      {/* Split Spreadsheet Area containing Pivot builder, Charts & Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Main spreadsheet Grid */}
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
                    <div className="flex items-center justify-center gap-1">
                      <span>{String.fromCharCode(65 + cIdx)}</span>
                      <button 
                        onClick={() => handleSortColumn(cIdx)}
                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[9px] text-slate-400 hover:text-indigo-500 cursor-pointer"
                        title="Sort Column"
                      >
                        ↕
                      </button>
                    </div>
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
                        style={getCellFormatStyle(rIdx, cIdx, cell)}
                        className={`w-28 h-7 border border-slate-200 dark:border-slate-800/80 p-0 relative transition-all ${
                          isActive 
                            ? 'ring-2 ring-indigo-500 ring-inset z-10 bg-indigo-500/5' 
                            : hasOtherUsers
                              ? 'z-10 shadow-inner'
                              : ''
                        }`}
                      >
                        <input
                          ref={(el) => { cellRefs.current[`${rIdx}-${cIdx}`] = el; }}
                          type="text"
                          value={isActive ? cell : getCellDisplay(cell)}
                          onFocus={() => setActiveCell({ r: rIdx, c: cIdx })}
                          onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, rIdx, cIdx)}
                          className="w-full h-full bg-transparent border-none outline-none px-2 text-xs text-slate-800 dark:text-slate-200 font-mono focus:ring-0 focus:outline-none"
                        />
                        {/* Name badge */}
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

        {/* Dynamic SVG Charts side drawer */}
        {showCharts && (
          <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col shrink-0 text-xs">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-4">Column Chart Preview</h4>
            {chartData.length === 0 ? (
              <p className="italic text-slate-400 text-center py-6">Enter numeric values in the active column to generate charts.</p>
            ) : (
              <div className="space-y-6">
                {/* SVG Bar Chart */}
                <svg viewBox="0 0 200 120" className="w-full h-36 border border-slate-100 dark:border-slate-800 rounded-lg p-2 bg-slate-950">
                  {chartData.map((d, i) => {
                    const maxVal = Math.max(...chartData.map(dp => dp.val), 1);
                    const barHeight = (d.val / maxVal) * 80;
                    const x = 20 + i * 18;
                    const y = 90 - barHeight;
                    return (
                      <g key={i}>
                        <rect x={x} y={y} width="12" height={barHeight} fill="#4f46e5" rx="1" />
                        <text x={x+6} y="105" fontSize="6" fill="#94a3b8" textAnchor="middle">{d.label}</text>
                        <text x={x+6} y={y-4} fontSize="6" fill="#ffffff" textAnchor="middle">{d.val}</text>
                      </g>
                    );
                  })}
                </svg>

                {/* SVG Line Chart */}
                <svg viewBox="0 0 200 120" className="w-full h-36 border border-slate-100 dark:border-slate-800 rounded-lg p-2 bg-slate-950">
                  <path
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    d={chartData.map((d, i) => {
                      const maxVal = Math.max(...chartData.map(dp => dp.val), 1);
                      const barHeight = (d.val / maxVal) * 80;
                      const x = 20 + i * 18;
                      const y = 90 - barHeight;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                  />
                  {chartData.map((d, i) => {
                    const maxVal = Math.max(...chartData.map(dp => dp.val), 1);
                    const barHeight = (d.val / maxVal) * 80;
                    const x = 20 + i * 18;
                    const y = 90 - barHeight;
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r="3" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
                        <text x={x} y="105" fontSize="6" fill="#94a3b8" textAnchor="middle">{d.label}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Pivot Table Builder side drawer */}
        {showPivotBuilder && (
          <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col shrink-0 text-xs">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-4">Pivot Table Builder</h4>
            <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
              <p className="text-[10px] text-slate-400">Generates a quick summary grouping column A row tags and summing column B numerical metrics.</p>
              
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2">Aggregated Pivot Matrix</span>
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="py-1">Row Tag</th>
                      <th className="py-1 text-right">Sum Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Render basic pivot groupings of first two columns */}
                    {(() => {
                      const tagsMap = {};
                      for (let r = 0; r < 12; r++) {
                        const tag = grid[r]?.[0];
                        const val = parseFloat(grid[r]?.[1]);
                        if (tag && !isNaN(val)) {
                          tagsMap[tag] = (tagsMap[tag] || 0) + val;
                        }
                      }
                      const entries = Object.entries(tagsMap);
                      if (entries.length === 0) {
                        return <tr><td colSpan={2} className="py-2 italic text-slate-400 text-center">Empty pivot data</td></tr>;
                      }
                      return entries.map(([tag, sum], i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-900">
                          <td className="py-1 font-semibold text-slate-800 dark:text-slate-200">{tag}</td>
                          <td className="py-1 text-right font-mono font-bold text-indigo-500">{sum}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conditional Formatting Modal */}
      {showFormattingModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">New Formatting Rule</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Column</label>
                <select
                  value={ruleCol}
                  onChange={(e) => setRuleCol(parseInt(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs cursor-pointer focus:outline-none"
                >
                  {Array(8).fill().map((_, i) => (
                    <option key={i} value={i}>Column {String.fromCharCode(65 + i)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Highlight if cell value is greater than</label>
                <input
                  type="number"
                  placeholder="50"
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Highlight Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {['#fee2e2', '#fef3c7', '#d1fae5', '#e0e7ff'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setRuleColor(c)}
                      style={{ backgroundColor: c }}
                      className={`h-8 rounded-lg border border-slate-200 cursor-pointer ${
                        ruleColor === c ? 'ring-2 ring-indigo-500' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button 
                onClick={() => setShowFormattingModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={addFormattingRule}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Apply Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
