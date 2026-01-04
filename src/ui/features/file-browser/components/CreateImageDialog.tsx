import { createFormDialog } from '@/lib/libs/form/createFormDialog'
import { ImageIcon } from 'lucide-react'
import z from 'zod'
import { directoryHelpers, directoryStore } from '../directoryStore/directory'

const INPUT_ID = 'create-image-dialog-name'
const DEFAULT_NAME = 'image.png'
const SELECTION_START = 5

export const CreateImageDialog = createFormDialog<{}, { name: string }>({
  schema: z.object({
    name: z.string().min(1, 'Name is required'),
  }),
  action: (body, _) =>
    directoryHelpers.createImageFromClipboard(body.name, directoryStore.getSnapshot().context.activeDirectoryId),
  getConfigs: () => [
    {
      field: 'name',
      label: 'Image file name (e.g., screenshot.png)',
      type: 'input',
      props: {
        id: INPUT_ID,
      },
    },
  ],
  getFormParams: () => ({
    defaultValues: {
      name: DEFAULT_NAME,
    },
  }),
  getTexts: () => ({
    title: 'Create Image from Clipboard',
    buttonLabel: 'Create',
    buttonIcon: ImageIcon,
  }),
  itemEffect: item => {
    if (!item) return
    const input = document.getElementById(INPUT_ID)
    if (!input) return
    if (!(input instanceof HTMLInputElement)) return

    input.selectionStart = 0
    input.selectionEnd = SELECTION_START
  },
})
