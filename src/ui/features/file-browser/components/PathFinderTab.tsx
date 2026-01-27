import { useState, useEffect, useRef, useCallback } from 'react'
import { useSelector } from '@xstate/store/react'
import { getWindowElectron } from '@/getWindowElectron'
import { FolderIcon, XIcon, FileIcon, SettingsIcon } from 'lucide-react'
import { errorResponseToMessage } from '@common/GenericError'
import {
  GetFilesAndFoldersInDirectoryItem,
  PathFinderOptions,
  PathFinderResult,
  PathFinderType,
} from '@common/Contracts'
import { FilePreview } from './FilePreview'
import { Alert } from '@/lib/components/alert'
import { directoryStore, directoryHelpers, selectDirectory } from '../directoryStore/directory'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { PathHelpers } from '@common/PathHelpers'

type PathFinderTabProps = {
  onClose: () => void
  showPreview: boolean
  initialType?: PathFinderType
}

const DEFAULT_OPTIONS: PathFinderOptions = {
  type: 'file',
  maxDepth: 0,
  respectGitIgnore: true,
  ignoreHidden: true,
  ignoreVcs: true,
  extensions: [],
  excludePatterns: [],
  caseSensitive: false,
}

export function PathFinderTab({ onClose, showPreview, initialType }: PathFinderTabProps) {
  const activeDirectoryId = useSelector(directoryStore, s => s.context.activeDirectoryId)
  const directory = useSelector(directoryStore, selectDirectory(activeDirectoryId))
  const [query, setQuery] = useState('')
  const [filteredItems, setFilteredItems] = useState<PathFinderResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [_isLoading, setIsLoading] = useState(false)
  const isLoading = useDebounce(_isLoading, 100)
  const [error, setError] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(true)
  const [options, setOptions] = useState<PathFinderOptions>({
    ...DEFAULT_OPTIONS,
    type: initialType ?? DEFAULT_OPTIONS.type,
  })

  // For folder preview
  const [folderContents, setFolderContents] = useState<GetFilesAndFoldersInDirectoryItem[]>([])
  const [isLoadingContents, setIsLoadingContents] = useState(false)

  // For extension/exclude pattern inputs (comma-separated)
  const [extensionInput, setExtensionInput] = useState('')
  const [excludeInput, setExcludeInput] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const lastCallIndex = useRef(0)

  // Load items when dialog opens or query/options changes
  useEffect(() => {
    const searchItems = async () => {
      setIsLoading(true)
      setError(null)
      const callIdx = lastCallIndex.current + 1
      lastCallIndex.current = callIdx
      try {
        if (directory.type !== 'path') return
        const result = await getWindowElectron().fuzzyPathFinder(directory.fullPath, query, options)
        if (result.success) {
          setFilteredItems(result.data)
          setSelectedIndex(0)
        } else {
          if (callIdx === lastCallIndex.current)
            setError(errorResponseToMessage(result.error) || 'Failed to load items')
        }
      } catch (err) {
        if (callIdx === lastCallIndex.current) setError(err instanceof Error ? err.message : 'Failed to load items')
      } finally {
        if (callIdx === lastCallIndex.current) setIsLoading(false)
      }
    }

    searchItems()
  }, [directory, query, options])

  // Load folder contents when selection changes (for folder preview)
  useEffect(() => {
    if (!showPreview) return

    const selectedItem = filteredItems[selectedIndex]
    if (!selectedItem || selectedItem.type !== 'folder') {
      setFolderContents([])
      return
    }

    const loadContents = async () => {
      setIsLoadingContents(true)
      try {
        const fullPath = directoryHelpers.getFullPath(selectedItem.path, activeDirectoryId)
        const result = await getWindowElectron().getFilesAndFoldersInDirectory(fullPath)
        if (result.success) {
          setFolderContents(result.data)
        } else {
          console.error('Failed to load folder contents:', result.error)
          setFolderContents([])
        }
      } catch (err) {
        console.error('Failed to load folder contents:', err)
        setFolderContents([])
      } finally {
        setIsLoadingContents(false)
      }
    }

    loadContents()
  }, [showPreview, filteredItems, selectedIndex, activeDirectoryId])

  // Reset and focus when dialog opens
  useEffect(() => {
    setQuery('')
    setSelectedIndex(0)
    setError(null)
    setFolderContents([])
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const handleSelect = useCallback(
    (item: PathFinderResult) => {
      if (item.type === 'file') {
        directoryHelpers.openFile(item.path, activeDirectoryId)
      } else {
        directoryHelpers.cdFull(directoryHelpers.getFullPath(item.path, activeDirectoryId), activeDirectoryId)
      }
      onClose()
    },
    [activeDirectoryId, onClose]
  )

  const handleOpenContainingFolder = useCallback(
    (itemPath: string) => {
      const lastSlashIndex = itemPath.lastIndexOf('/')
      if (lastSlashIndex === -1) return

      const dirPath = itemPath.slice(0, lastSlashIndex)
      directoryHelpers.cdFull(directoryHelpers.getFullPath(dirPath, activeDirectoryId), activeDirectoryId)
      onClose()
    },
    [activeDirectoryId, onClose]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || (e.key === 'j' && e.ctrlKey)) {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1))
    } else if (e.key === 'ArrowUp' || (e.key === 'k' && e.ctrlKey)) {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex])
      }
    } else if (e.key === 'o' && e.ctrlKey) {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        handleOpenContainingFolder(filteredItems[selectedIndex].path)
      }
    }
  }

  const getNameAndParent = (itemPath: string) => {
    const lastSlashIndex = itemPath.lastIndexOf('/')
    if (lastSlashIndex === -1) {
      return { name: itemPath, parent: '' }
    }
    return {
      name: itemPath.slice(lastSlashIndex + 1),
      parent: itemPath.slice(0, lastSlashIndex),
    }
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text

    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)

    if (index === -1) return text

    return (
      <>
        {text.slice(0, index)}
        <span className="bg-yellow-300 text-black">{text.slice(index, index + query.length)}</span>
        {text.slice(index + query.length)}
      </>
    )
  }

  const updateOption = <K extends keyof PathFinderOptions>(key: K, value: PathFinderOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  // Parse comma-separated extensions input and update options
  const handleExtensionsChange = (value: string) => {
    setExtensionInput(value)
    const extensions = value
      .split(',')
      .map(ext => ext.trim().replace(/^\./, ''))
      .filter(ext => ext.length > 0)
    updateOption('extensions', extensions)
  }

  // Parse comma-separated exclude patterns input and update options
  const handleExcludeChange = (value: string) => {
    setExcludeInput(value)
    const patterns = value
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0)
    updateOption('excludePatterns', patterns)
  }

  const selectedItem = filteredItems[selectedIndex]
  const selectedFilePath = selectedItem ? directoryHelpers.getFullPath(selectedItem.path, activeDirectoryId) : null
  const selectedFileExt = selectedItem?.type === 'file' ? PathHelpers.getDottedExtension(selectedItem.path) : null
  const selectedFolderName = selectedItem?.type === 'folder' ? getNameAndParent(selectedItem.path).name : null

  return (
    <div className="flex gap-3 h-full overflow-visible">
      <div className="flex flex-col gap-3 flex-1 min-w-0 h-full">
        {/* Input section */}
        <div className="relative flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type to search ${options.type === 'all' ? 'files and folders' : options.type === 'file' ? 'files' : 'folders'}...`}
            className="input input-bordered w-full text-sm focus:outline-offset-[-2px] pr-16"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 p-1">
                <XIcon className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="btn btn-ghost btn-xs p-1"
              title="Toggle options"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Options section */}
        {showOptions && (
          <div className="flex-shrink-0 border border-gray-200 rounded p-3 space-y-3 bg-base-200/50">
            {/* Type selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20">Type:</span>
              <div className="join">
                {(['file', 'folder', 'all'] as PathFinderType[]).map(type => (
                  <button
                    key={type}
                    className={`join-item btn btn-xs ${options.type === type ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => updateOption('type', type)}
                  >
                    {type === 'file' ? 'Files' : type === 'folder' ? 'Folders' : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Max depth */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20">Max depth:</span>
              <input
                type="number"
                min="0"
                value={options.maxDepth}
                onChange={e => updateOption('maxDepth', parseInt(e.target.value) || 0)}
                onKeyDown={handleKeyDown}
                className="input input-bordered input-xs w-20"
                placeholder="0 = unlimited"
              />
              <span className="text-xs text-gray-400">(0 = unlimited)</span>
            </div>

            {/* Extensions filter */}
            {(options.type === 'file' || options.type === 'all') && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20">Extensions:</span>
                <input
                  type="text"
                  value={extensionInput}
                  onChange={e => handleExtensionsChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ts, tsx, json (comma-separated)"
                  className="input input-bordered input-xs flex-1"
                />
              </div>
            )}

            {/* Exclude patterns */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-20">Exclude:</span>
              <input
                type="text"
                value={excludeInput}
                onChange={e => handleExcludeChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="node_modules, dist (comma-separated)"
                className="input input-bordered input-xs flex-1"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.respectGitIgnore}
                  onChange={e => updateOption('respectGitIgnore', e.target.checked)}
                  className="checkbox checkbox-xs"
                />
                <span className="text-xs">Respect .gitignore</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.ignoreHidden}
                  onChange={e => updateOption('ignoreHidden', e.target.checked)}
                  className="checkbox checkbox-xs"
                />
                <span className="text-xs">Hide hidden</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.ignoreVcs}
                  onChange={e => updateOption('ignoreVcs', e.target.checked)}
                  className="checkbox checkbox-xs"
                />
                <span className="text-xs">Hide .git</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.caseSensitive ?? false}
                  onChange={e => updateOption('caseSensitive', e.target.checked)}
                  className="checkbox checkbox-xs"
                />
                <span className="text-xs">Case sensitive</span>
              </label>
            </div>
          </div>
        )}

        {/* Item list section */}
        <div className="flex-1 min-h-0 border border-gray-200 rounded overflow-hidden flex flex-col">
          {isLoading && <div className="text-center text-gray-500 py-4">Loading...</div>}

          {error && <Alert className="m-6">{error}</Alert>}

          {!isLoading && !error && (
            <div ref={listRef} className="overflow-y-auto flex-1">
              {filteredItems.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {query ? 'No matches found' : 'No items in directory'}
                </div>
              ) : (
                <div>
                  {filteredItems.map((item, index) => {
                    const { name, parent } = getNameAndParent(item.path)
                    return (
                      <div
                        key={item.path}
                        data-index={index}
                        onClick={() => handleSelect(item)}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-base-content/10 ${
                          index === selectedIndex ? 'bg-base-content/10' : ''
                        }`}
                      >
                        {item.type === 'folder' ? (
                          <FolderIcon className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <FileIcon className="w-4 h-4 text-gray-400" />
                        )}
                        <div className="flex gap-3 items-center min-w-0 flex-1">
                          <span className="text-xs truncate">{highlightMatch(name, query)}</span>
                          {parent && <span className="text-xs text-gray-500 truncate">{parent}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 justify-center flex-shrink-0">
          <div>
            <kbd className="kbd kbd-xs">Up/Down</kbd> or <kbd className="kbd kbd-xs">Ctrl+J/K</kbd> to navigate
          </div>
          <div>
            <kbd className="kbd kbd-xs">Enter</kbd> to select
          </div>
          <div>
            <kbd className="kbd kbd-xs">Ctrl+O</kbd> to open containing folder
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="w-[400px] h-full border-gray-200 flex flex-col flex-shrink-0">
        {showPreview && selectedItem && (
          <>
            {selectedItem.type === 'file' && selectedFilePath && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <FilePreview filePath={selectedFilePath} isFile={true} fileSize={null} fileExt={selectedFileExt} />
              </div>
            )}
            {selectedItem.type === 'folder' && (
              <>
                {/* Folder header */}
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 flex-shrink-0">
                  <FolderIcon className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium truncate">{selectedFolderName}</span>
                  <span className="text-xs text-gray-400">{folderContents.length} items</span>
                </div>

                {/* Folder contents */}
                <div className="flex-1 min-h-0 overflow-auto mt-2">
                  {isLoadingContents ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <span className="loading loading-spinner size-4" />
                    </div>
                  ) : folderContents.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">Empty folder</div>
                  ) : (
                    <div className="space-y-0.5">
                      {folderContents.slice(0, 50).map(folderItem => (
                        <div key={folderItem.name} className="flex items-center gap-2 px-2 py-1 text-xs">
                          {folderItem.type === 'dir' ? (
                            <FolderIcon className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                          ) : (
                            <FileIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="truncate flex-1">{folderItem.name}</span>
                          {folderItem.type === 'file' && folderItem.sizeStr && (
                            <span className="text-gray-400 flex-shrink-0">{folderItem.sizeStr}</span>
                          )}
                        </div>
                      ))}
                      {folderContents.length > 50 && (
                        <div className="text-xs text-gray-400 px-2 py-1">
                          ...and {folderContents.length - 50} more items
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
