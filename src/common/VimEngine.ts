import { GetFilesAndFoldersInDirectoryItem } from "./Contracts.js";
import { GenericError } from "./GenericError.js";
import { HistoryStack } from "./history-stack.js";

export namespace VimEngine {
  export type CursorPosition = {
    line: number;
    column: number;
  };
  export type CommandOpts = {
    count: number;
    buffer: string[];
    cursor: CursorPosition;
    registry: string[];
  };

  export type BufferItem =
    | {
        type: "str";
        str: string;
      }
    | {
        type: "real";
        item: GetFilesAndFoldersInDirectoryItem;
        str: string;
      };

  export type Buffer = {
    fullPath: string;
    items: BufferItem[];
    historyStack: HistoryStack<HistoryItem>;
  };

  export type State = {
    buffers: Record<string, Buffer>;
    currentBuffer: Buffer;
    cursor: CursorPosition;
    registry: BufferItem[];
    mode: Mode;
    count: number;
  };

  export type HistoryItem = {
    reversions: Reversion[];
  };
  type Reversion =
    | {
        type: "cursor";
        cursor: CursorPosition;
      }
    | {
        type: "add";
        items: BufferItem[];
        index: number;
      }
    | {
        type: "remove";
        count: number;
        index: number;
      };
  export type Mode = "normal" | "insert";

  // cc - dd - yy - p - P - u - ciw - C

  export function cc(state: State): State {
    const idxs: number[] = [];
    for (
      let i = state.cursor.line;
      i < getEffectiveCount(state) + state.cursor.line;
      i++
    ) {
      idxs.push(i);
    }
    const currentItems = [...state.currentBuffer.items];
    const deletedItems = currentItems.splice(
      state.cursor.line,
      getEffectiveCount(state),
    );
    const currentBuffer: Buffer = {
      fullPath: state.currentBuffer.fullPath,
      items: currentItems,
      historyStack: state.currentBuffer.historyStack.withNew({
        reversions: [
          {
            type: "add",
            items: deletedItems,
            index: state.cursor.line,
          },
          {
            type: "cursor",
            cursor: state.cursor,
          },
        ],
      }),
    };

    return {
      buffers: {
        ...state.buffers,
        [state.currentBuffer.fullPath]: currentBuffer,
      },
      count: 0,
      mode: "insert",
      currentBuffer,
      cursor: {
        line: state.cursor.line,
        column: 0,
      },
      registry: idxs.map((i) => state.currentBuffer.items[i]),
    };
  }

  export function dd(state: State): State {
    const idxs: number[] = [];
    for (
      let i = state.cursor.line;
      i < getEffectiveCount(state) + state.cursor.line;
      i++
    ) {
      idxs.push(i);
    }
    const currentItems = [...state.currentBuffer.items];
    const deletedItems = currentItems.splice(
      state.cursor.line,
      getEffectiveCount(state),
    );
    const currentBuffer: Buffer = {
      fullPath: state.currentBuffer.fullPath,
      items: currentItems,
      historyStack: state.currentBuffer.historyStack.withNew({
        reversions: [
          {
            type: "add",
            items: deletedItems,
            index: state.cursor.line,
          },
          {
            type: "cursor",
            cursor: state.cursor,
          },
        ],
      }),
    };
    return {
      buffers: {
        ...state.buffers,
        [state.currentBuffer.fullPath]: currentBuffer,
      },
      count: 0,
      mode: "normal",
      currentBuffer,
      cursor: {
        line: state.cursor.line,
        column: Math.max(
          state.cursor.column,
          currentItems[state.cursor.line].str.length,
        ),
      },
      registry: idxs.map((i) => state.currentBuffer.items[i]),
    };
  }

  export function yy(state: State): State {
    const idxs: number[] = [];
    for (
      let i = state.cursor.line;
      i < getEffectiveCount(state) + state.cursor.line;
      i++
    ) {
      idxs.push(i);
    }
    return {
      ...state,
      registry: idxs.map((i) => state.currentBuffer.items[i]),
    };
  }

  export function p(state: State): State {
    if (state.count) GenericError.Message("p not supported with count");

    const currentItems = [...state.currentBuffer.items];
    state.currentBuffer.items.splice(state.cursor.line, 0, ...state.registry);
    const currentBuffer: Buffer = {
      fullPath: state.currentBuffer.fullPath,
      items: currentItems,
      historyStack: state.currentBuffer.historyStack.withNew({
        reversions: [
          {
            type: "remove",
            count: state.registry.length,
            index: state.cursor.line,
          },
          {
            type: "cursor",
            cursor: state.cursor,
          },
        ],
      }),
    };
    return {
      buffers: {
        ...state.buffers,
        [state.currentBuffer.fullPath]: currentBuffer,
      },
      count: 0,
      mode: "normal",
      currentBuffer,
      cursor: {
        line: state.cursor.line + 1,
        column: 0,
      },
      registry: [],
    };
  }

  export function P(state: State): State {
    if (state.count) GenericError.Message("P not supported with count");

    const currentItems = [...state.currentBuffer.items];
    state.currentBuffer.items.splice(state.cursor.line, 0, ...state.registry);
    const currentBuffer: Buffer = {
      fullPath: state.currentBuffer.fullPath,
      items: currentItems,
      historyStack: state.currentBuffer.historyStack.withNew({
        reversions: [
          {
            type: "remove",
            count: state.registry.length,
            index: state.cursor.line,
          },
          {
            type: "cursor",
            cursor: state.cursor,
          },
        ],
      }),
    };
    return {
      buffers: {
        ...state.buffers,
        [state.currentBuffer.fullPath]: currentBuffer,
      },
      count: 0,
      mode: "normal",
      currentBuffer,
      cursor: {
        line: state.cursor.line + 1,
        column: 0,
      },
      registry: [],
    };
  }

  export function applyUndo(state: State): State {
    const historyItem = state.currentBuffer.historyStack.goPrevSafe();
    if (!historyItem || !historyItem.reversions.length) return state;

    const currentItems = [...state.currentBuffer.items];
    let cursor = state.cursor;

    for (const reversion of historyItem.reversions) {
      if (reversion.type === "cursor") {
        cursor = reversion.cursor;
      } else if (reversion.type === "add") {
        currentItems.splice(reversion.index, 0, ...reversion.items);
      } else if (reversion.type === "remove") {
        currentItems.splice(reversion.index, reversion.count);
      }
    }

    return {
      ...state,
      cursor,
      currentBuffer: {
        ...state.currentBuffer,
        items: currentItems,
      },
    };
  }

  export function u(state: State): State {
    let currentState = state;

    for (let i = 0; i < getEffectiveCount(state); i++) {
      currentState = applyUndo(currentState);
    }

    return currentState;
  }

  export function addToCount(state: State, count: number): State {
    return {
      ...state,
      count: state.count === 0 ? count : 10 * state.count + count,
    };
  }

  function getEffectiveCount(state: State): number {
    return state.count || 1;
  }
}

//  1
//  2
//  3
//  4
//  5
//  6
//  7
//  8
//  9
// 10
// 11
// 12
// 13
// 14
