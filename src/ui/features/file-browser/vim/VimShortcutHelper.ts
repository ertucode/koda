import { VimEngine } from '@common/VimEngine'
import { directoryStore } from '../directoryStore/directory'
import { getSnapshotWithInitializedVim } from '../directoryStore/vimHelpers'

export namespace VimShortcutHelper {
  export type Updater = (opts: VimEngine.CommandOpts) => VimEngine.State
  export function createHandler(updater: Updater, additional?: () => void) {
    return (e: { preventDefault: () => void } | undefined) => {
      const [shouldRun, result] = VimShortcutHelper.shouldRun()
      if (!shouldRun) return
      e?.preventDefault()
      additional?.()

      return initializedWithUpdater(result, updater)
    }
  }

  export function initializedWithUpdater(
    result: Exclude<ReturnType<typeof getSnapshotWithInitializedVim>, undefined>,
    updater: Updater
  ) {
    const { snapshot, fullPath } = result

    const state = updater({ state: snapshot.vim, fullPath })
    directoryStore.trigger.updateVimState({
      state: state,
    })
    return state
  }

  export function isSingleCharAndNoModifiers(e: KeyboardEvent | undefined): e is KeyboardEvent {
    return e?.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey
  }

  export function updateVim(updater: Updater) {
    const result = getSnapshotWithInitializedVim()
    if (!result) return

    return VimShortcutHelper.createHandler(updater)(undefined)
  }

  export function shouldRun() {
    const result = getSnapshotWithInitializedVim()
    if (!result) return [false, undefined] as const
    const pendingFindCommand = result.snapshot.vim.pendingFindCommand
    if (pendingFindCommand) return [false, undefined] as const
    return [true, result] as const
  }
}
