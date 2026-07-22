export default function PropertiesPanel({
  selectedElems = [],
  selectedElem,
  onFormatElement,
  onDeleteElement
}) {
  if (!selectedElem && selectedElems.length === 0) {
    return (
      <div className="w-64 bg-card border-l border-border shrink-0 h-full p-4 text-center flex flex-col items-center justify-center text-muted">
        <span className="text-sm">Select an object to edit its properties.</span>
      </div>
    )
  }

  const isText = selectedElems.every(e => e.type === 'textbox' || e.type === 'text')
  const isShape = selectedElems.every(e => e.type === 'shape')
  const isMultiple = selectedElems.length > 1

  const handleChange = (key, value) => {
    onFormatElement({ [key]: value })
  }

  const handleAlign = (type) => {
    if (!isMultiple) return
    const minX = Math.min(...selectedElems.map(e => e.x))
    const maxX = Math.max(...selectedElems.map(e => e.x + (e.width || 0)))
    const minY = Math.min(...selectedElems.map(e => e.y))
    const maxY = Math.max(...selectedElems.map(e => e.y + (e.height || 0)))
    
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    const updates = selectedElems.map(e => {
      let update = { id: e.id }
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
    let sorted = [...selectedElems]
    if (axis === 'horizontal') {
      sorted.sort((a, b) => a.x - b.x)
      const minX = sorted[0].x
      const maxX = sorted[sorted.length - 1].x + (sorted[sorted.length - 1].width || 0)
      const totalWidth = sorted.reduce((sum, e) => sum + (e.width || 0), 0)
      const gap = (maxX - minX - totalWidth) / (sorted.length - 1)
      
      let currentX = minX
      const updates = sorted.map(e => {
        const newX = currentX
        currentX += (e.width || 0) + gap
        return { id: e.id, x: newX }
      })
      onFormatElement(updates)
    } else {
      sorted.sort((a, b) => a.y - b.y)
      const minY = sorted[0].y
      const maxY = sorted[sorted.length - 1].y + (sorted[sorted.length - 1].height || 0)
      const totalHeight = sorted.reduce((sum, e) => sum + (e.height || 0), 0)
      const gap = (maxY - minY - totalHeight) / (sorted.length - 1)
      
      let currentY = minY
      const updates = sorted.map(e => {
        const newY = currentY
        currentY += (e.height || 0) + gap
        return { id: e.id, y: newY }
      })
      onFormatElement(updates)
    }
  }

  return (
    <div className="w-64 bg-card border-l border-border flex flex-col shrink-0 h-full overflow-y-auto custom-scrollbar text-sm">
      <div className="p-3 border-b border-border bg-card-sunken/30">
        <h3 className="font-bold text-text">
          {isMultiple ? `Multiple (${selectedElems.length})` : `Format ${selectedElem?.type}`}
        </h3>
      </div>

      <div className="p-4 flex flex-col gap-5">
        
        {/* Dimensions & Position (Common) */}
        {!isMultiple && (
          <div className="space-y-3">
            <h4 className="font-semibold text-xs text-muted uppercase tracking-wider">Transform</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted mb-1 block">X Position</label>
                <input 
                  type="number" 
                  value={Math.round(selectedElem.x) || 0} 
                  onChange={(e) => handleChange('x', parseInt(e.target.value))}
                  className="w-full bg-card-sunken border border-border rounded px-2 py-1 text-xs text-text" 
                />
              </div>
              <div>
                <label className="text-[10px] text-muted mb-1 block">Y Position</label>
                <input 
                  type="number" 
                  value={Math.round(selectedElem.y) || 0} 
                  onChange={(e) => handleChange('y', parseInt(e.target.value))}
                  className="w-full bg-card-sunken border border-border rounded px-2 py-1 text-xs text-text" 
                />
              </div>
              <div>
                <label className="text-[10px] text-muted mb-1 block">Width</label>
                <input 
                  type="number" 
                  value={Math.round(selectedElem.width) || 0} 
                  onChange={(e) => handleChange('width', parseInt(e.target.value))}
                  className="w-full bg-card-sunken border border-border rounded px-2 py-1 text-xs text-text" 
                />
              </div>
              <div>
                <label className="text-[10px] text-muted mb-1 block">Height</label>
                <input 
                  type="number" 
                  value={Math.round(selectedElem.height) || 0} 
                  onChange={(e) => handleChange('height', parseInt(e.target.value))}
                  className="w-full bg-card-sunken border border-border rounded px-2 py-1 text-xs text-text" 
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-muted mb-1 block">Rotation (°)</label>
                <input 
                  type="number" 
                  value={selectedElem.rotation || 0} 
                  onChange={(e) => handleChange('rotation', parseInt(e.target.value))}
                  className="w-full bg-card-sunken border border-border rounded px-2 py-1 text-xs text-text" 
                />
              </div>
            </div>
          </div>
        )}

        {isMultiple && (
          <div className="space-y-3">
            <h4 className="font-semibold text-xs text-muted uppercase tracking-wider">Align</h4>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => handleAlign('left')} className="p-1 text-xs bg-card-sunken hover:bg-slate-200 rounded border border-border">Left</button>
              <button onClick={() => handleAlign('center')} className="p-1 text-xs bg-card-sunken hover:bg-slate-200 rounded border border-border">Center</button>
              <button onClick={() => handleAlign('right')} className="p-1 text-xs bg-card-sunken hover:bg-slate-200 rounded border border-border">Right</button>
              <button onClick={() => handleAlign('top')} className="p-1 text-xs bg-card-sunken hover:bg-slate-200 rounded border border-border">Top</button>
              <button onClick={() => handleAlign('middle')} className="p-1 text-xs bg-card-sunken hover:bg-slate-200 rounded border border-border">Middle</button>
              <button onClick={() => handleAlign('bottom')} className="p-1 text-xs bg-card-sunken hover:bg-slate-200 rounded border border-border">Bottom</button>
            </div>
            {selectedElems.length >= 3 && (
              <div className="grid grid-cols-2 gap-1 pt-2">
                <button onClick={() => handleDistribute('horizontal')} className="p-1 text-[10px] bg-card-sunken hover:bg-slate-200 rounded border border-border">Distribute H</button>
                <button onClick={() => handleDistribute('vertical')} className="p-1 text-[10px] bg-card-sunken hover:bg-slate-200 rounded border border-border">Distribute V</button>
              </div>
            )}
          </div>
        )}

        {/* Text Properties */}
        {isText && (
          <div className="space-y-3">
            <h4 className="font-semibold text-xs text-muted uppercase tracking-wider">Typography</h4>
            <div>
              <label className="text-[10px] text-muted mb-1 block">Font Size</label>
              <input 
                type="number" 
                value={parseInt(selectedElem.fontSize) || 16} 
                onChange={(e) => handleChange('fontSize', `${e.target.value}px`)}
                className="w-full bg-card-sunken border border-border rounded px-2 py-1 text-xs text-text" 
              />
            </div>
            <div>
              <label className="text-[10px] text-muted mb-1 block">Text Color</label>
              <input 
                type="color" 
                value={selectedElem.color || '#000000'} 
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full h-8 rounded cursor-pointer" 
              />
            </div>
          </div>
        )}

        {/* Appearance (Shape & Text Box) */}
        {(isShape || isText) && (
          <div className="space-y-3">
            <h4 className="font-semibold text-xs text-muted uppercase tracking-wider">Appearance</h4>
            <div>
              <label className="text-[10px] text-muted mb-1 block">Fill Color</label>
              <input 
                type="color" 
                value={selectedElem.fill || '#ffffff'} 
                onChange={(e) => handleChange('fill', e.target.value)}
                className="w-full h-8 rounded cursor-pointer" 
              />
            </div>
            <div>
              <label className="text-[10px] text-muted mb-1 block">Border Color</label>
              <input 
                type="color" 
                value={selectedElem.borderColor || '#000000'} 
                onChange={(e) => handleChange('borderColor', e.target.value)}
                className="w-full h-8 rounded cursor-pointer" 
              />
            </div>
            <div>
              <label className="text-[10px] text-muted mb-1 block">Border Width (px)</label>
              <input 
                type="number" 
                value={selectedElem.borderWidth || 0} 
                onChange={(e) => handleChange('borderWidth', parseInt(e.target.value))}
                className="w-full bg-card-sunken border border-border rounded px-2 py-1 text-xs text-text" 
              />
            </div>
            <div>
              <label className="text-[10px] text-muted mb-1 block">Border Radius (px)</label>
              <input 
                type="number" 
                value={selectedElem.borderRadius || 0} 
                onChange={(e) => handleChange('borderRadius', parseInt(e.target.value))}
                className="w-full bg-card-sunken border border-border rounded px-2 py-1 text-xs text-text" 
              />
            </div>
            <div>
              <label className="text-[10px] text-muted mb-1 block">Opacity (0 - 1)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                max="1"
                value={selectedElem.opacity !== undefined ? selectedElem.opacity : 1} 
                onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
                className="w-full bg-card-sunken border border-border rounded px-2 py-1 text-xs text-text" 
              />
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <button
            onClick={() => {
              if (isMultiple) {
                // If the panel has an onDeleteElements, we should call that. But we handle this via onFormatElement?
                // Actually, PresentationModule handles DeleteElements separately. We should pass it down.
                // For now, if we pass a special format command:
                onFormatElement({ deleteMulti: true }) // Not ideal but PropertiesPanel only takes onDeleteElement (single ID).
              } else {
                onDeleteElement(selectedElem.id)
              }
            }}
            className="w-full py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-semibold text-xs"
          >
            Delete {isMultiple ? 'Elements' : 'Element'}
          </button>
        </div>

      </div>
    </div>
  )
}
