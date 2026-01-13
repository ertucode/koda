import { createFormDialog } from '@/lib/libs/form/createFormDialog'
import { FileText } from 'lucide-react'
import z from 'zod'
import { directoryHelpers, directoryStore } from '../directoryStore/directory'

const INPUT_ID = 'create-pdf-dialog-name'
const DEFAULT_NAME = 'document.pdf'
const SELECTION_START = 8

export const CreatePdfDialog = createFormDialog<{}, { name: string }>({
  schema: z.object({
    name: z.string().min(1, 'Name is required'),
  }),
  action: (body, _) =>
    directoryHelpers.createPdfFromClipboard(body.name, directoryStore.getSnapshot().context.activeDirectoryId),
  getConfigs: () => [
    {
      field: 'name',
      label: 'PDF file name (e.g., document.pdf)',
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
    title: 'Create PDF from Clipboard',
    buttonLabel: 'Create',
    buttonIcon: FileText,
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
