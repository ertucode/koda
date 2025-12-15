import React from "react";
import {
  TabsBarConfig,
  PaneName,
  DraggableTitle,
  StretchBarConfig,
} from "react-tile-pane";

function createStyles<T extends Record<string, React.CSSProperties>>(
  styles: T,
): T {
  return styles;
}

export const thickness = 30;

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
    ...flex.columnBetween,
  },
  tabTitle: {
    height: thickness * 0.8,
    width: thickness,
    ...flex.between,
    background: color.secondaryLL,
    marginBottom: 6,
    cursor: "move",
    userSelect: "none",
  },
  tabTitleOn: {
    height: thickness * 0.8,
    width: thickness,
    ...flex.between,
    background: color.secondaryL,
    marginBottom: 6,
    cursor: "move",
    userSelect: "none",
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

export const tabBarConfig: () => TabsBarConfig = () => ({
  render({ tabs, onTab, action }) {
    // return undefined;
    return (
      <div style={styles.tabBar}>
        <div>{tabs.map(tabBar)}</div>
        <div onClick={() => action.closeTab(onTab)} style={styles.closeButton}>
          ×
        </div>
      </div>
    );
    function tabBar(tab: PaneName, i: number) {
      return (
        <DraggableTitle
          style={i === onTab ? styles.tabTitleOn : styles.tabTitle}
          name={tab}
          key={tab}
          onClick={() => action.switchTab(i)}
        >
          <div
            style={{
              background: i === onTab ? color.primary : color.secondaryL,
              height: "100%",
              width: 6,
            }}
          />
          <div style={{ ...flex.center, ...size.full }}>👆</div>
        </DraggableTitle>
      );
    }
  },
  thickness,
  position: "left",
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
