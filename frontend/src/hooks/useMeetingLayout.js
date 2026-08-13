import { useState, useEffect, useRef } from 'react'

/**
 * Calculates the optimal grid layout for video meeting participants.
 * Goal: Maximize the area of each video tile while maintaining aspect ratio.
 */
export function calculateLayout(containerWidth, containerHeight, count, gap = 16, aspectRatio = 16 / 9) {
  if (count === 0 || containerWidth === 0 || containerHeight === 0) {
    return { cols: 1, rows: 1, tileWidth: 0, tileHeight: 0 }
  }

  let bestArea = 0
  let bestCols = 1
  let bestRows = 1
  let bestTileWidth = 0
  let bestTileHeight = 0

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    
    // Subtract total gap space to find available space for tiles
    const totalGapWidth = (cols - 1) * gap
    const totalGapHeight = (rows - 1) * gap
    
    const availableWidth = Math.max(0, containerWidth - totalGapWidth)
    const availableHeight = Math.max(0, containerHeight - totalGapHeight)
    
    const maxTileWidth = availableWidth / cols
    const maxTileHeight = availableHeight / rows
    
    // Constrain by aspect ratio (only if more than 1 participant)
    let tileWidth = maxTileWidth
    let tileHeight = maxTileHeight
    
    if (count > 1) {
      tileHeight = tileWidth / aspectRatio
      // If the height exceeds available height, constrain by height instead
      if (tileHeight > maxTileHeight) {
        tileHeight = maxTileHeight
        tileWidth = tileHeight * aspectRatio
      }
    }
    
    const area = tileWidth * tileHeight
    
    if (area > bestArea) {
      bestArea = area
      bestCols = cols
      bestRows = rows
      bestTileWidth = tileWidth
      bestTileHeight = tileHeight
    }
  }

  return {
    cols: bestCols,
    rows: bestRows,
    tileWidth: bestTileWidth,
    tileHeight: bestTileHeight
  }
}

/**
 * Hook to manage container sizing and layout calculation.
 */
export default function useMeetingLayout(participantCount, gap = 16, aspectRatio = 16 / 9) {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
    }

    updateDimensions()

    const observer = new ResizeObserver(() => {
      // Use requestAnimationFrame to avoid ResizeObserver loop limit exceeded error
      window.requestAnimationFrame(updateDimensions)
    })
    
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const layout = calculateLayout(dimensions.width, dimensions.height, participantCount, gap, aspectRatio)

  return {
    containerRef,
    ...layout
  }
}
