import { useState, useEffect, ReactNode } from 'react'
import { useShortcuts } from '@/lib/hooks/useShortcuts'
import { Dialog } from '@/lib/components/dialog'
import { SearchIcon, FolderSearchIcon } from 'lucide-react'
import { PathFinderTab } from './PathFinderTab'
import { StringFinderTab } from './StringFinderTab'
import { dialogActions } from '../dialogStore'
import { PathFinderType } from '@common/Contracts'

export type FinderTab = 'find' | 'strings'
export type FinderDialogProps = {
  initialTab?: FinderTab
  initialType?: PathFinderType
}

const MIN_WIDTH_FOR_PREVIEW = 900

export const FinderDialog = function FinderDialog(props: FinderDialogProps) {
  const [activeTab, setActiveTab] = useState<FinderTab>('find')
  const [showPreview, setShowPreview] = useState(window.innerWidth >= MIN_WIDTH_FOR_PREVIEW)

  // Reset tab to initial when dialog opens
  useEffect(() => {
    if (props.initialTab) {
      setActiveTab(props.initialTab ?? 'find')
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
      code: { code: 'Digit1', metaKey: true },
      handler: e => {
        e?.preventDefault()
        setActiveTab('find')
      },
      enabledIn: () => true,
      label: 'Switch to Find tab',
    },
    {
      code: { code: 'Digit2', metaKey: true },
      handler: e => {
        e?.preventDefault()
        setActiveTab('strings')
      },
      enabledIn: () => true,
      label: 'Switch to Search in Files tab',
    },
    {
      code: 'Escape',
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
      id: 'find',
      label: 'Find',
      icon: <FolderSearchIcon className="w-4 h-4" />,
      keys: '⌘ 1',
    },
    {
      id: 'strings',
      label: 'Search in Files',
      icon: <SearchIcon className="w-4 h-4" />,
      keys: '⌘ 2',
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
          {activeTab === 'find' && (
            <PathFinderTab onClose={dialogActions.close} showPreview={showPreview} initialType={props.initialType} />
          )}
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
