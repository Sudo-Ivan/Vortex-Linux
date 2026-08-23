import { createAction } from "redux-act";

import type { INexusForkSettings } from "../nexusFork";

export const setNexusForkSettings = createAction(
  "SET_NEXUS_FORK_SETTINGS",
  (settings: Partial<INexusForkSettings>) => settings,
);
