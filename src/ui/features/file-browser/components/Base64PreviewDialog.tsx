import { Dialog } from '@/lib/components/dialog'
import { dialogActions } from '../dialogStore'

export function Base64PreviewDialog({ base64, fileName }: { base64: string; fileName: string }) {
  return (
    <Dialog title={`Base64 Content - ${fileName}`} onClose={dialogActions.close} className="w-[600px]">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-500">Base64 encoded content (without prefix):</p>
        <textarea
          readOnly
          className="textarea textarea-bordered w-full h-64 font-mono"
          style={{ fontSize: '9px', lineHeight: '1.3' }}
          value={base64}
        />
        <div className="flex justify-end">
          <button className="btn btn-sm btn-primary" onClick={dialogActions.close}>
            Close
          </button>
        </div>
      </div>
    </Dialog>
  )
}
