import { useState, useEffect, useRef } from 'react'
import { useSelector } from '@xstate/store/react'
import { fileDragDropHandlers, fileDragDropStore } from '../fileDragDrop'
import { DirectoryId } from '../directoryStore/DirectoryBase'

export function DragRectangle({ directoryId }: { directoryId: DirectoryId }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startPosition = useSelector(fileDragDropStore, s =>
    s.context.isDragToSelect && s.context.dragToSelectDirectoryId === directoryId ? s.context.dragToSelectStartPosition : null
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

  const containerRect = containerRef.current?.getBoundingClientRect()

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {startPosition && currentPosition && containerRect && (
        <>
          {(() => {
            const relativeStartX = startPosition.x - containerRect.left
            const relativeStartY = startPosition.y - containerRect.top
            const relativeCurrentX = currentPosition.x - containerRect.left
            const relativeCurrentY = currentPosition.y - containerRect.top

            const left = Math.min(relativeStartX, relativeCurrentX)
            const top = Math.min(relativeStartY, relativeCurrentY)
            const width = Math.abs(relativeCurrentX - relativeStartX)
            const height = Math.abs(relativeCurrentY - relativeStartY)

            return (
              <div
                className="absolute pointer-events-none border border-blue-500 bg-blue-500/20 z-50"
                style={{ left, top, width, height }}
              />
            )
          })()}
        </>
      )}
    </div>
  )
}
