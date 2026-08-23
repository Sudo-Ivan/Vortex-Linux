import { types, util } from "@nexusmods/vortex-api";

import * as actions from "../actions/settings";

/**
 * reducer for changes to ephemeral session state
 */
export const settingsReducer: types.IReducerSpec = {
  reducers: {
    [actions.enableMonitor as any]: (state, payload) => {
      return util.setSafe(state, ["monitorEnabled"], payload);
    },
    [actions.setAutoSnapshot as any]: (state, payload) => {
      return util.setSafe(state, ["autoSnapshotOnProfileSwitch"], payload);
    },
    [actions.setMaxSnapshots as any]: (state, payload) => {
      return util.setSafe(state, ["maxSnapshots"], payload);
    },
  },
  defaults: {
    monitorEnabled: true,
    autoSnapshotOnProfileSwitch: true,
    maxSnapshots: 10,
  },
};
