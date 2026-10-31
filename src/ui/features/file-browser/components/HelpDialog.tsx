import { Button } from '@/lib/components/button'
import { Dialog } from '@/lib/components/dialog'
import { cn } from '@/lib/functions/clsx'
import { CheckSquare2Icon, type LucideIcon } from 'lucide-react'
import { dialogActions } from '../dialogStore'

type HelpItem = {
  keys: string[]
  title: string
  description: string
  accent?: 'primary' | 'success' | 'warning'
}

type HelpSection = {
  id: string
  title: string
  description: string
  icon: LucideIcon
  items: HelpItem[]
  note?: string
}

// Add new help topics here. The dialog renders every section using the same layout.
const helpSections: HelpSection[] = [
  {
    id: 'selection',
    title: 'Seçimi değiştirme',
    description: 'Cursor hareket ederken seçili dosyaları koruyabilir, artırabilir veya azaltabilirsin.',
    icon: CheckSquare2Icon,
    items: [
      {
        keys: ['J', 'K'],
        title: 'Tek seçimle hareket et',
        description: 'Aşağı veya yukarı gider; önceki seçimi temizleyip yalnızca ulaştığın öğeyi seçer.',
      },
      {
        keys: ['Shift', 'J / K'],
        title: 'Seçime ekle',
        description: 'Cursor ile yeni öğeye giderken mevcut ve ulaşılan öğeyi seçime ekler. Tekrarlayarak seçimi büyütürsün.',
        accent: 'success',
      },
      {
        keys: ['Ctrl', 'J / K'],
        title: 'Seçimden çıkar',
        description: 'Hareket ederken mevcut ve ulaşılan öğeyi seçimden çıkarır.',
        accent: 'warning',
      },
      {
        keys: ['V'],
        title: 'Yalnızca mevcut öğeyi seç',
        description: 'Diğer seçimleri temizler ve cursor altındaki öğeyi seçer.',
      },
      {
        keys: ['Shift', 'V'],
        title: 'Mevcut öğeyi aç / kapat',
        description: 'Cursor altındaki öğeyi seçime ekler; zaten seçiliyse seçimden çıkarır.',
      },
      {
        keys: ['⌘', 'A'],
        title: 'Tümünü seç',
        description: 'Görünür listedeki bütün öğeleri seçer.',
      },
    ],
    note: 'Grid görünümünde J ve K bir satır aşağı/yukarı hareket eder. Aynı işlemler Shift + ↑/↓ ile de kullanılabilir.',
  },
]

const accentClasses: Record<NonNullable<HelpItem['accent']>, string> = {
  primary: 'border-primary/30 bg-primary/5',
  success: 'border-success/30 bg-success/5',
  warning: 'border-warning/30 bg-warning/5',
}

export function HelpDialog() {
  return (
    <Dialog
      title="Koda Yardım"
      onClose={dialogActions.close}
      className="w-[min(720px,90vw)]"
      footer={
        <Button className="btn-sm btn-ghost" onClick={dialogActions.close}>
          Kapat
        </Button>
      }
    >
      <div className="overflow-y-auto max-h-[60vh] pr-1 space-y-4">
        {helpSections.map(section => (
          <HelpSectionView key={section.id} section={section} />
        ))}
      </div>
    </Dialog>
  )
}

function HelpSectionView({ section }: { section: HelpSection }) {
  const Icon = section.icon

  return (
    <section className="rounded-xl border border-base-300 overflow-hidden">
      <header className="flex items-start gap-3 bg-base-200 p-4">
        <div className="rounded-lg bg-primary/10 text-primary p-2">
          <Icon className="size-5" />
        </div>
        <div>
          <h4 className="font-semibold">{section.title}</h4>
          <p className="text-sm text-base-content/60 mt-0.5">{section.description}</p>
        </div>
      </header>

      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {section.items.map(item => (
          <article
            key={`${section.id}-${item.keys.join('-')}`}
            className={cn(
              'rounded-lg border border-base-300 p-3',
              item.accent && accentClasses[item.accent]
            )}
          >
            <div className="flex flex-wrap gap-1 mb-2" aria-label={item.keys.join(' + ')}>
              {item.keys.map(key => (
                <kbd key={key} className="kbd kbd-sm bg-base-100 shadow-sm">
                  {key}
                </kbd>
              ))}
            </div>
            <h5 className="text-sm font-semibold">{item.title}</h5>
            <p className="text-xs leading-relaxed text-base-content/65 mt-1">{item.description}</p>
          </article>
        ))}
      </div>

      {section.note && (
        <p className="border-t border-base-300 bg-base-200/50 px-4 py-2.5 text-xs text-base-content/60">
          <span className="font-semibold text-base-content/80">Not:</span> {section.note}
        </p>
      )}
    </section>
  )
}
