import type { IReducerSpec } from "../../../types/IExtensionContext";
import { setSafe } from "../../../util/storeHelper";
import { setAssociatedWithNXMURLs } from "../actions/settings";
import { setNexusForkSettings } from "../actions/forkSettings";
import { DEFAULT_NEXUS_FORK_SETTINGS } from "../nexusFork";

/**
 * reducer for changes to the authentication
 */
export const settingsReducer: IReducerSpec = {
  reducers: {
    [setAssociatedWithNXMURLs as any]: (state, payload) =>
      setSafe(state, ["associateNXM"], payload),
    [setNexusForkSettings as any]: (state, payload) =>
      setSafe(state, ["fork"], { ...(state.fork ?? DEFAULT_NEXUS_FORK_SETTINGS), ...payload }),
  },
  defaults: {
    associateNXM: undefined,
    fork: DEFAULT_NEXUS_FORK_SETTINGS,
  },
};
