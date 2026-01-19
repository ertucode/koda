import { CommandMetadata } from '@common/Command'
import { FormDialogForm } from '@/lib/libs/form/createFormDialog'
import z from 'zod'
import { TerminalIcon } from 'lucide-react'
import { CommandHelpers } from '../CommandHelpers'
import { FormFieldConfig } from '@/lib/libs/form/FormFieldFromConfig'
import { replacePlaceholders } from '@common/PlaceholderHelpers'
import { PathHelpers } from '@common/PathHelpers'
import { windowArgs } from '@/getWindowElectron'
import { useMemo } from 'react'

type Item = {
  command: CommandMetadata
  fullPath: string
  fileType: 'dir' | 'file'
}

export const RunCommandDialog = (item: Item) => {
  const parameters = item?.command.parameters

  if (!parameters?.length) return undefined

  const resolvedSchema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {}
    for (const p of parameters) {
      if (p.type === 'checkbox') {
        shape[p.name] = p.optional ? z.boolean().optional() : z.boolean()
      } else {
        shape[p.name] = p.optional ? z.string().optional() : z.string()
      }
    }
    return z.object(shape)
  }, [parameters])

  return (
    <FormDialogForm
      item={item}
      onNonErrorBehavior={{ closeDialog: true }}
      dialogClassName="max-w-screen w-200"
      schema={resolvedSchema}
      action={(body, item) =>
        CommandHelpers.runCommandWithParameters(item.command, item.fullPath, body as Record<string, string | boolean>)
      }
      getConfigs={() =>
        parameters.map((p): FormFieldConfig<string> => {
          const label = p.label || p.name
          if (p.type === 'string') {
            return {
              field: p.name,
              label,
              type: 'input',
            }
          }
          if (p.type === 'path') {
            return {
              field: p.name,
              label,
              type: 'path',
            }
          }
          if (p.type === 'checkbox') {
            return {
              field: p.name,
              label,
              type: 'checkbox',
            }
          }
          return {
            field: p.name,
            label,
            type: 'select',
            options: p.type === 'select' ? p.options : [],
          }
        })
      }
      getFormParams={item => {
        const values: Record<string, string> = {}

        if (item && parameters) {
          parameters.forEach(p => {
            if (p.defaultValue) {
              if (p.type === 'path') {
                // Replace placeholders with file information
                values[p.name] = replacePlaceholders(p.defaultValue, {
                  name: PathHelpers.name(item.fullPath),
                  fullPath: PathHelpers.revertExpandedHome(windowArgs.homeDir, item.fullPath),
                  ext: PathHelpers.getDottedExtension(item.fullPath),
                  type: item.fileType,
                })
              } else {
                if (p.type === 'checkbox') {
                  values[p.name] = p.defaultValue ? 'true' : 'false'
                } else {
                  values[p.name] = p.defaultValue
                }
              }
            }
          })
        }

        return {
          values,
        }
      }}
      getTexts={item => ({
        title: item ? `Run Command: ${item.command.name}` : 'Run Command',
        buttonLabel: 'Run Command',
        buttonIcon: TerminalIcon,
      })}
    />
  )
}
