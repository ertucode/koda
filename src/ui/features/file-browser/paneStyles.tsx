import { Button } from "@/lib/components/button";
import {
  ClockIcon,
  CogIcon,
  EyeIcon,
  FileQuestionIcon,
  HeartIcon,
  TagIcon,
  XIcon,
} from "lucide-react";
import React from "react";
import {
  TabsBarConfig,
  PaneName,
  DraggableTitle,
  StretchBarConfig,
} from "react-tile-pane";
import { FileBrowserNavigationAndInputSection } from "./components/FileBrowserNavigationAndInputSection";
import { DirectoryId } from "./directory";
import { clsx } from "@/lib/functions/clsx";
import { FileBrowserOptionsSection } from "./components/FileBrowserOptionsSection";

function createStyles<T extends Record<string, React.CSSProperties>>(
  styles: T,
): T {
  return styles;
}

export const thickness = 32;

export const color = {
  backL: "#1C242D",
  back: "#181E26",
  backD: "#12171D",
  secondary: "#567091",
  secondaryL: "#29394e",
  secondaryLL: "rgba(41,57,78,0.3)",
  primary: "#60cbff",
};

export const size = createStyles({
  full: {
    height: "100%",
    width: "100%",
  },
});

export const flex = createStyles({
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  around: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
  },
  between: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  columnBetween: {
    flexDirection: "column",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export const styles = createStyles({
  container: {
    color: "#fff",
    height: "100%",
    width: "100%",
  },
  tabBar: {
    background: color.backL,
    ...size.full,
    ...flex.between,
  },
  tabTitleOn: {
    background: color.secondaryL,
  },
  pane: {
    background: color.back,
    ...size.full,
    ...flex.center,
  },
  closeButton: {
    height: thickness * 1.5,
    width: thickness,
    color: color.secondary,
    fontSize: 35,
    cursor: "pointer",
    ...flex.center,
  },
});

function getIcon(name: string) {
  if (name === "favorites") return HeartIcon;
  if (name === "recents") return ClockIcon;
  if (name === "tags") return TagIcon;
  if (name === "options") return CogIcon;
  if (name === "preview") return EyeIcon;
  return FileQuestionIcon;
}

function SimpleHeader({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold flex-shrink-0">{children}</h4>;
}

function getTabBarComponent(name: string) {
  if (!name) return;
  if (name === "favorites") return <SimpleHeader>Favorites</SimpleHeader>;
  if (name === "recents") return <SimpleHeader>Recents</SimpleHeader>;
  if (name === "tags") return <SimpleHeader>Tags</SimpleHeader>;
  if (name === "options")
    return (
      <div className="py-1">
        <FileBrowserOptionsSection />
      </div>
    );
  if (name === "preview") return <SimpleHeader>Preview</SimpleHeader>;
  if (name.startsWith("dir-")) {
    const directoryId = name.replace("dir-", "") as DirectoryId;
    return <FileBrowserNavigationAndInputSection directoryId={directoryId} />;
  }

  return "todo";
}

export const tabBarConfig: () => TabsBarConfig = () => ({
  render({ tabs, onTab, action }) {
    // return undefined;
    return (
      <div className="flex justify-between items-center group relative bg-base-100 z-100">
        <div className="flex items-center w-full">
          {tabs.map(tabBar)}
          {getTabBarComponent(tabs[onTab] as string)}
        </div>
        <Button
          className="btn btn-xs btn-ghost btn-info hidden group-hover:block absolute right-0"
          onClick={() => action.closeTab(onTab)}
          icon={XIcon}
        ></Button>
      </div>
    );
    function tabBar(tab: PaneName, i: number, tabs: PaneName[]) {
      const Icon = getIcon(tab as string);
      const isActive = tabs.length > 1 && i === onTab;
      return (
        <DraggableTitle
          className={clsx(
            "h-[32px] aspect-square cursor-move select-none flex justify-center",
            isActive && "bg-base-300",
          )}
          name={tab}
          key={tab}
          onClick={() => action.switchTab(i)}
        >
          <div className="flex justify-center items-center px-1">
            <Icon className="size-4" />
          </div>
        </DraggableTitle>
      );
    }
  },
  thickness,
  position: "top",
  preBox: {
    isRow: false,
    isReverse: false,
  },
});

export const stretchBar: StretchBarConfig = {
  className: "left-stretch-bar",
  style: (isRow) => ({ cursor: isRow ? "ew-resize" : "ns-resize" }),
  position: "previous",
};

export const theme = () => ({
  tabBar: tabBarConfig(),
  stretchBar,
});
