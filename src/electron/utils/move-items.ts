import fs from 'fs/promises'
import path from 'path'
import { GenericError, GenericResult } from '../../common/GenericError.js'
import { Result } from '../../common/Result.js'
import { Tasks } from '../../common/Tasks.js'
import { TaskManager } from '../TaskManager.js'
import { expandHome } from './expand-home.js'

type MoveItemsRequest = {
  operation: 'move-up' | 'flatten'
  sourcePaths: string[]
  depth?: number | 'infinity'
  clientMetadata: Tasks.ClientMetadata
}

type MovePlan = {
  moves: Tasks.MoveRecord[]
  removedDirectories: string[]
  destinationDirectories: string[]
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function collectFlattenMoves(
  folderPath: string,
  destinationDirectory: string,
  depth: number | 'infinity',
  plan: MovePlan
): Promise<void> {
  plan.removedDirectories.push(folderPath)
  const entries = await fs.readdir(folderPath, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(folderPath, entry.name)
    if (entry.isDirectory() && (depth === 'infinity' || depth > 1)) {
      await collectFlattenMoves(
        sourcePath,
        destinationDirectory,
        depth === 'infinity' ? 'infinity' : depth - 1,
        plan
      )
      continue
    }

    plan.moves.push({
      sourcePath,
      destinationPath: path.join(destinationDirectory, entry.name),
    })
  }
}

async function createPlan(request: MoveItemsRequest): Promise<MovePlan> {
  if (request.sourcePaths.length === 0) throw new Error('No items selected')

  const sourcePaths = [...new Set(request.sourcePaths.map(expandHome))]
  if (sourcePaths.length !== request.sourcePaths.length) throw new Error('The selection contains duplicate paths')
  const sortedSources = [...sourcePaths].sort((a, b) => a.length - b.length)
  for (let index = 0; index < sortedSources.length; index++) {
    const sourceWithSeparator = sortedSources[index].endsWith(path.sep)
      ? sortedSources[index]
      : sortedSources[index] + path.sep
    if (sortedSources.slice(index + 1).some(candidate => candidate.startsWith(sourceWithSeparator))) {
      throw new Error('The selection cannot contain both a folder and an item inside it')
    }
  }

  const plan: MovePlan = { moves: [], removedDirectories: [], destinationDirectories: [] }
  for (const sourcePath of sourcePaths) {
    const stats = await fs.stat(sourcePath)
    const sourceDirectory = path.dirname(sourcePath)
    const destinationDirectory =
      request.operation === 'move-up' ? path.dirname(sourceDirectory) : sourceDirectory

    if (request.operation === 'move-up') {
      if (destinationDirectory === sourceDirectory) throw new Error(`Cannot move an item above ${sourceDirectory}`)
      plan.moves.push({
        sourcePath,
        destinationPath: path.join(destinationDirectory, path.basename(sourcePath)),
      })
    } else {
      if (!stats.isDirectory()) throw new Error(`Only folders can be flattened: ${sourcePath}`)
      const depth = request.depth ?? 1
      if (depth !== 'infinity' && (!Number.isInteger(depth) || depth < 1)) {
        throw new Error('Flatten depth must be a positive whole number')
      }
      await collectFlattenMoves(sourcePath, destinationDirectory, depth, plan)
    }

    plan.destinationDirectories.push(destinationDirectory)
  }

  const destinations = new Set<string>()
  for (const move of plan.moves) {
    if (move.sourcePath === move.destinationPath) throw new Error(`Source and destination are the same: ${move.sourcePath}`)
    const destinationKey = move.destinationPath.toLocaleLowerCase()
    if (destinations.has(destinationKey)) {
      throw new Error(`Multiple items would be moved to ${move.destinationPath}`)
    }
    destinations.add(destinationKey)
    if (await pathExists(move.destinationPath)) throw new Error(`An item already exists at ${move.destinationPath}`)
  }

  return plan
}

async function recreateDirectories(directories: string[]) {
  const shallowestFirst = [...directories].sort((a, b) => a.split(path.sep).length - b.split(path.sep).length)
  for (const directory of shallowestFirst) await fs.mkdir(directory, { recursive: true })
}

async function rollbackMoves(completed: Tasks.MoveRecord[], removedDirectories: string[]) {
  await recreateDirectories(removedDirectories)
  for (const move of [...completed].reverse()) {
    if (await pathExists(move.destinationPath)) await fs.rename(move.destinationPath, move.sourcePath)
  }
}

export async function moveItems(request: MoveItemsRequest): Promise<GenericResult<void>> {
  let plan: MovePlan
  try {
    plan = await createPlan(request)
  } catch (error) {
    return GenericError.Message(error instanceof Error ? error.message : 'Could not prepare move')
  }

  const clientMetadata: Tasks.ClientMetadata = {
    ...request.clientMetadata,
    moveUndo: {
      moves: plan.moves,
      removedDirectories: plan.removedDirectories,
    },
  }
  const taskId = TaskManager.create({
    type: 'move-items',
    metadata: {
      operation: request.operation,
      sourcePaths: request.sourcePaths,
      destinationDirectories: [...new Set(plan.destinationDirectories)],
      depth: request.operation === 'flatten' ? request.depth ?? 1 : undefined,
    },
    clientMetadata,
    progress: 0,
  })
  const completed: Tasks.MoveRecord[] = []
  const abortSignal = TaskManager.getAbortSignal(taskId)

  try {
    for (const move of plan.moves) {
      if (abortSignal?.aborted) throw new Error('Operation cancelled')
      if (await pathExists(move.destinationPath)) throw new Error(`An item already exists at ${move.destinationPath}`)
      await fs.rename(move.sourcePath, move.destinationPath)
      completed.push(move)
      TaskManager.progress(taskId, plan.moves.length ? (completed.length / plan.moves.length) * 90 : 90)
    }

    const deepestFirst = [...plan.removedDirectories].sort(
      (a, b) => b.split(path.sep).length - a.split(path.sep).length
    )
    for (const directory of deepestFirst) {
      if (abortSignal?.aborted) throw new Error('Operation cancelled')
      await fs.rmdir(directory)
    }

    TaskManager.progress(taskId, 100)
    const result = Result.Success(undefined)
    TaskManager.result(taskId, result)
    return result
  } catch (error) {
    try {
      await rollbackMoves(completed, plan.removedDirectories)
    } catch (rollbackError) {
      console.error('Failed to roll back move operation', rollbackError)
    }
    const result = GenericError.Message(error instanceof Error ? error.message : 'Move failed')
    TaskManager.result(taskId, result)
    return result
  }
}

export async function undoMoveItems(undo: Tasks.MoveUndoMetadata): Promise<GenericResult<void>> {
  if (undo.undone) return GenericError.Message('This operation has already been undone')

  try {
    for (const move of undo.moves) {
      if (!(await pathExists(move.destinationPath))) throw new Error(`Moved item no longer exists: ${move.destinationPath}`)
      if (await pathExists(move.sourcePath)) throw new Error(`Cannot restore because this path exists: ${move.sourcePath}`)
    }

    await recreateDirectories(undo.removedDirectories)
    const restored: Tasks.MoveRecord[] = []
    try {
      for (const move of undo.moves) {
        await fs.mkdir(path.dirname(move.sourcePath), { recursive: true })
        if (await pathExists(move.sourcePath)) throw new Error(`Cannot restore because this path exists: ${move.sourcePath}`)
        await fs.rename(move.destinationPath, move.sourcePath)
        restored.push(move)
      }
    } catch (error) {
      for (const move of restored.reverse()) {
        if (await pathExists(move.sourcePath)) await fs.rename(move.sourcePath, move.destinationPath)
      }
      throw error
    }

    return Result.Success(undefined)
  } catch (error) {
    return GenericError.Message(error instanceof Error ? error.message : 'Undo failed')
  }
}
