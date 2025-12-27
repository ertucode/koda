import { WindowElectron } from "@common/Contracts";
import { deserializeWindowArguments } from "@common/WindowArguments";

export function getWindowElectron() {
  return (window as any).electron as WindowElectron;
}

export const windowArgs = deserializeWindowArguments(
  getWindowElectron().getWindowArgs(),
);

export const homeDirectory = windowArgs.homeDir;
