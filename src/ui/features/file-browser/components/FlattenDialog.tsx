import { useState } from 'react'
import { LayersIcon } from 'lucide-react'
import { Dialog } from '@/lib/components/dialog'
import { Button } from '@/lib/components/button'
import { GetFilesAndFoldersInDirectoryItem } from '@common/Contracts'
import { dialogActions } from '../dialogStore'
import { DirectoryId } from '../directoryStore/DirectoryBase'
import { startMoveItems } from '../moveItems'

export function FlattenDialog({
  items,
  directoryId,
}: {
  items: GetFilesAndFoldersInDirectoryItem[]
  directoryId: DirectoryId
}) {
  const [depth, setDepth] = useState<number | 'infinity'>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async () => {
    setIsSubmitting(true)
    const result = await startMoveItems(items, directoryId, 'flatten', depth)
    setIsSubmitting(false)
    if (result.success) dialogActions.close()
  }

  return (
    <Dialog
      title={`Flatten ${items.length === 1 ? items[0].name : `${items.length} folders`}`}
      onClose={dialogActions.close}
      footer={
        <>
          <Button onClick={dialogActions.close} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={submit} disabled={isSubmitting} icon={LayersIcon} className="btn-primary">
            {isSubmitting ? 'Flattening…' : 'Flatten'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-base-content/70">
          Remove the selected folders and the chosen number of nested folder levels. Their contents will appear in each selected folder&apos;s parent.
        </p>
        <div className="flex items-end gap-2">
          <label className="form-control flex-1">
            <span className="label-text mb-1">Levels</span>
            <input
              className="input input-bordered w-full"
              type="number"
              min={1}
              step={1}
              disabled={depth === 'infinity'}
              value={depth === 'infinity' ? '' : depth}
              onChange={event => setDepth(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
            />
          </label>
          <Button
            onClick={() => setDepth(current => current === 'infinity' ? 1 : 'infinity')}
            className={depth === 'infinity' ? 'btn-primary' : undefined}
          >
            ∞ Infinity
          </Button>
        </div>
        <p className="text-xs text-base-content/60">
          The operation will stop without changing anything if any names conflict. You can undo it from the task panel.
        </p>
      </div>
    </Dialog>
  )
}
