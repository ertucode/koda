export namespace PathHelpers {
  export function getLastPathPart(path: string) {
    const parts = path.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "/";
  }
}
