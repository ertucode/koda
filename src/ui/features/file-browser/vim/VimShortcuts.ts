import { GlobalShortcuts } from '@/lib/hooks/globalShortcuts'
import { VimEngine } from '@common/VimEngine'
import { VimMovements } from '@common/VimMovements'
import { directoryStore } from '../directoryStore/directory'
import { dialogActions, dialogStore } from '../dialogStore'
import { VimShortcutHelper } from './VimShortcutHelper'
import { getSnapshotWithInitializedVim } from '../directoryStore/vimHelpers'
import { confirmation } from '@/lib/components/confirmation'
import { subscribeToStores } from '@/lib/functions/storeHelpers'
import { VimFuzzy } from '@common/VimFuzzy'
import { clipboardStore } from '../clipboardHelpers'
import { VimChangesDialog } from './VimChangesDialog'

const SHORTCUTS_KEY = 'vim'

const create = VimShortcutHelper.createHandler

const findCommandListener: (e: KeyboardEvent) => void = e => {
  if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
    return
  }
  e.preventDefault()
  e.stopImmediatePropagation()
  const result = getSnapshotWithInitializedVim()
  if (!result) return

  const pendingFindCommand = result.snapshot.vim.pendingFindCommand
  if (!pendingFindCommand) {
    window.removeEventListener('keydown', findCommandListener)
    return
  }

  if (!VimShortcutHelper.isSingleCharAndNoModifiers(e)) {
    VimShortcutHelper.initializedWithUpdater(result, VimMovements.clearPendingFindCommand)
  } else {
    VimShortcutHelper.initializedWithUpdater(result, opts => VimMovements.executeFind(opts, pendingFindCommand, e.key))
  }
  window.removeEventListener('keydown', findCommandListener)
}

directoryStore.subscribe(s => {
  if (s.context.vim.pendingFindCommand) {
    window.addEventListener('keydown', findCommandListener)
  }
})

let subscription: (() => void) | undefined = undefined
export const VimShortcuts = {
  init: () => {
    GlobalShortcuts.create({
      key: SHORTCUTS_KEY,
      enabled: true,
      shortcuts: [
        {
          command: 'vim_undo',
          code: 'KeyU',
          handler: create(VimEngine.u),
          label: '[VIM] Undo',
        },
        ...Array.from({ length: 10 }, (_, i) => ({
          command: `vim_count_${i}`,
          code: `Digit${i}`,
          handler: create(opts => VimEngine.addToCount(opts, i)),
          label: `[VIM] Count ${i}`,
        })),
        {
          command: 'vim_paste_after',
          code: 'KeyP',
          handler: create(VimEngine.p),
          label: '[VIM] Paste after',
        },
        {
          command: 'vim_paste_before',
          code: { code: 'KeyP', shiftKey: true },
          handler: create(VimEngine.P),
          label: '[VIM] Paste before',
        },
        {
          command: 'vim_save',
          code: { code: 'KeyS', metaKey: true },
          handler: e => {
            e?.preventDefault()

            const result = getSnapshotWithInitializedVim()
            if (!result || !result.wasInitialized) return

            const { snapshot } = result
            const { changes } = VimEngine.aggregateChanges(snapshot.vim)

            if (changes.length === 0) return

            dialogActions.open({
              component: VimChangesDialog,
              props: {
                changes,
              },
            })
          },
          label: '[VIM] Save',
        },
        { command: 'vim_open_line', code: 'KeyO', handler: create(VimEngine.o), label: '[VIM] Open line' },
        { command: 'vim_delete_operator', code: 'KeyD', handler: create(VimEngine.d), label: '[VIM] Delete operator' },
        { command: 'vim_change_operator', code: 'KeyC', handler: create(VimEngine.c), label: '[VIM] Change operator' },
        { command: 'vim_yank_operator', code: 'KeyY', handler: create(VimEngine.y), label: '[VIM] Yank operator' },
        { command: 'vim_substitute_character', code: 'KeyS', handler: create(VimEngine.s), label: '[VIM] Substitute character' },
        { command: 'vim_delete_character', code: 'KeyX', handler: create(VimEngine.x), label: '[VIM] Delete character under cursor' },
        { command: 'vim_change_to_end', code: { code: 'KeyC', shiftKey: true }, handler: create(VimEngine.C), label: '[VIM] Change to end of line' },
        { command: 'vim_delete_to_end', code: { code: 'KeyD', shiftKey: true }, handler: create(VimEngine.D), label: '[VIM] Delete to end of line' },
        { command: 'vim_insert', code: 'KeyI', handler: create(VimMovements.i), label: '[VIM] Insert' },
        { command: 'vim_append', code: 'KeyA', handler: create(VimMovements.a), label: '[VIM] Append' },
        { command: 'vim_append_at_end', code: { code: 'KeyA', shiftKey: true }, handler: create(VimMovements.A), label: '[VIM] Append at end' },
        { command: 'vim_move_cursor_right', code: 'KeyL', handler: create(VimMovements.l), label: '[VIM] Move cursor right' },
        { command: 'vim_move_cursor_left', code: 'KeyH', handler: create(VimMovements.h), label: '[VIM] Move cursor left' },
        { command: 'vim_move_cursor_down', code: 'KeyJ', handler: create(VimMovements.j), label: '[VIM] Move cursor down' },
        { command: 'vim_move_cursor_up', code: 'KeyK', handler: create(VimMovements.k), label: '[VIM] Move cursor up' },
        { command: 'vim_move_word_start', code: 'KeyW', handler: create(VimMovements.w), label: '[VIM] Move cursor to start of word' },
        { command: 'vim_move_word_back', code: 'KeyB', handler: create(VimMovements.b), label: '[VIM] Move cursor to end of word' },
        { command: 'vim_move_word_end', code: 'KeyE', handler: create(VimMovements.e), label: '[VIM] Move cursor to end of word' },
        { command: 'vim_find_next', code: 'KeyF', handler: create(VimMovements.f), label: '[VIM] Move cursor to next occurrence of character' },
        { command: 'vim_find_previous', code: { code: 'KeyF', shiftKey: true }, handler: create(VimMovements.F), label: '[VIM] Move cursor to previous occurrence of character' },
        { command: 'vim_till_next', code: 'KeyT', handler: create(VimMovements.t), label: '[VIM] Move cursor to next occurrence of character' },
        { command: 'vim_till_previous', code: { code: 'KeyT', shiftKey: true }, handler: create(VimMovements.T), label: '[VIM] Move cursor to previous occurrence of character' },
        { command: 'vim_repeat_find', code: 'Semicolon', handler: create(VimMovements.semicolon), label: '[VIM] Repeat last f/F/t/T command' },
        { command: 'vim_fuzzy_next', code: 'KeyN', handler: create(VimFuzzy.n), label: '[VIM] Next fuzzy match' },
        { command: 'vim_fuzzy_previous', code: { code: 'KeyN', shiftKey: true }, handler: create(VimFuzzy.N), label: '[VIM] Next fuzzy match (backwards)' },
        {
          command: 'vim_repeat_find_reverse',
          code: 'Comma',
          handler: create(VimMovements.comma),
          label: '[VIM] Repeat last f/F/t/T command in reverse direction',
        },
        {
          command: 'vim_first_non_blank',
          code: { code: 'Minus', shiftKey: true },
          handler: create(VimMovements.underscore),
          label: '[VIM] Move to first non-blank character of line',
        },
        {
          command: 'vim_end_of_line',
          code: { code: 'Digit4', shiftKey: true },
          handler: create(VimMovements.dollar),
          label: '[VIM] Move to end of line',
        },
        {
          command: 'vim_escape',
          code: 'Escape',
          handler: create(VimEngine.escInNormal, () => {
            clipboardStore.trigger.clearClipboard()
          }),
          label: '[VIM] Escape to reset selection',
        },
      ],
      sequences: [],
    })
    subscription = subscribeToStores(
      [dialogStore, confirmation],
      ([dialog, confirmation]) => [!dialog.state, confirmation.isOpen],
      ([dialog, confirmation]) => {
        const enabled = !dialog.state && !confirmation.isOpen
        GlobalShortcuts.updateEnabled(SHORTCUTS_KEY, enabled)
      }
    )
  },
  deinit: () => {
    GlobalShortcuts.updateEnabled(SHORTCUTS_KEY, false)
    subscription?.()
  },
}

export const commands = [
  { code: 'KeyU', command: 'vim_undo', label: '[VIM] Undo' },
  { code: 'Digit0', command: 'vim_count_0', label: '[VIM] Count 0', customizable: false },
  { code: 'Digit1', command: 'vim_count_1', label: '[VIM] Count 1', customizable: false },
  { code: 'Digit2', command: 'vim_count_2', label: '[VIM] Count 2', customizable: false },
  { code: 'Digit3', command: 'vim_count_3', label: '[VIM] Count 3', customizable: false },
  { code: 'Digit4', command: 'vim_count_4', label: '[VIM] Count 4', customizable: false },
  { code: 'Digit5', command: 'vim_count_5', label: '[VIM] Count 5', customizable: false },
  { code: 'Digit6', command: 'vim_count_6', label: '[VIM] Count 6', customizable: false },
  { code: 'Digit7', command: 'vim_count_7', label: '[VIM] Count 7', customizable: false },
  { code: 'Digit8', command: 'vim_count_8', label: '[VIM] Count 8', customizable: false },
  { code: 'Digit9', command: 'vim_count_9', label: '[VIM] Count 9', customizable: false },
  { code: 'KeyP', command: 'vim_paste_after', label: '[VIM] Paste after' },
  { code: { code: 'KeyP', shiftKey: true }, command: 'vim_paste_before', label: '[VIM] Paste before' },
  { code: { code: 'KeyS', metaKey: true }, command: 'vim_save', label: '[VIM] Save' },
  { code: 'KeyO', command: 'vim_open_line', label: '[VIM] Open line' },
  { code: 'KeyD', command: 'vim_delete_operator', label: '[VIM] Delete operator' },
  { code: 'KeyC', command: 'vim_change_operator', label: '[VIM] Change operator' },
  { code: 'KeyY', command: 'vim_yank_operator', label: '[VIM] Yank operator' },
  { code: 'KeyS', command: 'vim_substitute_character', label: '[VIM] Substitute character' },
  { code: 'KeyX', command: 'vim_delete_character', label: '[VIM] Delete character under cursor' },
  { code: { code: 'KeyC', shiftKey: true }, command: 'vim_change_to_end', label: '[VIM] Change to end of line' },
  { code: { code: 'KeyD', shiftKey: true }, command: 'vim_delete_to_end', label: '[VIM] Delete to end of line' },
  { code: 'KeyI', command: 'vim_insert', label: '[VIM] Insert' },
  { code: 'KeyA', command: 'vim_append', label: '[VIM] Append' },
  { code: { code: 'KeyA', shiftKey: true }, command: 'vim_append_at_end', label: '[VIM] Append at end' },
  { code: 'KeyL', command: 'vim_move_cursor_right', label: '[VIM] Move cursor right' },
  { code: 'KeyH', command: 'vim_move_cursor_left', label: '[VIM] Move cursor left' },
  { code: 'KeyJ', command: 'vim_move_cursor_down', label: '[VIM] Move cursor down' },
  { code: 'KeyK', command: 'vim_move_cursor_up', label: '[VIM] Move cursor up' },
  { code: 'KeyW', command: 'vim_move_word_start', label: '[VIM] Move cursor to start of word' },
  { code: 'KeyB', command: 'vim_move_word_back', label: '[VIM] Move cursor to end of word' },
  { code: 'KeyE', command: 'vim_move_word_end', label: '[VIM] Move cursor to end of word' },
  { code: 'KeyF', command: 'vim_find_next', label: '[VIM] Move cursor to next occurrence of character' },
  { code: { code: 'KeyF', shiftKey: true }, command: 'vim_find_previous', label: '[VIM] Move cursor to previous occurrence of character' },
  { code: 'KeyT', command: 'vim_till_next', label: '[VIM] Move cursor to next occurrence of character' },
  { code: { code: 'KeyT', shiftKey: true }, command: 'vim_till_previous', label: '[VIM] Move cursor to previous occurrence of character' },
  { code: 'Semicolon', command: 'vim_repeat_find', label: '[VIM] Repeat last f/F/t/T command' },
  { code: 'KeyN', command: 'vim_fuzzy_next', label: '[VIM] Next fuzzy match' },
  { code: { code: 'KeyN', shiftKey: true }, command: 'vim_fuzzy_previous', label: '[VIM] Next fuzzy match (backwards)' },
  { code: 'Comma', command: 'vim_repeat_find_reverse', label: '[VIM] Repeat last f/F/t/T command in reverse direction' },
  { code: { code: 'Minus', shiftKey: true }, command: 'vim_first_non_blank', label: '[VIM] Move to first non-blank character of line' },
  { code: { code: 'Digit4', shiftKey: true }, command: 'vim_end_of_line', label: '[VIM] Move to end of line' },
  { code: 'Escape', command: 'vim_escape', label: '[VIM] Escape to reset selection' },
]
