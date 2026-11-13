import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { TaskEvents, Tasks } from '../../common/Tasks.js'
import { TaskManager } from '../TaskManager.js'
import { moveItems, undoMoveItems } from './move-items.js'

const temporaryDirectories: string[] = []

async function createTemporaryDirectory() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'koda-move-items-'))
  temporaryDirectories.push(directory)
  return directory
}

function clientMetadata(): Tasks.ClientMetadata {
  return {
    directoryId: 'test-directory',
    cursorLine: 0,
    selection: { indexes: new Set([0]), last: 0 },
  }
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })))
})

describe('moveItems', () => {
  it('moves multiple items up and provides an undo plan', async () => {
    const root = await createTemporaryDirectory()
    const current = path.join(root, 'current')
    await fs.mkdir(path.join(current, 'folder'), { recursive: true })
    await fs.writeFile(path.join(current, 'file.txt'), 'file')

    const events: TaskEvents[] = []
    const listener = (event: TaskEvents) => events.push(event)
    TaskManager.addListener(listener)
    const result = await moveItems({
      operation: 'move-up',
      sourcePaths: [path.join(current, 'folder'), path.join(current, 'file.txt')],
      clientMetadata: clientMetadata(),
    })
    TaskManager.removeListener(listener)

    expect(result.success).toBe(true)
    expect(await exists(path.join(root, 'folder'))).toBe(true)
    expect(await exists(path.join(root, 'file.txt'))).toBe(true)

    const createEvent = events.find(event => event.type === 'create')
    expect(createEvent?.type).toBe('create')
    if (createEvent?.type !== 'create') throw new Error('Expected task creation event')
    const undo = createEvent.task.clientMetadata?.moveUndo
    expect(undo?.moves).toHaveLength(2)
    if (!undo) throw new Error('Expected undo metadata')

    expect((await undoMoveItems(undo)).success).toBe(true)
    expect(await exists(path.join(current, 'folder'))).toBe(true)
    expect(await fs.readFile(path.join(current, 'file.txt'), 'utf8')).toBe('file')
  })

  it('infinitely flattens nested and empty folders and restores them on undo', async () => {
    const root = await createTemporaryDirectory()
    const selected = path.join(root, 'selected')
    await fs.mkdir(path.join(selected, 'nested', 'empty'), { recursive: true })
    await fs.writeFile(path.join(selected, 'top.txt'), 'top')
    await fs.writeFile(path.join(selected, 'nested', 'deep.txt'), 'deep')

    let undo: Tasks.MoveUndoMetadata | undefined
    const listener = (event: TaskEvents) => {
      if (event.type === 'create') undo = event.task.clientMetadata?.moveUndo
    }
    TaskManager.addListener(listener)
    const result = await moveItems({
      operation: 'flatten',
      sourcePaths: [selected],
      depth: 'infinity',
      clientMetadata: clientMetadata(),
    })
    TaskManager.removeListener(listener)

    expect(result.success).toBe(true)
    expect(await exists(selected)).toBe(false)
    expect(await fs.readFile(path.join(root, 'top.txt'), 'utf8')).toBe('top')
    expect(await fs.readFile(path.join(root, 'deep.txt'), 'utf8')).toBe('deep')
    if (!undo) throw new Error('Expected undo metadata')

    expect((await undoMoveItems(undo)).success).toBe(true)
    expect(await fs.readFile(path.join(selected, 'nested', 'deep.txt'), 'utf8')).toBe('deep')
    expect(await exists(path.join(selected, 'nested', 'empty'))).toBe(true)
  })

  it('flattens only the requested number of folder levels', async () => {
    const root = await createTemporaryDirectory()
    const selected = path.join(root, 'selected')
    await fs.mkdir(path.join(selected, 'nested', 'deeper'), { recursive: true })
    await fs.writeFile(path.join(selected, 'nested', 'deeper', 'file.txt'), 'file')

    const result = await moveItems({
      operation: 'flatten',
      sourcePaths: [selected],
      depth: 1,
      clientMetadata: clientMetadata(),
    })

    expect(result.success).toBe(true)
    expect(await exists(selected)).toBe(false)
    expect(await fs.readFile(path.join(root, 'nested', 'deeper', 'file.txt'), 'utf8')).toBe('file')
  })

  it('does not change anything when a destination name conflicts', async () => {
    const root = await createTemporaryDirectory()
    const selected = path.join(root, 'selected')
    await fs.mkdir(selected)
    await fs.writeFile(path.join(selected, 'same.txt'), 'inside')
    await fs.writeFile(path.join(root, 'same.txt'), 'outside')

    const result = await moveItems({
      operation: 'flatten',
      sourcePaths: [selected],
      depth: 'infinity',
      clientMetadata: clientMetadata(),
    })

    expect(result.success).toBe(false)
    expect(await fs.readFile(path.join(selected, 'same.txt'), 'utf8')).toBe('inside')
    expect(await fs.readFile(path.join(root, 'same.txt'), 'utf8')).toBe('outside')
  })
})
