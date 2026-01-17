import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import { sportForContextMenu } from '../functions/spotForContextMenu'

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return node.toString()
  if (React.isValidElement(node)) {
    return React.Children.toArray((node.props as any).children)
      .map(extractText)
      .join(' ')
  }
  return ''
}

export type ContextMenuProps<T> = {
  children: React.ReactNode
  menu: ReturnType<typeof useContextMenu<T>>
}

export function ContextMenu<T>({ children, menu }: ContextMenuProps<T>) {
  const [position, setPosition] = useState(menu.position)
  useLayoutEffect(() => {
    if (!menu || !menu.position || !menu.ref.current) return

    const dialog = menu.ref.current
    const { innerWidth, innerHeight } = window
    const rect = dialog.getBoundingClientRect()

    let x = menu.position.x
    let y = menu.position.y

    // Right overflow
    if (x + rect.width > innerWidth) {
      x = innerWidth - rect.width - 8
    }

    // Bottom overflow
    if (y + rect.height > innerHeight) {
      y = innerHeight - rect.height - 8
    }

    // Left / Top safety
    x = Math.max(8, x)
    y = Math.max(8, y)

    if (x !== menu.position.x || y !== menu.position.y) {
      setPosition(prev => (prev ? { ...prev, x, y } : { x, y }))
    } else {
      setPosition(menu.position)
    }
  }, [menu.position])

  return (
    <div ref={menu.ref} className="fixed z-50" style={{ top: position?.y, left: position?.x }}>
      <ContextMenuContext.Provider value={menu}>{children}</ContextMenuContext.Provider>
    </div>
  )
}

type NormalContextMenuItem = {
  view: React.ReactNode
  onClick?: () => void
  submenu?: (NormalContextMenuItem | false | null | undefined)[]
}
export type ContextMenuItem = NormalContextMenuItem | { isSeparator: true }

export type ContextMenuListProps = {
  items: (ContextMenuItem | false | null | undefined)[]
}

export function ContextMenuList({ items }: ContextMenuListProps) {
  const menu = useContext(ContextMenuContext)
  const [query, setQuery] = useState('')
  const baseItems = items.filter((i): i is ContextMenuItem => !!i)
  const fuseItems = baseItems.filter(item => !('isSeparator' in item)) as NormalContextMenuItem[]
  const fuseData = fuseItems.map((item, idx) => ({ item, idx, searchText: extractText(item.view) }))
  const fuse = new Fuse(fuseData, { keys: ['searchText'] })
  const filteredItems = query ? fuse.search(query).map(result => result.item.item) : baseItems

  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null)
  const [selectedSubmenuIndex, setSelectedSubmenuIndex] = useState(0)
  const ulRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const detailsRefs = useRef<(HTMLDetailsElement | null)[]>([])

  // Filter out separators for navigation
  const navigableItems = filteredItems.filter(item => !('isSeparator' in item)) as NormalContextMenuItem[]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl modifier
      if (!e.ctrlKey && e.key !== 'Enter') return

      const currentItem = navigableItems[selectedIndex]
      const isInSubmenu = openSubmenuIndex !== null

      switch (e.key) {
        case 'j': // Navigate down
          e.preventDefault()
          if (isInSubmenu && currentItem?.submenu) {
            const filteredSubItems = currentItem.submenu.filter((i): i is NormalContextMenuItem => !!i)
            setSelectedSubmenuIndex(prev => Math.min(prev + 1, filteredSubItems.length - 1))
          } else {
            setSelectedIndex(prev => Math.min(prev + 1, navigableItems.length - 1))
          }
          break

        case 'k': // Navigate up
          e.preventDefault()
          if (isInSubmenu) {
            setSelectedSubmenuIndex(prev => Math.max(prev - 1, 0))
          } else {
            setSelectedIndex(prev => Math.max(prev - 1, 0))
          }
          break

        case 'l': // Navigate right (open submenu)
        case 'Enter': // Navigate right (open submenu)
          e.preventDefault()
          if (openSubmenuIndex !== null && currentItem.submenu) {
            // Execute submenu item action
            const filteredSubItems = currentItem.submenu.filter((i): i is NormalContextMenuItem => !!i)
            const subItem = filteredSubItems[selectedSubmenuIndex]
            if (subItem) {
              subItem.onClick?.()
              menu.close()
            }
          } else if (currentItem.submenu) {
            // Open submenu
            setOpenSubmenuIndex(selectedIndex)
            setSelectedSubmenuIndex(0)
            const detailsElement = detailsRefs.current[selectedIndex]
            if (detailsElement) {
              detailsElement.open = true
            }
          } else {
            // Execute action
            currentItem.onClick?.()
            menu.close()
          }
          break

        case 'h': // Navigate left (close submenu)
          e.preventDefault()
          if (isInSubmenu) {
            setOpenSubmenuIndex(null)
            setSelectedSubmenuIndex(0)
            // Close the details element
            const detailsElement = detailsRefs.current[selectedIndex]
            if (detailsElement) {
              detailsElement.open = false
            }
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedIndex, openSubmenuIndex, selectedSubmenuIndex, navigableItems, menu])

  // Reset refs array
  useEffect(() => {
    detailsRefs.current = detailsRefs.current.slice(0, filteredItems.length)
  }, [filteredItems.length])

  let navigableIndex = -1

  return (
    <div className="menu menu-sm bg-base-200 rounded-box w-56">
      <div className="relative p-2">
        <input
          ref={inputRef}
          className="input input-sm w-full pr-8"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              if (query) {
                e.preventDefault()
                e.stopPropagation()
                setQuery('')
              }
            }
          }}
          placeholder="Search..."
        />
        {query && (
          <button
            className="absolute right-2 top-1/2 transform -translate-y-1/2 btn btn-xs btn-ghost"
            onClick={() => setQuery('')}
          >
            ×
          </button>
        )}
      </div>
      <ul ref={ulRef}>
        {filteredItems.map((item, idx) => {
          if ('isSeparator' in item) return <li key={idx}></li>

          navigableIndex++
          const currentNavigableIndex = navigableIndex
          const isSelected = currentNavigableIndex === selectedIndex && openSubmenuIndex === null

          if (item.submenu) {
            const filteredSubItems = item.submenu.filter((i): i is NormalContextMenuItem => !!i)
            const isSubmenuOpen = openSubmenuIndex === currentNavigableIndex

            return (
              <li key={idx}>
                <details
                  ref={el => {
                    detailsRefs.current[currentNavigableIndex] = el
                  }}
                >
                  <summary className={isSelected ? 'bg-base-300' : ''}>{item.view}</summary>
                  <ul>
                    {filteredSubItems.map((subItem, subIdx) => {
                      const isSubItemSelected = isSubmenuOpen && subIdx === selectedSubmenuIndex
                      return (
                        <li key={subIdx}>
                          <a
                            className={isSubItemSelected ? 'bg-base-300' : ''}
                            onClick={() => {
                              subItem.onClick?.()
                              menu.close()
                            }}
                          >
                            {subItem.view}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </details>
              </li>
            )
          }
          return (
            <li key={idx}>
              <a
                className={isSelected ? 'bg-base-300' : ''}
                onClick={() => {
                  item.onClick?.()
                  menu.close()
                }}
              >
                {item.view}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type ContextMenuState<T> = {
  position: { x: number; y: number }
  item: T
  element: HTMLElement
}
export function useContextMenu<T>() {
  const [state, setState] = useState<ContextMenuState<T> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!state?.element.contains(e.target as Node) && !ref.current?.contains(e.target as Node)) {
        setState(null)
      }
    }

    const keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setState(null)
      }
    }

    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    document.addEventListener('keydown', keydownHandler)

    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
      document.removeEventListener('keydown', keydownHandler)
    }
  }, [state, ref])

  return {
    isOpen: state != null,
    onRightClick: (e: React.MouseEvent, item: T) => {
      e.preventDefault()
      setState({
        position: { x: e.clientX, y: e.clientY },
        item,
        element: e.currentTarget as HTMLElement,
      })
    },
    showWithElement: (element: HTMLElement, item: T) => {
      setState({
        position: sportForContextMenu(element),
        item,
        element,
      })
    },
    item: state?.item,
    position: state?.position,
    ref,
    close: () => setState(null),
  }
}

const ContextMenuContext = createContext<ReturnType<typeof useContextMenu<any>>>(
  {} as ReturnType<typeof useContextMenu>
)
