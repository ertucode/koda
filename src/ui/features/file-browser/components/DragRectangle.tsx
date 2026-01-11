import { useState, useEffect } from 'react'
import { useSelector } from '@xstate/store/react'
import { fileDragDropHandlers, fileDragDropStore } from '../fileDragDrop'

export function DragRectangle() {
  const startPosition = useSelector(fileDragDropStore, s =>
    s.context.isDragToSelect ? s.context.dragToSelectStartPosition : null
  )
  const [currentPosition, setCurrentPosition] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!startPosition) {
      setCurrentPosition(null)
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      setCurrentPosition({ x: e.clientX, y: e.clientY })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        fileDragDropHandlers.endDragToSelect()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [startPosition])

  if (!startPosition || !currentPosition) return null

  const left = Math.min(startPosition.x, currentPosition.x)
  const top = Math.min(startPosition.y, currentPosition.y)
  const width = Math.abs(currentPosition.x - startPosition.x)
  const height = Math.abs(currentPosition.y - startPosition.y)

  return (
    <div
      className="fixed pointer-events-none border border-blue-500 bg-blue-500/20 z-50"
      style={{ left, top, width, height }}
    />
  )
}
