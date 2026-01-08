import { getWindowElectron } from '@/getWindowElectron'
import React from 'react'

export async function captureDivAsBase64(element: HTMLElement, e: React.MouseEvent): Promise<string> {
  const clone = element.cloneNode(true) as HTMLElement

  clone.style.position = 'fixed'
  clone.style.top = '0'
  clone.style.left = '0'
  clone.style.pointerEvents = 'none' // avoid interference
  clone.style.visibility = 'hidden' // optional

  document.body.appendChild(clone)

  // Force layout immediately (no timeout needed)
  const { width, height } = clone.getBoundingClientRect()

  clone.style.visibility = 'visible'
  clone.style.top = e.clientY - height / 2 + 'px'
  clone.style.left = e.clientX - width / 2 + 'px'

  await new Promise(resolve => setTimeout(resolve, 10))

  const rect = clone.getBoundingClientRect()
  const base64 = await getWindowElectron().captureRect({
    width: rect.width,
    height: rect.height,
    x: rect.x,
    y: rect.y,
  })

  document.body.removeChild(clone)

  return base64
}
