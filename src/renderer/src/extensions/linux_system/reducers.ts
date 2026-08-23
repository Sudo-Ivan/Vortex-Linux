import update from "immutability-helper";

import type { IReducerSpec } from "../../types/IExtensionContext";
import { addGogScanRoot, removeGogScanRoot, setGogScanRoots } from "./actions";

const settingsReducer: IReducerSpec = {
  reducers: {
    [setGogScanRoots as any]: (state, payload: string[]) =>
      update(state, { gogScanRoots: { $set: payload } }),
    [addGogScanRoot as any]: (state, payload: string) => {
      const roots = state.gogScanRoots ?? [];
      if (roots.includes(payload)) {
        return state;
      }
      return update(state, { gogScanRoots: { $push: [payload] } });
    },
    [removeGogScanRoot as any]: (state, payload: string) => {
      const roots = state.gogScanRoots ?? [];
      const index = roots.indexOf(payload);
      if (index < 0) {
        return state;
      }
      return update(state, { gogScanRoots: { $splice: [[index, 1]] } });
    },
  },
  defaults: {
    gogScanRoots: [],
  },
};

export default settingsReducer;
