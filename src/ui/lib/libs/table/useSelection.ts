import React, { Dispatch, SetStateAction, useState } from "react";

export type SelectionState = {
  indexes: Set<number>;
  lastSelected?: number;
};
export type SelectionInput = {
  state: SelectionState;
  setState: Dispatch<SetStateAction<SelectionState>>;
};
export function useSelection(props: SelectionInput) {
  const { state, setState } = props;

  const select = (index: number, event: React.MouseEvent | KeyboardEvent) => {
    // event.preventDefault();
    // event.stopPropagation();

    const isShiftEvent =
      event.shiftKey &&
      (!("key" in event) || (event.key !== "G" && event.key !== "g"));
    if (isShiftEvent && state.lastSelected != null) {
      const lastSelected = state.lastSelected;
      const indexes = new Set(state.indexes);

      if (lastSelected > index) {
        let allSelected = true;
        for (let i = lastSelected - 1; i >= index; i--) {
          if (!indexes.has(i)) {
            allSelected = false;
            break;
          }
        }

        if (allSelected) {
          for (let i = lastSelected - 1; i >= index; i--) {
            indexes.delete(i);
          }
        } else {
          for (let i = lastSelected - 1; i >= index; i--) {
            indexes.add(i);
          }
        }
      } else {
        let allSelected = true;
        for (let i = lastSelected + 1; i <= index; i++) {
          if (!indexes.has(i)) {
            allSelected = false;
            break;
          }
        }

        if (allSelected) {
          for (let i = lastSelected + 1; i <= index; i++) {
            indexes.delete(i);
          }
        } else {
          for (let i = lastSelected + 1; i <= index; i++) {
            indexes.add(i);
          }
        }
      }

      setState({ indexes, lastSelected: index });
      return;
    }

    const isCtrlEvent =
      (event.ctrlKey || event.metaKey) &&
      (!("key" in event) || (event.key !== "u" && event.key !== "d"));
    if (isCtrlEvent) {
      if (state.indexes.has(index)) {
        setState({
          indexes: Helpers.remove(state.indexes, index),
          lastSelected: index,
        });
        return;
      }
      setState({
        indexes: new Set([...state.indexes, index]),
        lastSelected: index,
      });
      return;
    }

    setState({ indexes: new Set([index]), lastSelected: index });
  };

  const getShortcuts = (count: number) => [
    {
      key: [{ key: "a", metaKey: true }],
      handler: (e: KeyboardEvent) => {
        setState({
          indexes: new Set(Array.from({ length: count }).map((_, i) => i)),
          lastSelected: count - 1,
        });
        e.preventDefault();
      },
    },
    {
      key: ["ArrowUp", "k", "K"],
      handler: (e: KeyboardEvent) => {
        const lastSelected = state.lastSelected ?? 0;
        if (state.indexes.has(lastSelected - 1)) {
          setState({
            indexes: Helpers.remove(state.indexes, lastSelected),
            lastSelected: lastSelected - 1,
          });
        } else {
          if (lastSelected - 1 < 0) {
            select(count - 1, e);
          } else {
            select(lastSelected - 1, e);
          }
        }
        e.preventDefault();
      },
    },
    {
      key: ["ArrowDown", "j", "J"],
      handler: (e: KeyboardEvent) => {
        const lastSelected = state.lastSelected ?? 0;
        if (state.indexes.has(lastSelected + 1)) {
          setState({
            indexes: Helpers.remove(state.indexes, lastSelected),
            lastSelected: lastSelected + 1,
          });
        } else {
          if (lastSelected + 1 === count) {
            select(0, e);
          } else {
            select(lastSelected + 1, e);
          }
        }
        e.preventDefault();
      },
    },
    {
      key: "ArrowLeft",
      handler: (e: KeyboardEvent) => {
        const lastSelected = state.lastSelected ?? 0;
        select(lastSelected - 10, e);
        e.preventDefault();
      },
    },
    {
      key: "ArrowRight",
      handler: (e: KeyboardEvent) => {
        const lastSelected = state.lastSelected ?? 0;
        select(lastSelected + 10, e);
        e.preventDefault();
      },
    },
    {
      key: "G",
      handler: (e: KeyboardEvent) => {
        // Go to the bottom (like vim G)
        select(count - 1, e);
        e.preventDefault();
      },
    },
    {
      // Go to the top (like vim gg)
      sequence: ["g", "g"],
      handler: (e: KeyboardEvent) => {
        select(0, e);
        e.preventDefault();
      },
    },
    {
      key: { key: "d", ctrlKey: true },
      handler: (e: KeyboardEvent) => {
        const lastSelected = state.lastSelected ?? 0;
        select(Math.min(lastSelected + 10, count - 1), e);
        e.preventDefault();
      },
    },
    {
      key: { key: "u", ctrlKey: true },
      handler: (e: KeyboardEvent) => {
        const lastSelected = state.lastSelected ?? 0;
        select(Math.max(lastSelected - 10, 0), e);
        e.preventDefault();
      },
    },
  ];

  return {
    select,
    getShortcuts,
    reset: () => {
      setState(defaultSelection());
    },
    isSelected: (index: number) => state.indexes.has(index),
    selectManually: (index: number) => {
      setState({
        indexes: new Set([index]),
        lastSelected: index,
      });
    },
    state,
    setState,
  };
}

export function useDefaultSelection() {
  const [state, setState] = useState(defaultSelection());
  return {
    state,
    setState,
  };
}

export function defaultSelection(): SelectionState {
  return { indexes: new Set() };
}

namespace Helpers {
  export function remove(set: Set<number>, item: number) {
    const newSet = new Set(set);
    newSet.delete(item);
    return newSet;
  }
}
