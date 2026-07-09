import { useEffect, useState } from 'react'
import Slides from '../Slides'
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'

const blankSlide = () => ({
  title: 'Click to add title',
  content: 'Click to add text',
  notes: '',
  elements: [],
  layout: 'title'
})

/**
 * Slides.jsx receives both `slides` and `setSlides` as props (it updates the
 * parent's array directly rather than owning a local copy), plus it also
 * listens for `receive-slides-list` itself to stay in sync with other tabs.
 */
export default function PresentationSection({ workspaceId, activeFile, onDirtyChange }) {
  const channel = useLocalCollabChannel(workspaceId, `presentation:${activeFile?.id || 'default'}`)

  const [slides, setSlidesState] = useState([blankSlide()])
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPresenting, setIsPresenting] = useState(false)

  useEffect(() => {
    channel.on('receive-slides-list', setSlidesState)
    return () => channel.off('receive-slides-list', setSlidesState)
  }, [channel])

  const setSlides = (next) => {
    const resolved = typeof next === 'function' ? next(slides) : next
    setSlidesState(resolved)
    onDirtyChange?.(true)
    channel.emit('update-slides-list', { roomId: workspaceId, slides: resolved })
    window.setTimeout(() => onDirtyChange?.(false), 300)
  }

  const handleSlideUpdate = (field, value) => {
    setSlides((current) =>
      current.map((slide, index) => (index === activeSlide ? { ...slide, [field]: value } : slide))
    )
  }

  const addSlide = () => {
    setSlides((current) => [...current, blankSlide()])
    setActiveSlide(slides.length)
  }

  return (
    <Slides
      slides={slides}
      setSlides={setSlides}
      activeSlide={activeSlide}
      setActiveSlide={setActiveSlide}
      isPresenting={isPresenting}
      setIsPresenting={setIsPresenting}
      addSlide={addSlide}
      handleSlideUpdate={handleSlideUpdate}
      roomId={workspaceId}
      socket={channel}
      activeUsers={[]}
    />
  )
}
