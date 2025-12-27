import { WindowElectron } from "@common/Contracts";
import { deserializeWindowArguments } from "@common/WindowArguments";

export function getWindowElectron() {
  return (window as any).electron as WindowElectron;
}

export const args = deserializeWindowArguments(
  getWindowElectron().getWindowArgs(),
);

export const windowArgs = {
  ...args,
  isSelectAppMode: args.mode === "select-app",
};

export const homeDirectory = windowArgs.homeDir;
