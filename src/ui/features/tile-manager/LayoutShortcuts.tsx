import React from "react";
import { Trash2Icon, SaveIcon } from "lucide-react";
import "./FlexLayoutManager.css";
import { useShortcuts } from "@/lib/hooks/useShortcuts";
import { clearLayout, saveLayout } from "../file-browser/initializeDirectory";
import { toast } from "@/lib/components/toast";

export const LayoutShortcuts: React.FC = () => {
  useShortcuts([
    {
      key: { key: "y", ctrlKey: true },
      notKey: { key: "y", ctrlKey: true, metaKey: true },
      handler: () => {
        saveLayout();
        toast.show({
          severity: "success",
          message: "Layout saved",
          customIcon: SaveIcon,
        });
      },
      label: "Save layout",
    },
    {
      key: { key: "y", ctrlKey: true, metaKey: true },
      handler: () => {
        clearLayout();
        toast.show({
          severity: "success",
          message: "Layout cleared",
          customIcon: Trash2Icon,
        });
      },
      label: "Clear layout",
    },
  ]);

  return undefined;
};
