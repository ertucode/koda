import {
  HeartIcon,
  ClockIcon,
  TagIcon,
  EyeIcon,
  FoldersIcon,
} from "lucide-react";

export namespace LayoutUtils {
  export function getIconForComponent(component: string | undefined) {
    if (component === "favorites") return HeartIcon;
    else if (component === "recents") return ClockIcon;
    else if (component === "tags") return TagIcon;
    else if (component === "preview") return EyeIcon;
    return FoldersIcon;
  }
}
