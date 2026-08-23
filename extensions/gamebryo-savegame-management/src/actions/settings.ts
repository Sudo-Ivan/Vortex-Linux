import { createAction } from "redux-act";

export const enableMonitor = createAction("ENABLE_SAVEGAME_MONITOR", (enabled) => enabled);

export const setAutoSnapshot = createAction(
  "SET_SAVEGAME_AUTO_SNAPSHOT",
  (enabled: boolean) => enabled,
);

export const setMaxSnapshots = createAction("SET_SAVEGAME_MAX_SNAPSHOTS", (count: number) => count);
