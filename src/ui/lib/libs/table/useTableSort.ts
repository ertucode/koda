import { useMemo } from "react";
import { ZodType } from "zod";

export type TableSortState<TKey> = {
  by?: $Maybe<TKey>;
  order?: $Maybe<"asc" | "desc">;
};
export type TableSortProps<TKey> = {
  state: TableSortState<TKey>;
  changeState: (
    cbOrValue:
      | ((state: TableSortState<TKey>) => TableSortState<TKey>)
      | TableSortState<TKey>,
  ) => void;
  schema: ZodType<TKey>;
};
export function useTableSort<TKey>(props: TableSortProps<TKey>, deps: any[]) {
  return useMemo(() => {
    return {
      state: props.state,
      onKey: (key: $Maybe<string | number>) => {
        if (key == null)
          return props.changeState((s) => ({
            ...s,
            by: undefined,
            order: !s.by ? "asc" : "desc",
          }));
        const p = props.schema.safeParse(key);
        if (p.success)
          return props.changeState((s) => ({
            ...s,
            by: p.data,
            order:
              s.by === p.data || (!p.data && !s.by)
                ? toggleOrder(s.order)
                : "asc",
          }));
        throw new Error(`Invalid key: ${key}`);
      },
    };
  }, [props, ...deps]);
}

function toggleOrder(order: $Maybe<"asc" | "desc">) {
  return order === "asc" ? "desc" : "asc";
}
