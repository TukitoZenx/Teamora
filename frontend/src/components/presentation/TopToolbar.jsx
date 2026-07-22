import {
  Type, ImageIcon, Shapes, LayoutTemplate, Palette, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, MonitorPlay, PaintBucket, PenTool, Type as FontIcon,
  Group, Ungroup, BringToFront, SendToBack
} from 'lucide-react'

const FONT_FAMILIES = ['Inter, sans-serif', 'Arial, sans-serif', 'Times New Roman, serif', 'Courier New, monospace', 'Georgia, serif']
const FONT_SIZES = ['12px', '14px', '16px', '18px', '24px', '32px', '48px', '64px', '72px']

export default function TopToolbar({
  activeTab, setActiveTab,
  onInsertElement,
  onFormatElement,
  onChangeTheme,
  onPresent
}) {
  const tabs = ['Home', 'Insert', 'Design', 'Transitions']

  const handleFormatCommand = (command, formatKey, formatValue) => {
    const selection = window.getSelection()
    const isEditing = document.activeElement && document.activeElement.isContentEditable
    
    if (isEditing || (selection && selection.rangeCount > 0 && !selection.isCollapsed)) {
      document.execCommand(command, false, null)
      return
    }
    // Fallback: apply globally
    onFormatElement({ [formatKey]: formatValue })
  }

  const handleNativeSelect = (e, formatKey) => {
    onFormatElement({ [formatKey]: e.target.value })
  }

  return (
    <div className="flex flex-col bg-card border-b border-border shadow-sm shrink-0 relative z-10">
      {/* Ribbon Tabs */}
      <div className="flex items-center gap-1 px-2 pt-1 bg-card-sunken/30">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-t-md transition-colors ${
              activeTab === tab.toLowerCase()
                ? 'bg-card text-primary border-b-2 border-primary shadow-sm'
                : 'bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-text'
            }`}
          >
            {tab}
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={onPresent}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#b7472a] hover:bg-[#a13b20] text-white text-[13px] font-semibold rounded-md shadow-sm transition-colors mb-1 mr-2"
        >
          <MonitorPlay className="w-4 h-4" />
          <span>Present</span>
        </button>
      </div>

      {/* Ribbon Content */}
      <div className="h-[92px] px-3 py-2 flex items-start gap-4 overflow-x-auto shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)] bg-card">
        
        {activeTab === 'home' && (
          <>
            {/* Clipboard Group (Placeholder) */}
            <div className="flex flex-col items-center gap-1 border-r border-slate-300 pr-4 h-full">
              <button className="flex flex-col items-center p-1 hover:bg-slate-200 rounded text-text opacity-50 cursor-not-allowed">
                <div className="w-8 h-8 bg-slate-300 rounded mb-1" />
                <span className="text-[11px]">Paste</span>
              </button>
            </div>

            {/* Font Group */}
            <div className="flex flex-col gap-1 border-r border-border pr-4 h-full" onMouseDown={(e) => e.preventDefault()}>
              <div className="flex items-center gap-1">
                <select onChange={(e) => handleNativeSelect(e, 'fontFamily')} className="h-6 px-1 text-xs border border-border rounded bg-card text-text w-32 focus:outline-none">
                  <option value="">Font...</option>
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                </select>
                <select onChange={(e) => handleNativeSelect(e, 'fontSize')} className="h-6 px-1 text-xs border border-border rounded bg-card text-text w-16 focus:outline-none">
                  <option value="">Size...</option>
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <button onClick={() => handleFormatCommand('bold', 'fontWeight', 'bold')} className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 rounded text-text font-bold">B</button>
                <button onClick={() => handleFormatCommand('italic', 'fontStyle', 'italic')} className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 rounded text-text italic">I</button>
                <button onClick={() => handleFormatCommand('underline', 'textDecoration', 'underline')} className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 rounded text-text underline">U</button>
                
                <div className="w-px h-5 bg-border mx-1" />
                
                <label className="flex flex-col items-center justify-center w-7 h-7 hover:bg-muted/50 rounded cursor-pointer relative" title="Text Color">
                  <FontIcon className="w-4 h-4 text-text" />
                  <div className="w-4 h-1 bg-red-500 rounded-full mt-[1px]" />
                  <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFormatCommand('foreColor', 'color', e.target.value)} />
                </label>
              </div>
              <div className="text-[11px] text-muted-foreground text-center w-full mt-auto">Font</div>
            </div>

            {/* Paragraph Group */}
            <div className="flex flex-col gap-1 border-r border-border pr-4 h-full" onMouseDown={(e) => e.preventDefault()}>
              <div className="flex items-center gap-0.5">
                <button onClick={() => handleFormatCommand('insertUnorderedList', 'listStyle', 'disc')} className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 rounded text-text"><List className="w-4 h-4" /></button>
                <button onClick={() => handleFormatCommand('insertOrderedList', 'listStyle', 'decimal')} className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 rounded text-text"><ListOrdered className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <button onClick={() => handleFormatCommand('justifyLeft', 'textAlign', 'left')} className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 rounded text-text"><AlignLeft className="w-4 h-4" /></button>
                <button onClick={() => handleFormatCommand('justifyCenter', 'textAlign', 'center')} className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 rounded text-text"><AlignCenter className="w-4 h-4" /></button>
                <button onClick={() => handleFormatCommand('justifyRight', 'textAlign', 'right')} className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 rounded text-text"><AlignRight className="w-4 h-4" /></button>
                <button onClick={() => handleFormatCommand('justifyFull', 'textAlign', 'justify')} className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 rounded text-text"><AlignJustify className="w-4 h-4" /></button>
              </div>
              <div className="text-[11px] text-muted-foreground text-center w-full mt-auto">Paragraph</div>
            </div>

            {/* Drawing Group */}
            <div className="flex flex-col gap-1 border-r border-border pr-4 h-full">
              <div className="flex items-center gap-2">
                <button onClick={() => onInsertElement('shape')} className="flex flex-col items-center justify-center w-12 h-12 hover:bg-muted/50 rounded text-text">
                  <Shapes className="w-6 h-6 text-primary" />
                </button>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-muted/50 rounded cursor-pointer text-xs relative">
                    <PaintBucket className="w-3.5 h-3.5 text-text" /> Shape Fill
                    <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => onFormatElement({ fill: e.target.value })} />
                  </label>
                  <label className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-muted/50 rounded cursor-pointer text-xs relative">
                    <PenTool className="w-3.5 h-3.5 text-text" /> Shape Outline
                    <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => onFormatElement({ borderColor: e.target.value, borderWidth: 2 })} />
                  </label>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground text-center w-full mt-auto">Drawing</div>
            </div>
            
            {/* Arrange Group */}
            <div className="flex flex-col gap-1 border-border pr-4 h-full">
              <div className="flex items-center gap-1">
                 <button onClick={() => onFormatElement({ align: 'front' })} className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted/50 rounded text-xs">
                   <BringToFront className="w-3.5 h-3.5" /> Bring Forward
                 </button>
                 <button onClick={() => onFormatElement({ align: 'back' })} className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted/50 rounded text-xs">
                   <SendToBack className="w-3.5 h-3.5" /> Send Backward
                 </button>
              </div>
              <div className="flex items-center gap-1 mt-1">
                 <button onClick={() => onFormatElement({ group: true })} className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted/50 rounded text-xs">
                   <Group className="w-3.5 h-3.5" /> Group
                 </button>
                 <button onClick={() => onFormatElement({ ungroup: true })} className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted/50 rounded text-xs">
                   <Ungroup className="w-3.5 h-3.5" /> Ungroup
                 </button>
              </div>
              <div className="text-[11px] text-muted-foreground text-center w-full mt-auto">Arrange</div>
            </div>
          </>
        )}

        {activeTab === 'insert' && (
          <>
            <div className="flex items-start gap-2 h-full">
              <button onClick={() => onInsertElement('text')} className="flex flex-col items-center justify-center w-16 h-16 hover:bg-muted/50 rounded text-text transition-colors">
                <Type className="w-6 h-6 text-primary mb-1" />
                <span className="text-[11px]">Text Box</span>
              </button>
              <button onClick={() => onInsertElement('image')} className="flex flex-col items-center justify-center w-16 h-16 hover:bg-muted/50 rounded text-text transition-colors">
                <ImageIcon className="w-6 h-6 text-primary mb-1" />
                <span className="text-[11px]">Pictures</span>
              </button>
              <button onClick={() => onInsertElement('shape')} className="flex flex-col items-center justify-center w-16 h-16 hover:bg-muted/50 rounded text-text transition-colors">
                <Shapes className="w-6 h-6 text-primary mb-1" />
                <span className="text-[11px]">Shapes</span>
              </button>
            </div>
          </>
        )}

        {activeTab === 'design' && (
          <div className="flex items-start gap-2 h-full">
            <button onClick={() => onChangeTheme('default')} className="flex flex-col items-center justify-center w-16 h-16 hover:bg-muted/50 rounded text-text transition-colors">
              <Palette className="w-6 h-6 text-primary mb-1" />
              <span className="text-[11px]">Themes</span>
            </button>
            <button onClick={() => onChangeTheme('layout')} className="flex flex-col items-center justify-center w-16 h-16 hover:bg-muted/50 rounded text-text transition-colors">
              <LayoutTemplate className="w-6 h-6 text-primary mb-1" />
              <span className="text-[11px]">Slide Size</span>
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
