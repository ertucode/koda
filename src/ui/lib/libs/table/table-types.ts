import { SortName } from '@/features/file-browser/schemas'
import type { ReactNode } from 'react'

export type ColumnDef<T> = {
  id: string | number
  sortKey: SortName | undefined
  header: ReactNode
  cell: (item: T, data: { index: number }) => ReactNode
  size?: number
  headerConfigView?: ReactNode
}
