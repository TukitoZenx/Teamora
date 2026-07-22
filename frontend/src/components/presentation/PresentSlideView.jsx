import { useMemo } from 'react'

const textStyle = (el) => ({
  fontFamily: el.fontFamily || 'Inter, sans-serif',
  fontSize: el.fontSize || '16px',
  fontWeight: el.fontWeight || 'normal',
  fontStyle: el.fontStyle || 'normal',
  textDecoration: el.textDecoration || 'none',
  textAlign: el.textAlign || 'left',
  color: el.color || '#000000',
  lineHeight: el.lineHeight || '1.2',
  letterSpacing: el.letterSpacing || 'normal'
})

const boxStyle = (el) => ({
  position: 'absolute',
  left: el.x ?? 0,
  top: el.y ?? 0,
  width: el.width ?? 0,
  height: el.height ?? 0,
  zIndex: el.zIndex ?? 10,
  transform: `rotate(${el.rotation || 0}deg)`,
  opacity: el.opacity ?? 1,
  boxShadow: el.shadow || 'none',
  borderRadius: el.borderRadius != null && el.borderRadius !== '' ? `${el.borderRadius}px` : '0px',
  borderWidth: el.borderWidth ? `${el.borderWidth}px` : '0px',
  borderStyle: el.borderWidth ? 'solid' : 'none',
  borderColor: el.borderWidth ? el.borderColor || el.color || 'transparent' : 'transparent',
  background:
    el.type === 'textbox' || el.type === 'text' || el.type === 'shape' || el.type === 'icon'
      ? el.fill || 'transparent'
      : undefined,
  overflow: 'hidden',
  boxSizing: 'border-box'
})

function ElementContent({ el }) {
  if (el.type === 'image') {
    return <img src={el.src} alt="" className="pointer-events-none h-full w-full object-cover" draggable={false} />
  }

  if (el.type === 'icon') {
    return (
      <div
        className="flex h-full w-full items-center justify-center select-none"
        style={{ fontSize: el.fontSize || Math.min(el.width || 64, el.height || 64) * 0.55 }}
      >
        {el.icon || el.text || '★'}
      </div>
    )
  }

  if (el.type === 'shape') {
    const hasText = Boolean(
      el.text &&
      String(el.text)
        .replace(/<[^>]+>/g, '')
        .trim()
    )
    return (
      <div className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden p-2">
        {hasText ? (
          <div
            className="w-full whitespace-pre-wrap break-words text-center"
            style={textStyle({ ...el, textAlign: el.textAlign || 'center' })}
            dangerouslySetInnerHTML={{ __html: el.text }}
          />
        ) : null}
      </div>
    )
  }

  if (el.type === 'group') {
    return (
      <div className="pointer-events-none relative h-full w-full">
        {(el.children || []).map((child) => (
          <div key={child.id || `${child.x}-${child.y}`} style={boxStyle(child)}>
            <ElementContent el={child} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="h-full w-full overflow-hidden whitespace-pre-wrap break-words p-2"
      style={textStyle(el)}
      dangerouslySetInnerHTML={{ __html: el.text || '' }}
    />
  )
}

export default function PresentSlideView({ slide, theme, presentScale = 1, revision = 0, appDark = false }) {
  const elements = useMemo(() => {
    const list = Array.isArray(slide?.elements) ? [...slide.elements] : []
    list.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide?.elements, slide?.id, revision])

  const gradient = theme?.gradient || (appDark ? 'from-slate-900 to-slate-950' : 'from-white to-slate-50')
  const accent = theme?.accent || 'from-primary to-indigo-500'

  return (
    <div className={`flex h-full w-full items-center justify-center overflow-hidden ${appDark ? 'dark' : ''}`}>
      <div
        key={`present-slide-${slide?.id || 'x'}-r${revision}-${appDark ? 'd' : 'l'}`}
        className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${gradient}`}
        style={{
          transform: `scale(${presentScale})`,
          transformOrigin: 'center',
          width: 850,
          maxWidth: 850,
          height: (850 * 9) / 16,
          aspectRatio: '16 / 9'
        }}
      >
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />

        {elements.map((el) => (
          <div key={el.id} style={boxStyle(el)}>
            <ElementContent el={el} />
          </div>
        ))}

        {elements.length === 0 && (
          <div
            className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center opacity-50 ${
              appDark ? 'text-slate-400' : 'text-muted'
            }`}
          >
            <h1 className="mb-4 text-4xl font-bold">{slide?.title || 'Blank Slide'}</h1>
          </div>
        )}
      </div>
    </div>
  )
}
