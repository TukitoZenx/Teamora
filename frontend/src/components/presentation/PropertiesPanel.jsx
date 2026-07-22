export default function PropertiesPanel({ selectedElems = [], selectedElem, onFormatElement, onDeleteElement }) {
  if (!selectedElem && selectedElems.length === 0) {
    return (
      <div className="flex h-full w-56 shrink-0 flex-col items-center justify-center border-l border-border bg-card p-4 text-center text-muted xl:w-64">
        <span className="text-sm">Select an object to edit its properties.</span>
      </div>
    )
  }

  const isText = selectedElems.every((e) => e.type === 'textbox' || e.type === 'text' || e.type === 'shape')
  const isShape = selectedElems.every((e) => e.type === 'shape')
  const isIcon = selectedElems.every((e) => e.type === 'icon')
  const isImage = selectedElems.every((e) => e.type === 'image')
  const isMultiple = selectedElems.length > 1
  const first = selectedElem || selectedElems[0]

  const handleChange = (key, value) => {
    onFormatElement({ [key]: value })
  }

  const handleAlign = (type) => {
    if (!isMultiple) return
    const minX = Math.min(...selectedElems.map((e) => e.x))
    const maxX = Math.max(...selectedElems.map((e) => e.x + (e.width || 0)))
    const minY = Math.min(...selectedElems.map((e) => e.y))
    const maxY = Math.max(...selectedElems.map((e) => e.y + (e.height || 0)))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    const updates = selectedElems.map((e) => {
      const update = { id: e.id }
      if (type === 'left') update.x = minX
      if (type === 'center') update.x = centerX - (e.width || 0) / 2
      if (type === 'right') update.x = maxX - (e.width || 0)
      if (type === 'top') update.y = minY
      if (type === 'middle') update.y = centerY - (e.height || 0) / 2
      if (type === 'bottom') update.y = maxY - (e.height || 0)
      return update
    })
    onFormatElement(updates)
  }

  const handleDistribute = (axis) => {
    if (selectedElems.length < 3) return
    const sorted = [...selectedElems]
    if (axis === 'horizontal') {
      sorted.sort((a, b) => a.x - b.x)
      const minX = sorted[0].x
      const maxX = sorted[sorted.length - 1].x + (sorted[sorted.length - 1].width || 0)
      const totalWidth = sorted.reduce((sum, e) => sum + (e.width || 0), 0)
      const gap = (maxX - minX - totalWidth) / (sorted.length - 1)
      let currentX = minX
      onFormatElement(
        sorted.map((e) => {
          const newX = currentX
          currentX += (e.width || 0) + gap
          return { id: e.id, x: newX }
        })
      )
    } else {
      sorted.sort((a, b) => a.y - b.y)
      const minY = sorted[0].y
      const maxY = sorted[sorted.length - 1].y + (sorted[sorted.length - 1].height || 0)
      const totalHeight = sorted.reduce((sum, e) => sum + (e.height || 0), 0)
      const gap = (maxY - minY - totalHeight) / (sorted.length - 1)
      let currentY = minY
      onFormatElement(
        sorted.map((e) => {
          const newY = currentY
          currentY += (e.height || 0) + gap
          return { id: e.id, y: newY }
        })
      )
    }
  }

  const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback)

  return (
    <div className="custom-scrollbar flex h-full w-56 shrink-0 flex-col overflow-y-auto border-l border-border bg-card text-sm xl:w-64">
      <div className="border-b border-border bg-card-sunken/30 p-3">
        <h3 className="font-bold text-text">
          {isMultiple ? `Multiple (${selectedElems.length})` : `Format ${first?.type || 'object'}`}
        </h3>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {!isMultiple && first && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Transform</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['X', 'x', Math.round(first.x) || 0],
                ['Y', 'y', Math.round(first.y) || 0],
                ['Width', 'width', Math.round(first.width) || 0],
                ['Height', 'height', Math.round(first.height) || 0]
              ].map(([label, key, value]) => (
                <div key={key}>
                  <label className="mb-1 block text-[10px] text-muted">{label}</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => handleChange(key, parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded border border-border bg-card-sunken px-2 py-1 text-xs text-text"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] text-muted">Rotation (°)</label>
                <input
                  type="number"
                  value={first.rotation || 0}
                  onChange={(e) => handleChange('rotation', parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded border border-border bg-card-sunken px-2 py-1 text-xs text-text"
                />
              </div>
            </div>
          </div>
        )}

        {isMultiple && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Align</h4>
            <div className="grid grid-cols-3 gap-1">
              {['left', 'center', 'right', 'top', 'middle', 'bottom'].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => handleAlign(a)}
                  className="rounded border border-border bg-card-sunken p-1 text-xs capitalize hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  {a}
                </button>
              ))}
            </div>
            {selectedElems.length >= 3 && (
              <div className="grid grid-cols-2 gap-1 pt-2">
                <button
                  type="button"
                  onClick={() => handleDistribute('horizontal')}
                  className="rounded border border-border bg-card-sunken p-1 text-[10px] hover:bg-slate-200"
                >
                  Distribute H
                </button>
                <button
                  type="button"
                  onClick={() => handleDistribute('vertical')}
                  className="rounded border border-border bg-card-sunken p-1 text-[10px] hover:bg-slate-200"
                >
                  Distribute V
                </button>
              </div>
            )}
          </div>
        )}

        {(isText || isIcon) && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {isShape ? 'Shape Text' : 'Typography'}
            </h4>
            <div>
              <label className="mb-1 block text-[10px] text-muted">Font Size</label>
              <input
                type="number"
                value={parseInt(first?.fontSize, 10) || 16}
                onChange={(e) => handleChange('fontSize', `${e.target.value}px`)}
                className="w-full rounded border border-border bg-card-sunken px-2 py-1 text-xs text-text"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted">Text Color</label>
              <input
                type="color"
                value={first?.color || '#000000'}
                onChange={(e) => handleChange('color', e.target.value)}
                className="h-8 w-full cursor-pointer rounded"
              />
            </div>
            {isShape && (
              <p className="text-[10px] text-muted">Double-click the shape on the canvas to type inside it.</p>
            )}
          </div>
        )}

        {(isShape || isText || isIcon) && !isImage && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Appearance</h4>
            <div>
              <label className="mb-1 block text-[10px] text-muted">Fill Color</label>
              <input
                type="color"
                value={first?.fill && first.fill !== 'transparent' ? first.fill : '#ffffff'}
                onChange={(e) => handleChange('fill', e.target.value)}
                className="h-8 w-full cursor-pointer rounded"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted">Border Color</label>
              <input
                type="color"
                value={first?.borderColor || '#000000'}
                onChange={(e) => handleChange('borderColor', e.target.value)}
                className="h-8 w-full cursor-pointer rounded"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted">Border Width (px)</label>
              <input
                type="number"
                value={num(first?.borderWidth, 0)}
                onChange={(e) => handleChange('borderWidth', parseInt(e.target.value, 10) || 0)}
                className="w-full rounded border border-border bg-card-sunken px-2 py-1 text-xs text-text"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted">Border Radius (px)</label>
              <input
                type="number"
                value={num(first?.borderRadius, 0)}
                onChange={(e) => handleChange('borderRadius', parseInt(e.target.value, 10) || 0)}
                className="w-full rounded border border-border bg-card-sunken px-2 py-1 text-xs text-text"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted">Opacity (0 – 1)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={first?.opacity !== undefined ? first.opacity : 1}
                onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
                className="w-full rounded border border-border bg-card-sunken px-2 py-1 text-xs text-text"
              />
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => {
              if (isMultiple) onFormatElement({ deleteMulti: true })
              else if (first) onDeleteElement(first.id)
            }}
            className="w-full rounded-lg bg-red-500/10 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500 hover:text-white"
          >
            Delete {isMultiple ? 'Elements' : 'Element'}
          </button>
        </div>
      </div>
    </div>
  )
}
