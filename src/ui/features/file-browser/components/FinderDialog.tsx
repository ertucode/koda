import { useState, useEffect, ReactNode } from 'react'
import { useShortcuts } from '@/lib/hooks/useShortcuts'
import { Dialog } from '@/lib/components/dialog'
import { FileIcon, SearchIcon, FolderIcon } from 'lucide-react'
import { FileFinderTab } from './FileFinderTab'
import { StringFinderTab } from './StringFinderTab'
import { FolderFinderTab } from './FolderFinderTab'
import { dialogActions } from '../dialogStore'

export type FinderTab = 'files' | 'folders' | 'strings'

const MIN_WIDTH_FOR_PREVIEW = 900

export const FinderDialog = function FinderDialog(props: { initialTab?: FinderTab }) {
  const [activeTab, setActiveTab] = useState<FinderTab>('files')
  const [showPreview, setShowPreview] = useState(window.innerWidth >= MIN_WIDTH_FOR_PREVIEW)

  // Reset tab to initial when dialog opens
  useEffect(() => {
    if (props.initialTab) {
      setActiveTab(props.initialTab ?? 'files')
    }
  }, [props.initialTab])

  // Track window width for showing/hiding preview
  useEffect(() => {
    const handleResize = () => {
      setShowPreview(window.innerWidth >= MIN_WIDTH_FOR_PREVIEW)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle keyboard shortcuts
  useShortcuts([
    {
      key: { key: '1', metaKey: true },
      handler: e => {
        e?.preventDefault()
        setActiveTab('files')
      },
      enabledIn: () => true,
      label: 'Switch to Find File tab',
    },
    {
      key: { key: '2', metaKey: true },
      handler: e => {
        e?.preventDefault()
        setActiveTab('folders')
      },
      enabledIn: () => true,
      label: 'Switch to Find Folder tab',
    },
    {
      key: { key: '3', metaKey: true },
      handler: e => {
        e?.preventDefault()
        setActiveTab('strings')
      },
      enabledIn: () => true,
      label: 'Switch to Search in Files tab',
    },
    {
      key: 'Escape',
      handler: e => {
        e?.preventDefault()
        dialogActions.close()
      },
      enabledIn: () => true,
      label: 'Close finder dialog',
    },
  ])

  const tabs: {
    id: FinderTab
    label: React.ReactNode
    icon: React.ReactNode
    keys: string
  }[] = [
    {
      id: 'files',
      label: 'Find File',
      icon: <FileIcon className="w-4 h-4" />,
      keys: '⌘ 1',
    },
    {
      id: 'folders',
      label: 'Find Folder',
      icon: <FolderIcon className="w-4 h-4" />,
      keys: '⌘ 2',
    },
    {
      id: 'strings',
      label: 'Search in Files',
      icon: <SearchIcon className="w-4 h-4" />,
      keys: '⌘ 3',
    },
  ]

  return (
    <Dialog onClose={dialogActions.close} className="max-w-[90vw] w-full" style={{ height: '80vh' }}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Tab Bar */}
        <div role="tablist" className="tabs tabs-bordered mb-3 flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              onClick={() => setActiveTab(tab.id)}
              className={`tab gap-2 ${activeTab === tab.id ? 'tab-active' : ''}`}
            >
              <TabLabel label={tab.label} keys={tab.keys} icon={tab.icon} />
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-visible">
          {activeTab === 'files' && <FileFinderTab onClose={dialogActions.close} showPreview={showPreview} />}
          {activeTab === 'folders' && <FolderFinderTab onClose={dialogActions.close} showPreview={showPreview} />}
          {activeTab === 'strings' && <StringFinderTab onClose={dialogActions.close} />}
        </div>
      </div>
    </Dialog>
  )
}

function TabLabel(opts: { label: ReactNode; keys: string; icon: ReactNode }) {
  return (
    <>
      {opts.icon}
      {opts.label}
      <kbd className="kbd kbd-xs rounded-1 opacity-70">{opts.keys}</kbd>
    </>
  )
}
