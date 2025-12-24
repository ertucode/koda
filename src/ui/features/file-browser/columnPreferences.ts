import { createStore } from "@xstate/store";
import { createLocalStoragePersistence } from "./utils/localStorage";
import {
  ColumnPreference,
  ColumnPreferenceStore,
  perDirectoryPreferencesSchema,
  preferencesWithSortSchema,
  SortState,
} from "./schemas";

// Create localStorage persistence helpers
const globalPersistence = createLocalStoragePersistence(
  "file-browser-column-preferences-global",
  preferencesWithSortSchema,
);

const localPersistence = createLocalStoragePersistence(
  "file-browser-column-preferences-local",
  perDirectoryPreferencesSchema,
);

const initialStore: ColumnPreferenceStore = {
  global: globalPersistence.load({ columns: [], sort: undefined }),
  local: localPersistence.load({}),
};

// Create the store
export const columnPreferencesStore = createStore({
  context: initialStore,
  on: {
    setGlobalPreferences: (
      context,
      event: { preferences: ColumnPreference[] },
    ) => ({
      ...context,
      global: {
        ...context.global,
        columns: event.preferences,
      },
    }),

    setLocalPreferences: (
      context,
      event: { directoryPath: string; preferences: ColumnPreference[] },
    ) => ({
      ...context,
      local: {
        ...context.local,
        [event.directoryPath]: {
          ...context.local[event.directoryPath],
          columns: event.preferences,
        },
      },
    }),

    setGlobalSort: (context, event: { sort: SortState }) => ({
      ...context,
      global: {
        ...context.global,
        sort: event.sort,
      },
    }),

    setLocalSort: (
      context,
      event: { directoryPath: string; sort: SortState },
    ) => ({
      ...context,
      local: {
        ...context.local,
        [event.directoryPath]: {
          columns: context.local[event.directoryPath]?.columns || [],
          sort: event.sort,
        },
      },
    }),

    clearGlobalPreferences: (context) => ({
      ...context,
      global: { columns: [], sort: undefined },
    }),

    clearLocalPreferences: (context, event: { directoryPath: string }) => {
      const newLocal = { ...context.local };
      delete newLocal[event.directoryPath];
      return {
        ...context,
        local: newLocal,
      };
    },

    clearAllLocalPreferences: (context) => ({
      ...context,
      local: {},
    }),
  },
});

// Subscribe to store changes for persistence
columnPreferencesStore.subscribe((state) => {
  globalPersistence.save(state.context.global);
  localPersistence.save(state.context.local);
});

// Selector functions
export const selectGlobalPreferences = (
  state: ReturnType<typeof columnPreferencesStore.get>,
) => state.context.global.columns;

export const selectLocalPreferences =
  (directoryPath: string) =>
  (state: ReturnType<typeof columnPreferencesStore.get>) =>
    state.context.local[directoryPath]?.columns || null;

export const selectEffectivePreferences =
  (directoryPath: string) =>
  (state: ReturnType<typeof columnPreferencesStore.get>) => {
    // Local preferences override global
    return (
      state.context.local[directoryPath]?.columns ||
      state.context.global.columns
    );
  };

export const selectGlobalSort = (
  state: ReturnType<typeof columnPreferencesStore.get>,
) => state.context.global.sort;

export const selectLocalSort =
  (directoryPath: string) =>
  (state: ReturnType<typeof columnPreferencesStore.get>) =>
    state.context.local[directoryPath]?.sort || null;

export const selectEffectiveSort =
  (directoryPath: string) =>
  (state: ReturnType<typeof columnPreferencesStore.get>) => {
    // Local sort state overrides global
    return (
      state.context.local[directoryPath]?.sort || state.context.global.sort
    );
  };

export function resolveGlobalOrLocalSort(directoryPath: string) {
  const c = columnPreferencesStore.getSnapshot().context;
  if (directoryPath === "") return c.global.sort;
  return c.local[directoryPath]?.sort || c.global.sort;
}
