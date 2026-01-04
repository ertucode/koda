import { createFormDialog } from '@/lib/libs/form/createFormDialog'
import { FolderInputIcon } from 'lucide-react'
import z from 'zod'
import { directoryHelpers, directoryStore } from '../directoryStore/directory'
import { GenericError } from '@common/GenericError'
import { getWindowElectron } from '@/getWindowElectron'
import { ArchiveTypes } from '@common/ArchiveTypes'
import { ArchiveEntry } from '@common/Contracts'
import { toast } from '@/lib/components/toast'

type UnarchiveDialogItem = {
  archiveFilePath: string
  suggestedName: string
  archiveType: string
  // Add metadata directly to item
  _metadata?: {
    hasSingleItem: boolean
    singleItemName?: string
  }
}

export const UnarchiveDialog = createFormDialog<
  UnarchiveDialogItem,
  { targetName: string; extractionMode: 'folder' | 'single-item' }
>({
  schema: z.object({
    targetName: z.string().min(1, 'Name is required'),
    extractionMode: z.enum(['folder', 'single-item']),
  }),
  asyncInitialData: async item => {
    if (!item?.archiveFilePath || !item?.archiveType) {
      return {
        targetName: item?.suggestedName || 'extracted',
        extractionMode: 'folder' as const,
      }
    }

    try {
      const result = await getWindowElectron().readArchiveContents(
        item.archiveFilePath,
        item.archiveType as ArchiveTypes.ArchiveType
      )

      if (!result.success) {
        toast.show(result)
        return
      }
      const singleItem = getSingleItem(result.data)
      if (!singleItem) return
      const singleItemName = singleItem.name.replace(/\/$/, '') // Remove trailing slash if directory

      // Store metadata in item for getConfigs to access
      item._metadata = {
        hasSingleItem: true,
        singleItemName,
      }

      // Default to extracting the single item directly
      return {
        targetName: singleItemName,
        extractionMode: 'single-item' as const,
      }
    } catch (error) {
      // If we can't read contents, fall back to folder mode
      console.warn('Failed to read archive contents:', error)
    }

    item._metadata = {
      hasSingleItem: false,
    }

    return {
      targetName: item?.suggestedName || 'extracted',
      extractionMode: 'folder' as const,
    }
  },
  action: async (body, item) => {
    if (!item?.archiveFilePath) {
      return Promise.resolve(GenericError.Message('No archive file selected'))
    }
    return directoryHelpers.extractArchive(
      item.archiveFilePath,
      body.targetName,
      item.archiveType,
      directoryStore.getSnapshot().context.activeDirectoryId,
      body.extractionMode
    )
  },
  getConfigs: (hookForm, item) => {
    const extractionMode = hookForm.getValues('extractionMode')

    const configs: any[] = []

    // Only show extraction mode selector if archive has single item
    if (item?._metadata?.hasSingleItem) {
      configs.push({
        field: 'extractionMode',
        label: 'Extraction mode',
        type: 'select',
        options: [
          { value: 'single-item', label: 'Extract the only item' },
          { value: 'folder', label: 'Extract to a folder' },
        ],
      })
    }

    configs.push({
      field: 'targetName',
      label: extractionMode === 'single-item' ? 'Item name' : 'Folder name',
      type: 'input',
    })

    return configs
  },
  getFormParams: item => ({
    values: {
      targetName: item?.suggestedName || 'extracted',
      extractionMode: 'folder' as const,
    },
  }),
  getTexts: () => ({
    title: 'Extract Archive',
    buttonLabel: 'Extract',
    buttonIcon: FolderInputIcon,
  }),
  onSuccessBehavior: {
    noToastOnSuccess: true,
  },
})

function getSingleItem(items: ArchiveEntry[]) {
  if (items.length === 1) return items[0]
  if (items.length === 2) {
    if (items[0].compressedSize == null) return items[1]
  }
  return undefined
}
