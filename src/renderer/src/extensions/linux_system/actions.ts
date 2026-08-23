import safeCreateAction from "../../actions/safeCreateAction";

export const setGogScanRoots = safeCreateAction(
  "SET_LINUX_GOG_SCAN_ROOTS",
  (roots: string[]) => roots,
);

export const addGogScanRoot = safeCreateAction("ADD_LINUX_GOG_SCAN_ROOT", (root: string) => root);

export const removeGogScanRoot = safeCreateAction(
  "REMOVE_LINUX_GOG_SCAN_ROOT",
  (root: string) => root,
);
