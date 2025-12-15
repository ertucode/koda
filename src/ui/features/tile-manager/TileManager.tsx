import React from "react";
import {
  createTilePanes,
  TileBranchSubstance,
  TileContainer,
  TileProvider,
} from "react-tile-pane";
import { FileBrowser } from "../file-browser/FileBrowser";
import "./TileManager.css";

const paneStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  overflow: "auto",
};

// Create tile panes
const [paneList, names] = createTilePanes({
  fileBrowser: (
    <div style={paneStyle}>
      <FileBrowser />
    </div>
  ),
  placeholder1: <div style={paneStyle}>Placeholder Pane 1</div>,
  placeholder2: <div style={paneStyle}>Placeholder Pane 2</div>,
  placeholder3: <div style={paneStyle}>Placeholder Pane 3</div>,
});

// Define the initial layout
const rootPane: TileBranchSubstance = {
  children: [
    { children: names.fileBrowser },
  ],
};

// Store layout in localStorage
const LOCAL_STORAGE_KEY = "mygui-tile-layout";

function AutoSaveLayout() {
  // This component will be enhanced later to auto-save layout changes
  return null;
}

export const TileManager: React.FC = () => {
  const localRoot = localStorage.getItem(LOCAL_STORAGE_KEY);
  const root = localRoot
    ? (JSON.parse(localRoot) as TileBranchSubstance)
    : rootPane;

  return (
    <TileProvider tilePanes={paneList} rootNode={root}>
      <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <TileContainer />
        </div>
      </div>
      <AutoSaveLayout />
    </TileProvider>
  );
};
