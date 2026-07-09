import { useState, useMemo, useRef, useEffect } from 'react'
import { ensureArray } from './utils/arrayUtils'
import {
  TableProperties,
  Copy,
  Download,
  Upload,
  BarChart3,
  Palette,
  LayoutGrid,
  Plus,
  Trash2,
  Edit3,
  Lock,
  ArrowLeftRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

// Advanced formula evaluator supporting SUM, AVERAGE, COUNT, MIN, MAX, PRODUCT, and basic arithmetic references (=A1+B2)
function evaluateFormula(formula, grid, offset = 0) {
  try {
    const upper = formula.toUpperCase().trim()

    // Pattern matches SUM, AVERAGE, COUNT, MIN, MAX, PRODUCT
    const match = upper.match(/^=(SUM|AVERAGE|COUNT|MIN|MAX|PRODUCT)\(([A-Z])(\d+):([A-Z])(\d+)\)$/)
    if (match) {
      const [, op, c1, r1, c2, r2] = match
      const values = []
      const startRow = parseInt(r1) - 1
      const endRow = parseInt(r2) - 1
      const startCol = c1.charCodeAt(0) - 65
      const endCol = c2.charCodeAt(0) - 65

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const val = parseFloat(grid[offset + r]?.[c])
          if (!isNaN(val)) values.push(val)
        }
      }

      if (values.length === 0) return 0

      switch (op) {
        case 'SUM':
          return values.reduce((sum, v) => sum + v, 0)
        case 'AVERAGE':
          return (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2)
        case 'COUNT':
          return values.length
        case 'MIN':
          return Math.min(...values)
        case 'MAX':
          return Math.max(...values)
        case 'PRODUCT':
          return values.reduce((prod, v) => prod * v, 1)
        default:
          return 0
      }
    }

    // Arithmetic reference: =A1+B2
    const arithmeticMatch = upper.match(/^=([A-Z])(\d+)\s*([+\-*/])\s*([A-Z])(\d+)$/)
    if (arithmeticMatch) {
      const [, col1, r1, op, col2, r2] = arithmeticMatch
      const val1 = parseFloat(grid[offset + parseInt(r1) - 1]?.[col1.charCodeAt(0) - 65]) || 0
      const val2 = parseFloat(grid[offset + parseInt(r2) - 1]?.[col2.charCodeAt(0) - 65]) || 0
      switch (op) {
        case '+':
          return val1 + val2
        case '-':
          return val1 - val2
        case '*':
          return val1 * val2
        case '/':
          return val2 !== 0 ? (val1 / val2).toFixed(2) : '#DIV/0!'
        default:
          return 0
      }
    }

    // Simple cell reference: =A1
    const refMatch = upper.match(/^=([A-Z])(\d+)$/)
    if (refMatch) {
      const [, col, row] = refMatch
      return grid[offset + parseInt(row) - 1]?.[col.charCodeAt(0) - 65] || ''
    }

    return null
  } catch {
    return '#ERR'
  }
}

export default function Spreadsheet({
  grid,
  activeCell,
  setActiveCell,
  handleCellChange,
  spreadsheetCells = {},
  socket,
  roomId,
  roomSettings = {},
  setRoomSettings
}) {
  const [conditionalFormattingRules, setConditionalFormattingRules] = useState([])
  const [showFormattingModal, setShowFormattingModal] = useState(false)
  const [showPivotBuilder, setShowPivotBuilder] = useState(false)
  const [showCharts, setShowCharts] = useState(false)
  const [chartType, setChartType] = useState('bar') // 'bar', 'line'

  // Formatting rules fields
  const [ruleCol, setRuleCol] = useState(0)
  const [ruleValue, setRuleValue] = useState('')
  const [ruleColor, setRuleColor] = useState('#fee2e2')

  // Freeze Row / Column states
  const [freezeRow, setFreezeRow] = useState(false)
  const [freezeCol, setFreezeCol] = useState(false)

  const [rowCount, setRowCount] = useState(100)
  const [columnCount, setColumnCount] = useState(26)

  const cellRefs = useRef({})
  const gridContainerRef = useRef(null)

  // Scroll into view to center active cell on focus
  useEffect(() => {
    if (activeCell) {
      const activeEl = cellRefs.current[`${activeCell.r}-${activeCell.c}`]
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
      }
    }
  }, [activeCell])

  const handleGridScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = e.target
    if (scrollHeight - scrollTop - clientHeight < 200) {
      setRowCount((prev) => prev + 50)
    }
    if (scrollWidth - scrollLeft - clientWidth < 200) {
      setColumnCount((prev) => prev + 10)
    }
  }

  // Sheets Metadata setup from roomSettings
  const sheetsMetadata = useMemo(() => {
    const meta = roomSettings.sheetsMetadata || {}
    return {
      activeSheet: meta.activeSheet || 'Sheet1',
      sheets: Array.isArray(meta.sheets) ? meta.sheets : [{ name: 'Sheet1', offset: 0 }]
    }
  }, [roomSettings])

  const activeSheetObj = useMemo(() => {
    const sheets = ensureArray(sheetsMetadata.sheets)
    return sheets.find((s) => s && s.name === sheetsMetadata.activeSheet) || sheets[0]
  }, [sheetsMetadata])

  const sheetOffset = activeSheetObj ? activeSheetObj.offset : 0

  // Active sheet grid sliced
  const visibleGridRows = useMemo(() => {
    const rows = []
    for (let r = 0; r < rowCount; r++) {
      rows.push(grid[sheetOffset + r] || Array(columnCount).fill(''))
    }
    return rows
  }, [grid, sheetOffset, rowCount, columnCount])

  // Converts column index to standard alphabetical label (A, B, C... AA, AB...)
  const getColumnHeaderLabel = (index) => {
    let label = ''
    let temp = index
    while (temp >= 0) {
      label = String.fromCharCode((temp % 26) + 65) + label
      temp = Math.floor(temp / 26) - 1
    }
    return label
  }

  // Display cell value
  const getCellDisplay = (cellValue) => {
    if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
      const result = evaluateFormula(cellValue, grid, sheetOffset)
      return result !== null ? String(result) : cellValue
    }
    return cellValue
  }

  const getCellLabel = () => {
    if (!activeCell) return ''
    return `${getColumnHeaderLabel(activeCell.c)}${activeCell.r + 1}`
  }

  // Import XLSX (SheetJS)
  const handleImportXLSX = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

        // populate into active sheet offset (loop over the imported rows,
        // not the current viewport, so importing a larger file than the
        // currently-rendered grid doesn't silently drop rows)
        const importedRowCount = Math.min(data.length, 1000)
        for (let r = 0; r < importedRowCount; r++) {
          for (let c = 0; c < 26; c++) {
            const importedVal = data[r]?.[c] !== undefined ? String(data[r][c]) : ''
            handleCellChange(sheetOffset + r, c, importedVal)
          }
        }
        toast.success('Spreadsheet page imported successfully!')
      } catch (err) {
        console.error('Import error:', err)
        toast.error('Failed to parse XLSX file.')
      }
    }
    reader.readAsBinaryString(file)
  }

  // Export XLSX (SheetJS)
  const handleExportXLSX = () => {
    try {
      // Export current active sheet evaluated rows
      const evaluatedGrid = visibleGridRows.map((row) => row.map((cell) => getCellDisplay(cell)))
      const ws = XLSX.utils.aoa_to_sheet(evaluatedGrid)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, sheetsMetadata.activeSheet)
      XLSX.writeFile(wb, `teamora-${sheetsMetadata.activeSheet.toLowerCase()}.xlsx`)
      toast.success('Spreadsheet exported as Excel!')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Export failed.')
    }
  }

  const handleCellKeyDown = (e, rIdx, cIdx) => {
    switch (e.key) {
      case 'Tab': {
        e.preventDefault()
        const newC = cIdx < columnCount - 1 ? cIdx + 1 : 0
        const newR = cIdx < columnCount - 1 ? rIdx : Math.min(rowCount - 1, rIdx + 1)
        setActiveCell({ r: newR, c: newC })
        cellRefs.current[`${newR}-${newC}`]?.focus()
        break
      }
      case 'Enter':
        e.preventDefault()
        if (rIdx < rowCount - 1) {
          setActiveCell({ r: rIdx + 1, c: cIdx })
          cellRefs.current[`${rIdx + 1}-${cIdx}`]?.focus()
        } else {
          setRowCount((prev) => prev + 10)
          const nextR = rIdx + 1
          setActiveCell({ r: nextR, c: cIdx })
          setTimeout(() => cellRefs.current[`${nextR}-${cIdx}`]?.focus(), 10)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (rIdx > 0) {
          const nextR = rIdx - 1
          setActiveCell({ r: nextR, c: cIdx })
          cellRefs.current[`${nextR}-${cIdx}`]?.focus()
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (rIdx < rowCount - 1) {
          const nextR = rIdx + 1
          setActiveCell({ r: nextR, c: cIdx })
          cellRefs.current[`${nextR}-${cIdx}`]?.focus()
        } else {
          setRowCount((prev) => prev + 10)
          const nextR = rIdx + 1
          setActiveCell({ r: nextR, c: cIdx })
          setTimeout(() => cellRefs.current[`${nextR}-${cIdx}`]?.focus(), 10)
        }
        break
      case 'ArrowLeft':
        if (e.target.selectionStart === 0 || e.target.selectionStart === null) {
          e.preventDefault()
          if (cIdx > 0) {
            const nextC = cIdx - 1
            setActiveCell({ r: rIdx, c: nextC })
            cellRefs.current[`${rIdx}-${nextC}`]?.focus()
          }
        }
        break
      case 'ArrowRight':
        if (e.target.selectionStart === e.target.value.length || e.target.selectionStart === null) {
          e.preventDefault()
          if (cIdx < columnCount - 1) {
            const nextC = cIdx + 1
            setActiveCell({ r: rIdx, c: nextC })
            cellRefs.current[`${rIdx}-${nextC}`]?.focus()
          } else {
            setColumnCount((prev) => prev + 5)
            const nextC = cIdx + 1
            setActiveCell({ r: rIdx, c: nextC })
            setTimeout(() => cellRefs.current[`${rIdx}-${nextC}`]?.focus(), 10)
          }
        }
        break
    }
  }

  // Conditional formatting helper
  const addFormattingRule = () => {
    if (!ruleValue.trim()) return
    const rule = { col: parseInt(ruleCol), val: ruleValue, color: ruleColor }
    setConditionalFormattingRules((prev) => [...prev, rule])
    setShowFormattingModal(false)
    toast.success('Conditional formatting rule added!')
  }

  const getCellFormatStyle = (r, c, value) => {
    const activeRule = conditionalFormattingRules.find(
      (rule) => rule.col === c && parseFloat(value) > parseFloat(rule.val)
    )
    return activeRule ? { backgroundColor: activeRule.color, color: '#ef4444', fontWeight: 'bold' } : {}
  }

  // Dynamic SVG Chart calculations
  const chartData = useMemo(() => {
    const colIdx = activeCell ? activeCell.c : 0
    const dataPoints = []
    for (let r = 0; r < 12; r++) {
      const val = parseFloat(visibleGridRows[r]?.[colIdx])
      if (!isNaN(val)) {
        dataPoints.push({ label: `R${r + 1}`, val })
      }
    }
    return dataPoints
  }, [visibleGridRows, activeCell])

  // Sheets Operations
  const updateSheetsMetadata = (newMetadata) => {
    const updatedSettings = { ...roomSettings, sheetsMetadata: newMetadata }
    setRoomSettings(updatedSettings)
    socket.emit('update-room-settings', { roomId, settings: updatedSettings })
  }

  const handleAddSheet = () => {
    const nextIndex = sheetsMetadata.sheets.length + 1
    const newSheetName = `Sheet${nextIndex}`
    const newSheet = {
      name: newSheetName,
      offset: sheetsMetadata.sheets.length * 1000
    }
    const updated = {
      activeSheet: newSheetName,
      sheets: [...ensureArray(sheetsMetadata.sheets), newSheet]
    }
    updateSheetsMetadata(updated)
    toast.success(`Created sheet ${newSheetName}!`)
  }

  const handleRenameSheet = (sheetName) => {
    const newName = prompt('Enter sheet name:', sheetName)
    if (!newName || newName.trim() === '' || ensureArray(sheetsMetadata.sheets).some((s) => s && s.name === newName)) {
      toast.error('Invalid or duplicate sheet name')
      return
    }
    const updatedSheets = ensureArray(sheetsMetadata.sheets).map((s) =>
      s.name === sheetName ? { ...s, name: newName } : s
    )
    const updated = {
      activeSheet: sheetsMetadata.activeSheet === sheetName ? newName : sheetsMetadata.activeSheet,
      sheets: updatedSheets
    }
    updateSheetsMetadata(updated)
    toast.success('Sheet renamed!')
  }

  const handleDeleteSheet = (sheetName) => {
    if (sheetsMetadata.sheets.length <= 1) {
      toast.error('Cannot delete the last sheet.')
      return
    }
    const updatedSheets = sheetsMetadata.sheets.filter((s) => s.name !== sheetName)
    const active = sheetsMetadata.activeSheet === sheetName ? updatedSheets[0].name : sheetsMetadata.activeSheet
    const updated = {
      activeSheet: active,
      sheets: updatedSheets
    }
    updateSheetsMetadata(updated)
    toast.success('Sheet deleted.')
  }

  const handleDuplicateSheet = (sheetObj) => {
    const nextOffset = sheetsMetadata.sheets.length * 1000
    const dupName = `${sheetObj.name} (Copy)`

    // Copy cell values in the global grid
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < 26; c++) {
        const val = grid[sheetObj.offset + r]?.[c] || ''
        if (val) {
          handleCellChange(nextOffset + r, c, val)
        }
      }
    }

    const newSheet = { name: dupName, offset: nextOffset }
    const updated = {
      activeSheet: dupName,
      sheets: [...sheetsMetadata.sheets, newSheet]
    }
    updateSheetsMetadata(updated)
    toast.success(`Duplicated into ${dupName}!`)
  }

  return (
    <div className="flex-1 flex flex-col bg-card-sunken overflow-hidden h-full">
      {/* Menu / Headers */}
      <div className="h-12 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-success/10 rounded-lg flex items-center justify-center text-success shrink-0">
            <TableProperties className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-text">Spreadsheet</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Charts Preview */}
          <button
            onClick={() => setShowCharts(!showCharts)}
            className={`p-2 rounded-xl border cursor-pointer ${showCharts ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted border-border hover:bg-primary/10 hover:text-primary'}`}
            title="Toggle Charts"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Freeze options */}
          <button
            onClick={() => setFreezeRow(!freezeRow)}
            className={`p-2 rounded-xl border cursor-pointer ${freezeRow ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted border-border hover:bg-primary/10 hover:text-primary'}`}
            title="Freeze Row 1"
          >
            <Lock className="w-4 h-4" />
          </button>
          <button
            onClick={() => setFreezeCol(!freezeCol)}
            className={`p-2 rounded-xl border cursor-pointer ${freezeCol ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted border-border hover:bg-primary/10 hover:text-primary'}`}
            title="Freeze Col A"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          {/* Formatting Rules */}
          <button
            onClick={() => setShowFormattingModal(true)}
            className="p-2 text-muted rounded-xl border border-border hover:bg-primary/10 hover:text-primary cursor-pointer"
            title="Conditional Formatting"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Pivot Table Builder */}
          <button
            onClick={() => setShowPivotBuilder(!showPivotBuilder)}
            className="p-2 text-muted rounded-xl border border-border hover:bg-primary/10 hover:text-primary cursor-pointer"
            title="Pivot Table Summary"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Import / Export actions */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border text-text rounded-xl font-semibold text-xs cursor-pointer hover:bg-primary/10 hover:text-primary">
            <Upload className="w-3.5 h-3.5 text-muted" />
            <span>Import</span>
            <input type="file" onChange={handleImportXLSX} className="hidden" accept=".xlsx" />
          </label>
          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold text-xs cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="h-9 border-b border-border bg-card-sunken/80 px-4 flex items-center gap-3 shrink-0">
        <div className="text-[11px] font-mono font-bold text-muted bg-card px-2.5 py-0.5 rounded border border-border w-12 text-center select-none">
          {getCellLabel() || '—'}
        </div>
        <div className="text-xs font-bold text-muted select-none italic">fx</div>
        <input
          type="text"
          value={activeCell ? grid[sheetOffset + activeCell.r]?.[activeCell.c] || '' : ''}
          onChange={(e) => activeCell && handleCellChange(sheetOffset + activeCell.r, activeCell.c, e.target.value)}
          placeholder="Enter value or formula (=SUM(A1:A5), =A1+B2, =AVERAGE(A1:B3)...)"
          disabled={!activeCell}
          className="flex-1 bg-card border border-border rounded-lg px-3 py-1 text-xs text-text placeholder-muted/65 focus:outline-none focus:border-primary font-mono"
        />
      </div>

      {/* Main Grid View */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className="flex-1 overflow-auto bg-card transition-colors"
          ref={gridContainerRef}
          onScroll={handleGridScroll}
        >
          <table className="border-collapse w-max min-w-full">
            <thead>
              <tr className="bg-card-sunken/80 select-none">
                <th className="w-10 h-7 border border-border sticky top-0 left-0 bg-card-sunken z-30" />
                {visibleGridRows[0]?.map((_, cIdx) => (
                  <th
                    key={cIdx}
                    className="w-28 border border-border text-[10px] font-bold text-muted text-center uppercase tracking-wider sticky top-0 bg-card-sunken/90 z-20"
                  >
                    <span>{getColumnHeaderLabel(cIdx)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleGridRows.map((row, rIdx) => {
                const isFrozenRow = freezeRow && rIdx === 0

                return (
                  <tr
                    key={rIdx}
                    className={
                      isFrozenRow
                        ? 'sticky top-7 z-20 shadow-sm bg-primary/10'
                        : 'hover:bg-primary/5'
                    }
                  >
                    <td className="w-10 h-7 border border-border text-[10px] font-bold text-muted text-center bg-card-sunken sticky left-0 z-20 select-none">
                      {rIdx + 1}
                    </td>
                    {row.map((cell, cIdx) => {
                      const isActive = activeCell?.r === rIdx && activeCell?.c === cIdx
                      const otherUsersOnCell = Object.values(spreadsheetCells).filter(
                        (c) => c.row === sheetOffset + rIdx && c.col === cIdx
                      )
                      const hasOtherUsers = otherUsersOnCell.length > 0
                      const primaryOtherUser = otherUsersOnCell[0]

                      const isFrozenCol = freezeCol && cIdx === 0

                      return (
                        <td
                          key={cIdx}
                          style={getCellFormatStyle(rIdx, cIdx, cell)}
                          className={`w-28 h-7 border border-border p-0 relative transition-all ${
                            isActive
                              ? 'ring-2 ring-primary ring-inset z-10 bg-primary/5'
                              : isFrozenCol
                                ? 'sticky left-10 z-10 bg-primary/10'
                                : ''
                          }`}
                        >
                          <input
                            ref={(el) => {
                              cellRefs.current[`${rIdx}-${cIdx}`] = el
                            }}
                            type="text"
                            value={isActive ? cell : getCellDisplay(cell)}
                            onFocus={() => setActiveCell({ r: rIdx, c: cIdx })}
                            onChange={(e) => handleCellChange(sheetOffset + rIdx, cIdx, e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, rIdx, cIdx)}
                            className="w-full h-full bg-transparent border-none outline-none px-2 text-xs text-text font-mono focus:ring-0 focus:outline-none"
                          />
                          {!isActive && hasOtherUsers && (
                            <div
                              className="absolute -top-3.5 left-0 text-[8px] text-white px-1.5 py-0.5 rounded-t-md font-bold z-30 select-none pointer-events-none whitespace-nowrap"
                              style={{ backgroundColor: primaryOtherUser.color }}
                            >
                              {primaryOtherUser.user}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>        {/* Dynamic Charts Preview */}
        {showCharts && (
          <div className="w-80 border-l border-border bg-card p-5 flex flex-col shrink-0 text-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold uppercase tracking-wider text-muted text-[10px]">Charts Drawer</span>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="bg-card-sunken text-[10px] font-bold border border-border text-text rounded px-2 py-0.5"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
              </select>
            </div>
            {chartData.length === 0 ? (
              <p className="italic text-muted text-center py-6">
                Enter numbers in the current column to display charts.
              </p>
            ) : chartType === 'bar' ? (
              <svg
                viewBox="0 0 200 120"
                className="w-full h-44 border border-border rounded-lg p-2 bg-card-sunken"
              >
                {chartData.map((d, i) => {
                  const maxVal = Math.max(...chartData.map((dp) => dp.val), 1)
                  const barHeight = (d.val / maxVal) * 80
                  const x = 20 + i * 14
                  const y = 90 - barHeight
                  return (
                    <g key={i}>
                      <rect x={x} y={y} width="10" height={barHeight} fill="#6366f1" rx="1" />
                      <text x={x + 5} y="105" fontSize="6" fill="#94a3b8" textAnchor="middle">
                        {d.label}
                      </text>
                      <text x={x + 5} y={y - 4} fontSize="6" fill="#ffffff" textAnchor="middle">
                        {d.val}
                      </text>
                    </g>
                  )
                })}
              </svg>
            ) : (
              <svg
                viewBox="0 0 200 120"
                className="w-full h-44 border border-border rounded-lg p-2 bg-card-sunken"
              >
                <path
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  d={chartData
                    .map((d, i) => {
                      const maxVal = Math.max(...chartData.map((dp) => dp.val), 1)
                      const barHeight = (d.val / maxVal) * 80
                      const x = 20 + i * 14
                      const y = 90 - barHeight
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                    })
                    .join(' ')}
                />
                {chartData.map((d, i) => {
                  const maxVal = Math.max(...chartData.map((dp) => dp.val), 1)
                  const barHeight = (d.val / maxVal) * 80
                  const x = 20 + i * 14
                  const y = 90 - barHeight
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="2.5" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
                      <text x={x} y="105" fontSize="6" fill="#94a3b8" textAnchor="middle">
                        {d.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            )}
          </div>
        )}

        {/* Pivot Summary Drawer */}
        {showPivotBuilder && (
          <div className="w-80 border-l border-border bg-card p-5 flex flex-col shrink-0 text-xs">
            <h4 className="font-bold text-[10px] text-muted uppercase tracking-wider mb-4">
              Pivot Builder Summary
            </h4>
            <div className="bg-card-sunken p-4 rounded-xl border border-border">
              <span className="font-bold text-text block mb-2">
                Column A (Tags) & Column B (Sums)
              </span>
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-border font-bold text-muted">
                    <th>Row Tag</th>
                    <th className="text-right">Sum Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const tagsMap = {}
                    for (let r = 0; r < 20; r++) {
                      const tag = visibleGridRows[r]?.[0]
                      const val = parseFloat(visibleGridRows[r]?.[1])
                      if (tag && !isNaN(val)) {
                        tagsMap[tag] = (tagsMap[tag] || 0) + val
                      }
                    }
                    const entries = Object.entries(tagsMap)
                    if (entries.length === 0) {
                      return (
                        <tr>
                          <td colSpan={2} className="py-2 italic text-muted text-center">
                            Empty pivot range.
                          </td>
                        </tr>
                      )
                    }
                    return entries.map(([tag, sum], i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="py-1 text-text">{tag}</td>
                        <td className="py-1 text-right font-mono font-bold text-primary">{sum}</td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>      {/* Sheets Navigation Tab bar */}
      <div className="h-10 border-t border-border bg-card px-4 flex items-center gap-1.5 shrink-0 z-20 select-none overflow-x-auto no-scrollbar">
        {ensureArray(sheetsMetadata.sheets).map((sheet, sIdx) => {
          const isActive = sheetsMetadata.activeSheet === sheet.name
          return (
            <div key={sIdx} className="relative group/tab flex items-center">
              <button
                onClick={() => updateSheetsMetadata({ ...sheetsMetadata, activeSheet: sheet.name })}
                className={`h-7 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <span>{sheet.name}</span>
              </button>

              {/* Action Dropdown overlays for tab actions */}
              <div className="hidden group-hover/tab:flex absolute bottom-full left-0 mb-1 bg-card border border-border text-text rounded-lg flex items-center p-1 gap-1.5 shadow-card z-50">
                <button onClick={() => handleRenameSheet(sheet.name)} title="Rename Sheet">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDuplicateSheet(sheet)} title="Duplicate Sheet">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteSheet(sheet.name)}
                  title="Delete Sheet"
                  className="text-danger hover:text-danger-hover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
        <button
          onClick={handleAddSheet}
          className="p-1.5 rounded-lg border border-border hover:bg-primary/10 text-muted hover:text-primary cursor-pointer"
          title="Add Sheet Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Formatting Modal */}
      {showFormattingModal && (
        <div className="fixed inset-0 bg-card-sunken/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full">
            <h3 className="text-sm font-bold text-text mb-4">New Highlight Rule</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                  Target Column
                </label>
                <select
                  value={ruleCol}
                  onChange={(e) => setRuleCol(parseInt(e.target.value))}
                  className="w-full bg-card-sunken border border-border text-text rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary"
                >
                  {Array(26)
                    .fill()
                    .map((_, i) => (
                      <option key={i} value={i}>
                        Column {String.fromCharCode(65 + i)}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                  Highlight if Value &gt;
                </label>
                <input
                  type="number"
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="w-full bg-card-sunken border border-border text-text rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                  Highlight Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['#fee2e2', '#fef3c7', '#d1fae5', '#e0e7ff'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setRuleColor(c)}
                      style={{ backgroundColor: c }}
                      className={`h-8 rounded-lg border border-border cursor-pointer ${ruleColor === c ? 'ring-2 ring-primary' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={() => setShowFormattingModal(false)}
                className="px-4 py-2 bg-card hover:bg-primary/10 border border-border text-text rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={addFormattingRule}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold"
              >
                Apply Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
