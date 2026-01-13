import { createFormDialog } from '@/lib/libs/form/createFormDialog'
import { FileTextIcon, ImageIcon, FileIcon } from 'lucide-react'
import z from 'zod'
import { directoryHelpers, directoryStore } from '../directoryStore/directory'
import type { CreateFromClipboardType, CustomPasteType } from '@common/Contracts'
import { getWindowElectron } from '@/getWindowElectron'
import { getActiveDirectory } from '../directoryStore/directoryPureHelpers'
import { mergeMaybeSlashed } from '@common/merge-maybe-slashed'
import type { LucideIcon } from 'lucide-react'
import { GenericError } from '@common/GenericError'

export type CreateFromClipboardDialogProps = {
  pasteType: NonNullable<CustomPasteType>
}

function getDefaultFileName(pasteType: NonNullable<CustomPasteType>): string {
  if (pasteType.type === 'image') {
    return 'image.png'
  }
  if (pasteType.type === 'text') {
    return 'clipboard.txt'
  }
  // base64 type
  const ext = pasteType.base64Type === 'unknown' ? 'bin' : pasteType.base64Type
  return `file.${ext}`
}

function getSelectionRange(pasteType: NonNullable<CustomPasteType>): [number, number] {
  const fileName = getDefaultFileName(pasteType)
  const dotIndex = fileName.lastIndexOf('.')
  return [0, dotIndex > 0 ? dotIndex : fileName.length]
}

function getInputLabel(pasteType: NonNullable<CustomPasteType>): string {
  if (pasteType.type === 'image') {
    return 'Image file name (e.g., screenshot.png)'
  }
  if (pasteType.type === 'text') {
    return 'Text file name (e.g., notes.txt)'
  }
  // base64
  const typeLabel = pasteType.base64Type === 'unknown' ? 'binary' : pasteType.base64Type.toUpperCase()
  return `${typeLabel} file name`
}

function getTitle(pasteType: NonNullable<CustomPasteType>): string {
  if (pasteType.type === 'image') {
    return 'Create Image from Clipboard'
  }
  if (pasteType.type === 'text') {
    return 'Create Text File from Clipboard'
  }
  // base64
  const typeLabel = pasteType.base64Type === 'unknown' ? 'File' : pasteType.base64Type.toUpperCase()
  return `Create ${typeLabel} from Clipboard`
}

function getButtonIcon(pasteType: NonNullable<CustomPasteType>): LucideIcon {
  if (pasteType.type === 'image') {
    return ImageIcon
  }
  if (pasteType.type === 'text') {
    return FileTextIcon
  }
  return FileIcon
}

function getClipboardType(pasteType: NonNullable<CustomPasteType>): CreateFromClipboardType {
  return pasteType.type
}

const INPUT_ID = 'create-from-clipboard-dialog-name'

export const CreateFromClipboardDialog = createFormDialog<CreateFromClipboardDialogProps, { name: string }>({
  schema: z.object({
    name: z.string().min(1, 'Name is required'),
  }),
  action: async (body, props) => {
    const context = getActiveDirectory(
      directoryStore.getSnapshot().context,
      directoryStore.getSnapshot().context.activeDirectoryId
    )
    if (context.directory.type !== 'path') {
      return GenericError.Message('Cannot create file in tags view')
    }

    const fullPath = mergeMaybeSlashed(context.directory.fullPath, body.name)
    const clipboardType = getClipboardType(props.pasteType)

    const result = await getWindowElectron().createFromClipboard(fullPath, clipboardType)

    if (result.success) {
      directoryHelpers.reload(context.directoryId).then(() => {
        directoryStore.send({
          type: 'setPendingSelection',
          name: body.name,
          directoryId: context.directoryId,
        })
      })
    }

    return result
  },
  getConfigs: (_, props) => [
    {
      field: 'name',
      label: props ? getInputLabel(props.pasteType) : 'File name',
      type: 'input',
      props: {
        id: INPUT_ID,
      },
    },
  ],
  getFormParams: props => ({
    defaultValues: {
      name: props ? getDefaultFileName(props.pasteType) : 'file',
    },
  }),
  getTexts: props => ({
    title: props ? getTitle(props.pasteType) : 'Create from Clipboard',
    buttonLabel: 'Create',
    buttonIcon: props ? getButtonIcon(props.pasteType) : FileIcon,
  }),
  itemEffect: item => {
    if (!item) return
    const input = document.getElementById(INPUT_ID)
    if (!input) return
    if (!(input instanceof HTMLInputElement)) return

    const [start, end] = getSelectionRange(item.pasteType)
    input.selectionStart = start
    input.selectionEnd = end
  },
})
