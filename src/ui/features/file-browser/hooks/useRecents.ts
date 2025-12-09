import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { z } from "zod";

const recentItemSchema = z.object({
  fullPath: z.string(),
  timestamp: z.number(),
  type: z.enum(["file", "dir"]),
});

const recentsSchema = z.array(recentItemSchema);

export type RecentItem = z.infer<typeof recentItemSchema>;

const MAX_RECENTS = 30;

export function useRecents() {
  const [recents, setRecents] = useLocalStorage(
    "file-browser-recents",
    recentsSchema,
    [],
  );

  const addRecent = (item: Omit<RecentItem, "timestamp">) => {
    setRecents((prev) => {
      const isLastItemEquivalent =
        prev.length > 0 && prev[0].fullPath === item.fullPath;
      if (isLastItemEquivalent) return prev;

      // Remove if already exists
      const filtered = prev.filter(
        (recent) => recent.fullPath !== item.fullPath,
      );
      // Add to beginning with current timestamp
      const updated = [{ ...item, timestamp: Date.now() }, ...filtered];
      // Keep only the most recent items
      return updated.slice(0, MAX_RECENTS);
    });
  };

  const removeRecent = (fullPath: string) => {
    setRecents((prev) => prev.filter((recent) => recent.fullPath !== fullPath));
  };

  const clearRecents = () => {
    setRecents([]);
  };

  return {
    recents,
    addRecent,
    removeRecent,
    clearRecents,
  };
}
